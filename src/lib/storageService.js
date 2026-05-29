// ============================================
// CampusKart - Storage Service (Firebase Storage)
// ============================================
// Handles image uploads for product listings AND
// chat message attachments.
//
// Compression is applied to all uploads:
//   - Product images  → products/
//   - Chat images     → chats/{chatId}/
//
// Falls back to Cloudinary if Firebase Storage
// is unavailable or rejects the upload.
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

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Cloudinary upload failed.');
  }

  return data.secure_url;
}

/**
 * Compress an image file and upload it to a given Firebase Storage path.
 * Falls back to Cloudinary if Firebase Storage fails.
 *
 * @param {File}   file        – The raw image File from an <input type="file">
 * @param {string} folderPath  – Destination folder in Firebase Storage (e.g. "products" or "chats/abc123")
 * @param {object} [compressionOptions] – Optional overrides for browser-image-compression
 * @returns {Promise<string>}  Public download URL of the uploaded image
 */
async function uploadCompressedImage(file, folderPath, compressionOptions = {}) {
  console.log(`[Storage] Original file size: ${(file.size / 1024).toFixed(2)} KB`);

  // ── Compression ──────────────────────────────────────────
  let compressedFile = file;
  try {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1080,
      useWebWorker: true,
      fileType: 'image/webp',
      onProgress: (p) => console.log(`[Storage] Compression: ${p}%`),
      ...compressionOptions,
    };
    compressedFile = await imageCompression(file, options);
    console.log(
      `[Storage] Compressed: ${(compressedFile.size / 1024).toFixed(2)} KB ` +
      `(${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction)`
    );
  } catch (compressionError) {
    console.warn('[Storage] Compression failed, falling back to original:', compressionError.message);
    compressedFile = file;
  }

  // ── Upload ────────────────────────────────────────────────
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').split('.')[0];
  const fileExtension = compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${folderPath}/${timestamp}_${safeName}.${fileExtension}`;

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: compressedFile.type || file.type || 'image/jpeg',
    });
    console.log('[Storage] Upload complete:', snapshot.metadata.fullPath);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log('[Storage] Download URL:', downloadUrl);
    return downloadUrl;
  } catch (firebaseError) {
    console.warn(
      '[Storage] Firebase upload failed, trying Cloudinary fallback:',
      firebaseError?.message || firebaseError
    );
    return await uploadToCloudinary(compressedFile);
  }
}

/**
 * Attach a user-friendly message to a storage error before rethrowing.
 */
function annotateStorageError(error) {
  const code = error.code || '';
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/server-file-wrong-size') {
    error.userMessage = 'Image upload failed. Please check your connection and try again.';
  } else if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    error.userMessage = 'Image upload failed. Please ensure you are logged in.';
  } else if (code === 'storage/canceled') {
    error.userMessage = 'Image upload was cancelled.';
  } else if (
    error.message?.toLowerCase().includes('offline') ||
    error.message?.toLowerCase().includes('network')
  ) {
    error.userMessage = 'Image upload failed. Please check your internet connection.';
  } else if (error.message === 'Cloudinary upload is not configured.') {
    error.userMessage =
      'Image upload failed. Deploy Firebase Storage rules or configure Cloudinary upload variables.';
  } else {
    error.userMessage = error.message || 'Image upload failed. Please try again.';
  }
  return error;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Upload a product listing image to Firebase Storage.
 * Stored under `products/`.
 *
 * @param {File} file – The image file from an <input type="file">
 * @returns {Promise<string>} Public download URL
 */
export async function uploadProductImage(file) {
  try {
    return await uploadCompressedImage(file, 'products');
  } catch (error) {
    console.error('[Storage] uploadProductImage failed:', error.code, error.message);
    throw annotateStorageError(error);
  }
}

/**
 * Upload a chat message image attachment to Firebase Storage.
 * Stored under `chats/{chatId}/`.
 *
 * @param {File}   file   – The image file selected by the user
 * @param {string} chatId – The Firestore chat document ID
 * @returns {Promise<string>} Public download URL
 */
export async function uploadChatImage(file, chatId) {
  if (!chatId) throw new Error('chatId is required to upload a chat image.');
  try {
    // Chat images are kept at a slightly lower resolution to save bandwidth
    return await uploadCompressedImage(file, `chats/${chatId}`, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
    });
  } catch (error) {
    console.error('[Storage] uploadChatImage failed:', error.code, error.message);
    throw annotateStorageError(error);
  }
}

/**
 * Delete an image from Firebase Storage by its download URL.
 *
 * @param {string} imageUrl – The full download URL returned by an upload function
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
