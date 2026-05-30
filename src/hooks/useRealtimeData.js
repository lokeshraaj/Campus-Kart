// ============================================
// CampusKart - Real-Time Firestore Hooks
// ============================================
// Custom React hooks that wrap `onSnapshot` listeners
// for live data feeds. Every hook returns clean state
// and automatically unsubscribes on unmount to prevent
// memory leaks.
//
// COMPOSITE INDEXES REQUIRED (create in Firebase Console):
// ┌─────────────────────────────────────────────────────┐
// │ Collection  │ Fields                                │
// ├─────────────┼───────────────────────────────────────┤
// │ products    │ status ASC, createdAt ASC             │
// │ products    │ status ASC, price ASC                 │
// │ products    │ userId ASC, status ASC                │
// └─────────────────────────────────────────────────────┘
// Firestore will also print the exact index creation URL
// in the browser console if a query hits a missing index.
// ============================================

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateSavesCount } from '@/lib/productService';

// ─────────────────────────────────────────────
// HELPER: detect offline / network errors
// ─────────────────────────────────────────────

/**
 * Check if a Firestore error indicates the client is offline.
 */
function isOfflineError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    msg.includes('offline') ||
    msg.includes('client is offline') ||
    msg.includes('failed to get document') ||
    msg.includes('network') ||
    code === 'unavailable' ||
    code === 'failed-precondition'
  );
}

/**
 * Return a user-friendly error string for a Firestore error.
 */
function getUserMessage(error) {
  if (isOfflineError(error)) {
    return 'You appear to be offline. Reconnecting…';
  }
  if (error.code === 'permission-denied') {
    return 'You don\'t have permission to access this data.';
  }
  return null; // no special message
}

function needsIndex(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return error.code === 'failed-precondition' && msg.includes('index');
}

function isFirestoreInternalError(error) {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('internal assertion failed') || msg.includes('unexpected state');
}

// ────────────────────────────────────────────
// Missing-index cache — persisted to sessionStorage so that the probe
// only runs ONCE per browser session. After the first page load the
// cache is populated and subsequent loads go straight to the fallback
// listener, completely avoiding the ca9 race-condition crash.
// ────────────────────────────────────────────
const STORAGE_KEY = 'ck_missing_indexes';
function loadMissingKeys() {
  try {
    const raw = sessionStorage?.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (_) {
    return new Set();
  }
}
function saveMissingKey(key) {
  missingIndexQueryKeys.add(key);
  try {
    sessionStorage?.setItem(STORAGE_KEY, JSON.stringify([...missingIndexQueryKeys]));
  } catch (_) {}
}
const missingIndexQueryKeys = loadMissingKeys();

function warnMissingIndexOnce(key, label) {
  if (missingIndexQueryKeys.has(key)) return;
  saveMissingKey(key);
  console.warn(`[RT] ${label} is missing a Firestore index. Using client-side sorted fallback for this session.`);
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const aMs = a?.createdAt?.toMillis?.() ?? 0;
    const bMs = b?.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
}

function sortByPriceAsc(items) {
  return [...items].sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
}

function safeUnsubscribe(unsub) {
  if (typeof unsub !== 'function') return;
  try {
    unsub();
  } catch (error) {
    console.warn('[RT] unsubscribe skipped:', error?.message || error);
  }
}

// ─────────────────────────────────────────────
// 1. LOW-LEVEL SUBSCRIBE FUNCTIONS
//    (callback-based, return unsubscribe fn)
// ─────────────────────────────────────────────

/**
 * Subscribe to recently added active products.
 *
 * Uses a probe-first pattern: a one-shot getDocs() tests whether the
 * composite index exists BEFORE creating any watch-stream listener.
 * This prevents the Firestore SDK ca9 crash that occurs when we tear
 * down an onSnapshot listener from inside its own error callback.
 *
 * @param {number}   limitCount – Max items to stream
 * @param {function} callback   – Receives `(products[], error?)`
 * @returns {function} unsubscribe
 */
export function subscribeToRecentlyAdded(limitCount, callback) {
  const queryKey = 'products:active:createdAtDesc';

  const fallbackQ = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    limit(limitCount * 3)
  );

  const subscribeToFallback = () =>
    onSnapshot(
      fallbackQ,
      (snapshot) => {
        const products = sortByCreatedAtDesc(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        ).slice(0, limitCount);
        callback(products, null);
      },
      (err) => callback([], err)
    );

  // Already know the index is missing — go straight to fallback, no probe needed.
  if (missingIndexQueryKeys.has(queryKey)) {
    return subscribeToFallback();
  }

  // Probe: one-shot getDocs on the ordered query.
  // If it fails with a missing index we mark it and use the fallback onSnapshot.
  // We NEVER call onSnapshot on the primary — this is the key to avoiding ca9.
  let fallbackUnsub = null;
  let cancelled = false;

  const primaryQ = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'asc'),
    limit(limitCount)
  );

  getDocs(primaryQ)
    .then(() => {
      // Index exists — subscribe using the ordered primary query.
      if (cancelled) return;
      fallbackUnsub = onSnapshot(
        primaryQ,
        (snapshot) => {
          const products = sortByCreatedAtDesc(
            snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          ).slice(0, limitCount);
          callback(products, null);
        },
        (err) => {
          console.error('[RT] subscribeToRecentlyAdded primary error:', err.message);
          callback([], err);
        }
      );
    })
    .catch((err) => {
      if (cancelled) return;
      if (needsIndex(err)) {
        warnMissingIndexOnce(queryKey, 'subscribeToRecentlyAdded');
      } else {
        console.error('[RT] subscribeToRecentlyAdded probe error:', err.message);
      }
      // Use fallback regardless of error type.
      fallbackUnsub = subscribeToFallback();
    });

  return () => {
    cancelled = true;
    safeUnsubscribe(fallbackUnsub);
  };
}

