import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export function getProfileDisplayName(profile, fallback = 'User') {
  return profile?.name || profile?.displayName || profile?.email?.split('@')[0] || fallback;
}

export function getProfileInitials(profile, fallbackName = 'User') {
  const name = getProfileDisplayName(profile, fallbackName);
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getProfileCollegeLine(profile, fallback = 'College not specified') {
  const values = [profile?.university, profile?.branch].filter(Boolean);
  return values.length > 0 ? values.join(' • ') : fallback;
}

export async function getUserProfile(userId) {
  if (!userId) return null;

  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function saveUserProfile(userId, profileData) {
  if (!userId) {
    throw new Error('Missing user ID.');
  }

  await setDoc(doc(db, 'users', userId), {
    ...profileData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
