// ============================================
// CampusKart - Chat Service (Firestore)
// ============================================
// Real-time messaging CRUD using Firestore.
// Chat documents live in `chats` collection,
// messages live in `chats/{chatId}/messages`.
// User presence tracked via `users/{uid}`.
// ============================================

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

function needsIndex(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return error.code === 'failed-precondition' && msg.includes('index');
}

function safeUnsubscribe(unsub) {
  if (typeof unsub !== 'function') return;
  try {
    unsub();
  } catch (error) {
    console.warn('[Chat] unsubscribe skipped:', error?.message || error);
  }
}

// ─────────────────────────────────────────────
// 1. CHAT THREAD MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Find or create a chat thread between two users about a product.
 * Uses a deterministic chatId so both participants land on the same doc.
 *
 * @param {string} buyerId  – Firebase UID of the buyer
 * @param {string} sellerId – Firebase UID of the seller
 * @param {Object} product  – Product context { id, title, imageUrl, price }
 * @returns {Promise<string>} chatId
 */
export async function findOrCreateChat(buyerId, sellerId, product) {
  // Deterministic ID: sorted UIDs + productId
  const sortedIds = [buyerId, sellerId].sort();
  const chatId = `${sortedIds[0]}_${sortedIds[1]}_${product.id}`;

  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants: sortedIds,
      buyerId,
      sellerId,
      buyerName: product.buyerName || 'Buyer',
      sellerName: product.sellerName || 'Seller',
      productId: product.id,
      productTitle: product.title || '',
      productImage: product.imageUrl || '',
      productPrice: product.price || 0,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    console.log('[Chat] Created new chat:', chatId);
  }

  return chatId;
}

/**
 * Send a message in a chat thread.
 *
 * @param {string} chatId   – Chat document ID
 * @param {string} senderId – UID of the sender
 * @param {string} text     – Message text
 * @returns {Promise<string>} messageId
 */
export async function sendMessage(chatId, senderId, text) {
  if (!text.trim()) return;

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const msgDoc = await addDoc(messagesRef, {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });

  // Update the chat thread's last message preview
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: text.trim().slice(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  console.log('[Chat] Message sent:', msgDoc.id);
  return msgDoc.id;
}

// ─────────────────────────────────────────────
// 2. REAL-TIME SUBSCRIPTIONS
// ─────────────────────────────────────────────

/**
 * Subscribe to messages in a chat thread (real-time).
 *
 * @param {string}   chatId   – Chat document ID
 * @param {function} callback – Receives messages[]
 * @returns {function} unsubscribe
 */
export function subscribeToMessages(chatId, callback) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      time: d.data().createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
    }));
    callback(messages);
  }, (error) => {
    console.error('[Chat] subscribeToMessages error:', error.message);
    callback([], error);
  });
}

/**
 * Subscribe to all chat threads for a user (real-time).
 *
 * @param {string}   userId   – Firebase UID
 * @param {function} callback – Receives chats[]
 * @returns {function} unsubscribe
 */
export function subscribeToUserChats(userId, callback) {
  const chatsRef = collection(db, 'chats');
  const primaryQ = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const fallbackQ = query(
    chatsRef,
    where('participants', 'array-contains', userId)
  );

  const unsubscribe = onSnapshot(primaryQ, (snapshot) => {
    const chats = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
    callback(chats);
  }, async (error) => {
    console.error('[Chat] subscribeToUserChats error:', error.message);
    if (!needsIndex(error)) {
      callback([], error);
      return;
    }
    safeUnsubscribe(unsubscribe);
    try {
      const snap = await getDocs(fallbackQ);
      const chats = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aMs = a?.lastMessageAt?.toMillis?.() ?? 0;
          const bMs = b?.lastMessageAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      callback(chats, null);
    } catch (fallbackError) {
      callback([], fallbackError);
    }
  });

  return () => safeUnsubscribe(unsubscribe);
}

// ─────────────────────────────────────────────
// 3. USER PRESENCE
// ─────────────────────────────────────────────

/**
 * Update user's online status and lastSeen timestamp.
 *
 * @param {string}  userId   – Firebase UID
 * @param {boolean} isOnline – true if user is active
 */
export async function updateUserPresence(userId, isOnline) {
  if (!userId) return;

  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('[Chat] updateUserPresence skipped:', error?.message || error);
  }
}

/**
 * Subscribe to another user's presence status (real-time).
 *
 * @param {string}   userId   – Firebase UID to watch
 * @param {function} callback – Receives { isOnline, lastSeen }
 * @returns {function} unsubscribe
 */
export function subscribeToPresence(userId, callback) {
  if (!userId) return () => {};

  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen?.toDate?.() || null,
      });
    } else {
      callback({ isOnline: false, lastSeen: null });
    }
  });
}