/**
 * Subscribe to the cheapest active products (best deals).
 *
 * Uses a probe-first pattern to avoid the Firestore ca9 crash.
 * See subscribeToRecentlyAdded for a full explanation.
 *
 * @param {number}   limitCount - Max items to stream
 * @param {function} callback   - Receives `(products[], error?)`
 * @returns {function} unsubscribe
 */
export function subscribeToBestDeals(limitCount, callback) {
  const queryKey = 'products:active:priceAsc';

  const fallbackQ = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    limit(limitCount * 3)
  );

  const subscribeToFallback = () =>
    onSnapshot(
      fallbackQ,
      (snapshot) => {
        const products = sortByPriceAsc(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        ).slice(0, limitCount);
        callback(products, null);
      },
      (err) => callback([], err)
    );

  if (missingIndexQueryKeys.has(queryKey)) {
    return subscribeToFallback();
  }

  let fallbackUnsub = null;
  let cancelled = false;

  const primaryQ = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    orderBy('price', 'asc'),
    limit(limitCount)
  );

  getDocs(primaryQ)
    .then(() => {
      if (cancelled) return;
      fallbackUnsub = onSnapshot(
        primaryQ,
        (snapshot) => {
          const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback(products, null);
        },
        (err) => {
          console.error('[RT] subscribeToBestDeals primary error:', err.message);
          callback([], err);
        }
      );
    })
    .catch((err) => {
      if (cancelled) return;
      if (needsIndex(err)) {
        warnMissingIndexOnce(queryKey, 'subscribeToBestDeals');
      } else {
        console.error('[RT] subscribeToBestDeals probe error:', err.message);
      }
      fallbackUnsub = subscribeToFallback();
    });

  return () => {
    cancelled = true;
    safeUnsubscribe(fallbackUnsub);
  };
}

/**
 * Subscribe to a user's active listings.
 *
 * @param {string}   userId   – Firebase Auth UID
 * @param {function} callback – Receives `(products[], error?)`
 * @returns {function} unsubscribe
 */
