// ============================================
// CampusKart - Firebase Initialization
// ============================================
// Central Firebase setup. Every other service module imports
// `auth`, `db`, or `storage` from here — never calls
// `initializeApp` again.
// ============================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration pulled from environment variables.
 * All keys use the NEXT_PUBLIC_ prefix so that Next.js
 * exposes them to the browser bundle.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim();

/**
 * Initialise the Firebase app exactly once.
 * `getApps().length` guards against the hot-reload
 * re-initialisation that Next.js dev mode can trigger.
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Firebase Authentication instance */
const auth = getAuth(app);

/** Cloud Firestore instance */
const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

/** Firebase Cloud Storage instance */
const storage = getStorage(app);

export { app, auth, db, storage };
