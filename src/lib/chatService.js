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
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const SOLD_CHAT_TTL_MS = 24 * 60 * 60 * 1000;
const INACTIVE_CHAT_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function needsIndex(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return error.code === 'failed-precondition' && msg.includes('index');
}

function isFirestoreInternalError(error) {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('internal assertion failed') || msg.includes('unexpected state');
}

const missingIndexQueryKeys = new Set();

function safeUnsubscribe(unsub) {
  if (typeof unsub !== 'function') return;
  try {
    unsub();
  } catch (error) {
    console.warn('[Chat] unsubscribe skipped:', error?.message || error);
  }
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

export function isExpiredChat(chat, now = Date.now()) {
  const soldAtMs = toMillis(chat?.soldAt);
  if (soldAtMs && now - soldAtMs >= SOLD_CHAT_TTL_MS) return true;

  const lastActivityMs = toMillis(chat?.lastMessageAt) || toMillis(chat?.createdAt);
  if (lastActivityMs && now - lastActivityMs >= INACTIVE_CHAT_TTL_MS) return true;

  return false;
}

async function deleteChatWithMessages(chatId) {
  const chatRef = doc(db, 'chats', chatId);
  const messagesSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const messageDoc of messagesSnap.docs) {
    batch.delete(messageDoc.ref);
    batchCount += 1;

    if (batchCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  batch.delete(chatRef);
  await batch.commit();
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
  }, { merge: true });
  console.log('[Chat] Chat ready:', chatId);

  return chatId;
}

/**
 * Send a message in a chat thread, with optional image attachment.
 *
 * @param {string}      chatId   – Chat document ID
 * @param {string}      senderId – UID of the sender
 * @param {string}      text     – Message text (may be empty when sending an image-only message)
 * @param {string|null} imageUrl – Optional public download URL of an uploaded image
 * @returns {Promise<string>} messageId
 */
export async function sendMessage(chatId, senderId, text, imageUrl = null) {
  const trimmedText = (text || '').trim();
  if (!trimmedText && !imageUrl) return;

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messageData = {
    senderId,
    text: trimmedText,
    createdAt: serverTimestamp(),
  };
  if (imageUrl) messageData.imageUrl = imageUrl;

  const msgDoc = await addDoc(messagesRef, messageData);

  // Build the chat-level preview shown in ChatsScreen
  const lastMessage = trimmedText
    ? trimmedText.slice(0, 100)
    : '📷 Photo';

  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage,
    lastMessageSenderId: senderId,
    lastMessageAt: serverTimestamp(),
  });

  console.log('[Chat] Message sent:', msgDoc.id);
  return msgDoc.id;
}

export async function cleanupExpiredChatsForUser(userId, chats = null) {
  if (!userId) return 0;

  const chatDocs = Array.isArray(chats)
    ? chats
    : (await getDocs(query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId)
      ))).docs.map((chatDoc) => ({ id: chatDoc.id, ...chatDoc.data() }));

  const expiredChats = chatDocs.filter(isExpiredChat);
  await Promise.all(expiredChats.map((chat) => deleteChatWithMessages(chat.id)));

  if (expiredChats.length > 0) {
    console.log('[Chat] Cleaned up expired chats:', expiredChats.length);
  }

  return expiredChats.length;
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
  const queryKey = `chats:user:${userId}:lastMessageAtDesc`;
  const primaryQ = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const fallbackQ = query(
    chatsRef,
    where('participants', 'array-contains', userId)
  );

  const sortChats = (docs) => docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aMs = a?.lastMessageAt?.toMillis?.() ?? 0;
      const bMs = b?.lastMessageAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });

  const subscribeToFallback = () => onSnapshot(fallbackQ, (snapshot) => {
    callback(sortChats(snapshot.docs), null);
  }, (error) => {
    callback([], error);
  });

  if (missingIndexQueryKeys.has(queryKey)) {
    return subscribeToFallback();
  }

  let fallbackUnsubscribe = null;
  let primaryFailedWithMissingIndex = false;
  let unsubscribe = null;
  try {
    unsubscribe = onSnapshot(primaryQ, (snapshot) => {
      const chats = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      callback(chats);
    }, (error) => {
      if (!needsIndex(error) && !isFirestoreInternalError(error)) {
        console.error('[Chat] subscribeToUserChats error:', error.message);
        callback([], error);
        return;
      }
      primaryFailedWithMissingIndex = true;
      if (!missingIndexQueryKeys.has(queryKey)) {
        missingIndexQueryKeys.add(queryKey);
        console.warn('[Chat] subscribeToUserChats is missing a Firestore index. Using client-side sorted fallback for this session.');
      }
      if (!fallbackUnsubscribe) fallbackUnsubscribe = subscribeToFallback();
    });
  } catch (error) {
    if (!needsIndex(error) && !isFirestoreInternalError(error)) {
      console.error('[Chat] subscribeToUserChats setup error:', error.message);
      callback([], error);
      return () => {};
    }
    primaryFailedWithMissingIndex = true;
    if (!missingIndexQueryKeys.has(queryKey)) {
      missingIndexQueryKeys.add(queryKey);
      console.warn('[Chat] subscribeToUserChats is missing a Firestore index. Using client-side sorted fallback for this session.');
    }
    getDocs(fallbackQ)
      .then((snapshot) => callback(sortChats(snapshot.docs), null))
      .catch((fallbackError) => callback([], fallbackError));
    unsubscribe = () => {};
  }

  return () => {
    if (!primaryFailedWithMissingIndex) safeUnsubscribe(unsubscribe);
    safeUnsubscribe(fallbackUnsubscribe);
  };
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