export function subscribeToMyListings(userId, callback) {
  try {
    const queryKey = `products:user:${userId}:active:createdAtAsc`;
    const primaryQ = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc')
    );

    const fallbackQ = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const subscribeToFallback = () => onSnapshot(
      fallbackQ,
      (snapshot) => {
        const products = sortByCreatedAtDesc(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        callback(products, null);
      },
      (fallbackError) => callback([], fallbackError)
    );

    if (missingIndexQueryKeys.has(queryKey)) {
      return subscribeToFallback();
    }

    let fallbackUnsubscribe = null;
    let primaryFailedWithMissingIndex = false;
    const unsubscribe = onSnapshot(
      primaryQ,
      (snapshot) => {
        const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(products, null);
      },
      (error) => {
        if (!needsIndex(error)) {
          console.error('[RT] subscribeToMyListings error:', error.message);
          callback([], error);
          return;
        }
        primaryFailedWithMissingIndex = true;
        warnMissingIndexOnce(queryKey, 'subscribeToMyListings');
        if (!fallbackUnsubscribe) fallbackUnsubscribe = subscribeToFallback();
      }
    );
    return () => {
      if (!primaryFailedWithMissingIndex) safeUnsubscribe(unsubscribe);
      safeUnsubscribe(fallbackUnsubscribe);
    };
  } catch (error) {
    console.error('[RT] subscribeToMyListings setup failed:', error.message);
    callback([], error);
    return () => {};
  }
}

/**
 * Subscribe to a user's sold items.
 *
 * @param {string}   userId   – Firebase Auth UID
 * @param {function} callback – Receives `(products[], error?)`
 * @returns {function} unsubscribe
 */
export function subscribeToSoldItems(userId, callback) {
  try {
    const queryKey = `products:user:${userId}:sold:createdAtDesc`;
    const primaryQ = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      where('status', '==', 'sold'),
      orderBy('createdAt', 'desc')
    );

    const fallbackQ = query(
      collection(db, 'products'),
      where('userId', '==', userId),
      where('status', '==', 'sold')
    );

    const subscribeToFallback = () => onSnapshot(
      fallbackQ,
      (snapshot) => {
        const products = sortByCreatedAtDesc(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        callback(products, null);
      },
      (fallbackError) => callback([], fallbackError)
    );

    if (missingIndexQueryKeys.has(queryKey)) {
      return subscribeToFallback();
    }

    let fallbackUnsubscribe = null;
    let primaryFailedWithMissingIndex = false;
    const unsubscribe = onSnapshot(
      primaryQ,
      (snapshot) => {
        const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(products, null);
      },
      (error) => {
        if (!needsIndex(error)) {
          console.error('[RT] subscribeToSoldItems error:', error.message);
          callback([], error);
          return;
        }
        primaryFailedWithMissingIndex = true;
        warnMissingIndexOnce(queryKey, 'subscribeToSoldItems');
        if (!fallbackUnsubscribe) fallbackUnsubscribe = subscribeToFallback();
      }
    );
    return () => {
      if (!primaryFailedWithMissingIndex) safeUnsubscribe(unsubscribe);
      safeUnsubscribe(fallbackUnsubscribe);
    };
  } catch (error) {
    console.error('[RT] subscribeToSoldItems setup failed:', error.message);
    callback([], error);
    return () => {};
  }
}

/**
 * Subscribe to a user's saved items subcollection and resolve
 * each reference to a full product document.
 *
 * @param {string}   userId   – Firebase Auth UID
 * @param {function} callback – Receives `(products[], error?)`
 * @returns {function} unsubscribe
 */
export function subscribeToSavedItems(userId, callback) {
  try {
    const savedRef = collection(db, 'users', userId, 'savedItems');

    return onSnapshot(
      savedRef,
      async (snapshot) => {
        try {
          // Each doc in savedItems has the same ID as the product
          const productPromises = snapshot.docs.map(async (savedDoc) => {
            const productSnap = await getDoc(doc(db, 'products', savedDoc.id));
            if (productSnap.exists()) {
              return {
                id: productSnap.id,
                ...productSnap.data(),
                savedAt: savedDoc.data().savedAt,
              };
            }
            return null; // product has been deleted
          });

          const products = (await Promise.all(productPromises)).filter(Boolean);
          callback(products, null);
        } catch (err) {
          console.error('[RT] subscribeToSavedItems resolve error:', err.message);
          callback([], err);
        }
      },
      (error) => {
        console.error('[RT] subscribeToSavedItems error:', error.message);
        callback([], error);
      }
    );
  } catch (error) {
    console.error('[RT] subscribeToSavedItems setup failed:', error.message);
    callback([], error);
    return () => {};
  }
}

// ─────────────────────────────────────────────
// 2. TOGGLE SAVE / UNSAVE
// ─────────────────────────────────────────────

/**
 * Add or remove a product from the user's saved items.
 * Also increments/decrements `savesCount` on the product doc.
 *
 * @param {string} userId    – Firebase Auth UID
 * @param {Object} product   – Must include at least `id` and `title`
 * @returns {Promise<boolean>} true if saved, false if unsaved
 */
