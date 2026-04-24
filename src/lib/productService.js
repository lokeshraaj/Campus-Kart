// ============================================
// CampusKart - Product Service (Firestore)
// ============================================
// CRUD operations for the `products` collection.
// Every document stores the seller's UID so that
// security rules and UI can scope ownership.
// ============================================

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from './firebase';

/** Firestore collection reference */
const productsRef = collection(db, 'products');

/**
 * Add a new product listing.
 *
 * @param {Object}  productData
 * @param {string}  productData.title       – Product headline
 * @param {number}  productData.price       – Asking price in ₹
 * @param {string}  productData.description – Detailed description
 * @param {string}  productData.category    – One of: books, notes, gadgets, stationery, others
 * @param {string}  productData.condition   – "New" | "Used"
 * @param {string}  productData.imageUrl    – Download URL from Firebase Storage
 * @param {string} [productData.location]   – E.g. "Hostel Block C, Room 214"
 * @returns {Promise<string>} The Firestore document ID of the new product
 */
export async function addProduct(productData) {
  try {
    // Ensure user is authenticated before writing
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to add a product.');
    }

    const docPayload = {
      title: productData.title,
      price: Number(productData.price),
      description: productData.description,
      category: productData.category,
      condition: productData.condition || 'Used',
      imageUrl: productData.imageUrl || '',
      location: productData.location || '',
      userId: user.uid,
      sellerName: user.displayName || user.email,
      createdAt: serverTimestamp(),
      status: 'active',
      savesCount: 0,
    };

    const docRef = await addDoc(productsRef, docPayload);
    console.log('[DB] Product added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[DB] addProduct failed:', error.message);
    throw error;
  }
}

/**
 * Fetch all products, newest first.
 * Each returned object includes its Firestore `id`.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getProducts() {
  try {
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('[DB] Fetched', products.length, 'products');
    return products;
  } catch (error) {
    console.error('[DB] getProducts failed:', error.message);
    throw error;
  }
}

/**
 * Fetch a single product by its document ID.
 *
 * @param {string} productId – Firestore document ID
 * @returns {Promise<Object|null>}
 */
export async function getProductById(productId) {
  try {
    const docSnap = await getDoc(doc(db, 'products', productId));

    if (!docSnap.exists()) {
      console.warn('[DB] Product not found:', productId);
      return null;
    }

    console.log('[DB] Fetched product:', productId);
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('[DB] getProductById failed:', error.message);
    throw error;
  }
}

/**
 * Fetch all products posted by a specific user.
 *
 * @param {string} userId – Firebase Auth UID
 * @returns {Promise<Array<Object>>}
 */
export async function getProductsByUser(userId) {
  try {
    const q = query(productsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('[DB] Fetched', products.length, 'products for user:', userId);
    return products;
  } catch (error) {
    console.error('[DB] getProductsByUser failed:', error.message);
    throw error;
  }
}

/**
 * Update an existing product listing.
 * Only the product owner should call this (enforced by security rules).
 *
 * @param {string} productId   – Firestore document ID
 * @param {Object} updateData  – Fields to merge-update
 * @returns {Promise<void>}
 */
export async function updateProduct(productId, updateData) {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    console.log('[DB] Product updated:', productId);
  } catch (error) {
    console.error('[DB] updateProduct failed:', error.message);
    throw error;
  }
}

/**
 * Delete a product listing.
 * Only the product owner should call this (enforced by security rules).
 *
 * @param {string} productId – Firestore document ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    await deleteDoc(doc(db, 'products', productId));
    console.log('[DB] Product deleted:', productId);
  } catch (error) {
    console.error('[DB] deleteProduct failed:', error.message);
    throw error;
  }
}

/**
 * Mark a product as sold. Sets `status` to 'sold' so it
 * drops out of the active feed but remains in the seller's
 * "Sold Items" dashboard.
 *
 * @param {string} productId – Firestore document ID
 * @returns {Promise<void>}
 */
export async function markAsSold(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      status: 'sold',
      soldAt: serverTimestamp(),
    });
    console.log('[DB] Product marked as sold:', productId);
  } catch (error) {
    console.error('[DB] markAsSold failed:', error.message);
    throw error;
  }
}

/**
 * Increment or decrement the savesCount on a product.
 *
 * @param {string} productId – Firestore document ID
 * @param {number} delta     – +1 to save, -1 to unsave
 * @returns {Promise<void>}
 */
export async function updateSavesCount(productId, delta) {
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      savesCount: increment(delta),
    });
    console.log('[DB] savesCount updated:', productId, delta > 0 ? '+1' : '-1');
  } catch (error) {
    console.error('[DB] updateSavesCount failed:', error.message);
    throw error;
  }
}
