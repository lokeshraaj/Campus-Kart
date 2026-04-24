// ============================================
// CampusKart - Authentication Service
// ============================================
// Wraps Firebase Auth methods behind clean async
// functions with consistent error handling.
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Register a new user with email & password.
 *
 * @param {string} email   – College email address
 * @param {string} password – Chosen password (min 6 chars, enforced by Firebase)
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function signup(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Signup successful:', userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error('[Auth] Signup failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Log in an existing user with email & password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Login successful:', userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error('[Auth] Login failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Sign in with Google via popup.
 *
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    console.log('[Auth] Google sign-in successful:', userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error('[Auth] Google sign-in failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Sign the current user out.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await signOut(auth);
    console.log('[Auth] Logout successful');
  } catch (error) {
    console.error('[Auth] Logout failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Helper – returns the currently signed-in user or `null`.
 *
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}