export async function toggleSaveProduct(userId, product) {
  try {
    const productId = String(product.id);
    // Guard: Firestore doc IDs must be non-empty strings
    if (!productId || !userId) {
      throw new Error('Invalid userId or productId');
    }

    const savedDocRef = doc(db, 'users', userId, 'savedItems', productId);
    const savedSnap = await getDoc(savedDocRef);

    if (savedSnap.exists()) {
      // Unsave
      await deleteDoc(savedDocRef);
      await updateSavesCount(productId, -1);
      console.log('[RT] Product unsaved:', productId);
      return false;
    } else {
      // Save
      await setDoc(savedDocRef, {
        productId: productId,
        title: product.title,
        imageUrl: product.imageUrl || '',
        price: product.price,
        savedAt: serverTimestamp(),
      });
      await updateSavesCount(productId, +1);
      console.log('[RT] Product saved:', productId);
      return true;
    }
  } catch (error) {
    console.error('[RT] toggleSaveProduct failed:', error.message);
    throw error;
  }
}

let isOfflineThrottled = false;

/**
 * Check if a product is in the user's saved items.
 *
 * @param {string} userId    – Firebase Auth UID
 * @param {string} productId – Firestore product document ID
 * @returns {Promise<boolean>}
 */
export async function isProductSaved(userId, productId) {
  try {
    if (isOfflineThrottled) return false;
    
    const pid = String(productId);
    if (!pid || !userId) return false;

    const savedDocRef = doc(db, 'users', userId, 'savedItems', pid);
    const snap = await getDoc(savedDocRef);
    return snap.exists();
  } catch (error) {
    if (isOfflineError(error)) {
      if (!isOfflineThrottled) {
        console.error('[RT] isProductSaved offline mode activated to prevent spam.');
        isOfflineThrottled = true;
        setTimeout(() => { isOfflineThrottled = false; }, 30000); // Reset after 30s
      }
    } else if (!isFirestoreInternalError(error)) {
      console.error('[RT] isProductSaved failed:', error.message);
    }
    return false;
  }
}

// ─────────────────────────────────────────────
// 3. REACT CUSTOM HOOKS
//    (wrap subscribe functions with useState/useEffect)
// ─────────────────────────────────────────────

/**
 * Hook: live stream of recently added active products.
 *
 * Supports stale-while-revalidate via the `initialData` option:
 * when the caller supplies cached data the hook renders it immediately
 * (loading=false) and silently replaces it once Firestore responds.
 *
 * @param {number} [count=10] – Max items
 * @param {{ onError?: function, initialData?: Array }} [options]
 * @returns {{ products: Array, loading: boolean, error: Error|null }}
 */
