// ============================================
// CampusKart - Storage Service (Firebase Storage)
// ============================================
// Handles image uploads for product listings.
// Files are stored under `products/` with a unique
// timestamp-based filename to prevent collisions.
// ============================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { storage } from './firebase';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Cloudinary upload failed.');
  }

  return data.secure_url;
}

/**
 * Upload a product image to Firebase Storage with client-side compression.
 *
 * @param {File} file – The image file from an <input type="file"> element
 * @returns {Promise<string>} The public download URL of the uploaded image
 */
export async function uploadProductImage(file) {
  try {
    console.log(`[Storage] Original file size: ${(file.size / 1024).toFixed(2)} KB`);

    // ============================================
    // COMPRESSION PHASE
    // ============================================
    let compressedFile = file;
    try {
      const options = {
        maxSizeMB: 0.5, // Target: 500KB
        maxWidthOrHeight: 1080, // Max dimensions
        useWebWorker: true,
        fileType: 'image/webp', // Convert to WebP for max compression
        onProgress: (progress) => {
          console.log(`[Storage] Compression progress: ${progress}%`);
        },
      };

      compressedFile = await imageCompression(file, options);
      console.log(
        `[Storage] Compressed file size: ${(compressedFile.size / 1024).toFixed(2)} KB ` +
        `(${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction)`
      );
    } catch (compressionError) {
      console.error('[Storage] Compression failed:', compressionError.message);
      // Continue with original file if compression fails, but log the warning
      console.warn('[Storage] Falling back to original file.');
      compressedFile = file;
    }

    // ============================================
    // UPLOAD PHASE
    // ============================================
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').split('.')[0];
    // Use WebP extension if compression was successful
    const fileExtension = compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `products/${timestamp}_${safeName}.${fileExtension}`;

    try {
      const storageRef = ref(storage, storagePath);

      // Upload the compressed file bytes
      const snapshot = await uploadBytes(storageRef, compressedFile, {
        contentType: compressedFile.type || file.type || 'image/jpeg',
      });
      console.log('[Storage] Upload complete:', snapshot.metadata.fullPath);

      // Retrieve and return the public download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('[Storage] Download URL:', downloadUrl);

      return downloadUrl;
    } catch (firebaseError) {
      console.warn('[Storage] Firebase upload failed, trying Cloudinary fallback:', firebaseError?.message || firebaseError);
      return await uploadToCloudinary(compressedFile);
    }
  } catch (error) {
    console.error('[Storage] uploadProductImage failed:', error.code, error.message);

    // Attach user-friendly message based on Firebase error code
    const code = error.code || '';
    if (code === 'storage/retry-limit-exceeded' || code === 'storage/server-file-wrong-size') {
      error.userMessage = 'Image upload failed. Please check your connection and try again.';
    } else if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
      error.userMessage = 'Image upload failed. Please ensure you are logged in.';
    } else if (code === 'storage/canceled') {
      error.userMessage = 'Image upload was cancelled.';
    } else if (error.message?.toLowerCase().includes('offline') || error.message?.toLowerCase().includes('network')) {
      error.userMessage = 'Image upload failed. Please check your internet connection.';
    } else if (error.message === 'Cloudinary upload is not configured.') {
      error.userMessage = 'Image upload failed. Deploy Firebase Storage rules or configure Cloudinary upload variables.';
    } else {
      error.userMessage = error.message || 'Image upload failed. Please try again.';
    }

    throw error;
  }
}

/**
 * Delete an image from Firebase Storage by its download URL.
 * Useful when a product listing is removed.
 *
 * @param {string} imageUrl – The full download URL returned by `uploadProductImage`
 * @returns {Promise<void>}
 */
export async function deleteProductImage(imageUrl) {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('[Storage] Image deleted:', imageUrl);
  } catch (error) {
    console.error('[Storage] deleteProductImage failed:', error.message);
    throw error;
  }
}