export function useRecentlyAdded(count = 10, options = {}) {
  const hasInitial = Array.isArray(options.initialData) && options.initialData.length > 0;
  const [products, setProducts] = useState(hasInitial ? options.initialData : []);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState(null);
  const shownRef = useRef(false);

  useEffect(() => {
    shownRef.current = false;
    // Only show loading spinner when we have no cached data to show
    if (!hasInitial) setLoading(true);
    const unsubscribe = subscribeToRecentlyAdded(count, (data, err) => {
      setProducts(data);
      setError(err || null);
      setLoading(false);

      // Fire user-facing callback for offline errors (once per mount)
      if (err && !shownRef.current) {
        shownRef.current = true;
        const msg = getUserMessage(err);
        if (msg && options.onError) options.onError(msg, err);
      }
    });

    return () => safeUnsubscribe(unsubscribe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return { products, loading, error };
}

/**
 * Hook: live stream of cheapest active products (best deals).
 *
 * Supports stale-while-revalidate via the `initialData` option:
 * when the caller supplies cached data the hook renders it immediately
 * (loading=false) and silently replaces it once Firestore responds.
 *
 * @param {number} [count=6] – Max items
 * @param {{ onError?: function, initialData?: Array }} [options]
 * @returns {{ deals: Array, loading: boolean, error: Error|null }}
 */
export function useBestDeals(count = 6, options = {}) {
  const hasInitial = Array.isArray(options.initialData) && options.initialData.length > 0;
  const [deals, setDeals] = useState(hasInitial ? options.initialData : []);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState(null);
  const shownRef = useRef(false);

  useEffect(() => {
    shownRef.current = false;
    // Only show loading spinner when we have no cached data to show
    if (!hasInitial) setLoading(true);
    const unsubscribe = subscribeToBestDeals(count, (data, err) => {
      setDeals(data);
      setError(err || null);
      setLoading(false);

      if (err && !shownRef.current) {
        shownRef.current = true;
        const msg = getUserMessage(err);
        if (msg && options.onError) options.onError(msg, err);
      }
    });

    return () => safeUnsubscribe(unsubscribe);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return { deals, loading, error };
}

/**
 * Hook: live stream of a user's active listings.
 *
 * @param {string|null} userId – Firebase Auth UID (null-safe)
 * @param {{ onError?: function }} [options]
 * @returns {{ listings: Array, loading: boolean, error: Error|null }}
 */
export function useMyListings(userId, options = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }

    shownRef.current = false;
    setLoading(true);
    const unsubscribe = subscribeToMyListings(userId, (data, err) => {
      setListings(data);
      setError(err || null);
      setLoading(false);

      if (err && !shownRef.current) {
        shownRef.current = true;
        const msg = getUserMessage(err);
        if (msg && options.onError) options.onError(msg, err);
      }
    });

    return () => safeUnsubscribe(unsubscribe);
  }, [userId]);

  return { listings, loading, error };
}

/**
 * Hook: live stream of a user's sold items.
 *
 * @param {string|null} userId – Firebase Auth UID (null-safe)
 * @param {{ onError?: function }} [options]
 * @returns {{ soldItems: Array, loading: boolean, error: Error|null }}
 */
export function useSoldItems(userId, options = {}) {
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setSoldItems([]);
      setLoading(false);
      return;
    }

    shownRef.current = false;
    setLoading(true);
    const unsubscribe = subscribeToSoldItems(userId, (data, err) => {
      setSoldItems(data);
      setError(err || null);
      setLoading(false);

      if (err && !shownRef.current) {
        shownRef.current = true;
        const msg = getUserMessage(err);
        if (msg && options.onError) options.onError(msg, err);
      }
    });

    return () => safeUnsubscribe(unsubscribe);
  }, [userId]);

  return { soldItems, loading, error };
}

/**
 * Hook: live stream of a user's saved/wishlisted items.
 *
 * @param {string|null} userId – Firebase Auth UID (null-safe)
 * @param {{ onError?: function }} [options]
 * @returns {{ savedItems: Array, loading: boolean, error: Error|null }}
 */
export function useSavedItems(userId, options = {}) {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setSavedItems([]);
      setLoading(false);
      return;
    }

    shownRef.current = false;
    setLoading(true);
    const unsubscribe = subscribeToSavedItems(userId, (data, err) => {
      setSavedItems(data);
      setError(err || null);
      setLoading(false);

      if (err && !shownRef.current) {
        shownRef.current = true;
        const msg = getUserMessage(err);
        if (msg && options.onError) options.onError(msg, err);
      }
    });

    return () => safeUnsubscribe(unsubscribe);
  }, [userId]);

  return { savedItems, loading, error };
}

/**
 * Hook: track whether a specific product is saved by the current user,
 * and provide a toggle function.
 *
 * @param {string|null} userId  – Firebase Auth UID
 * @param {Object}      product – Product object with at least `id`
 * @returns {{ isSaved: boolean, toggling: boolean, toggle: function }}
 */
export function useSaveToggle(userId, product) {
  const [isSaved, setIsSaved] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Coerce product ID to string for Firestore compatibility
  const productId = product?.id != null ? String(product.id) : null;

  // Check initial state
  useEffect(() => {
    if (!userId || !productId) return;

    isProductSaved(userId, productId).then(setIsSaved);
  }, [userId, productId]);

  const toggle = useCallback(async () => {
    if (!userId || !productId || toggling) return;
    setToggling(true);
    try {
      const nowSaved = await toggleSaveProduct(userId, product);
      setIsSaved(nowSaved);
    } catch (err) {
      console.error('[Hook] toggle save failed:', err.message);
    } finally {
      setToggling(false);
    }
  }, [userId, product, productId, toggling]);

  return { isSaved, toggling, toggle };
}
