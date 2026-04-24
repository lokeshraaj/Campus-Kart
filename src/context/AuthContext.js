// ============================================
// CampusKart - Auth Context (React Context API)
// ============================================
// Provides the current Firebase user to the entire
// component tree via `useAuth()`. Listens to
// `onAuthStateChanged` so the UI auto-updates on
// login / logout / token refresh.
// ============================================

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext({
  user: null,
  loading: true,
});

/**
 * Wrap your app (or layout) with this provider so that
 * every child component can call `useAuth()`.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        console.log('[AuthContext] Signed in:', firebaseUser.uid);
      } else {
        console.log('[AuthContext] No user signed in');
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the current user and loading state.
 *
 * @returns {{ user: import('firebase/auth').User | null, loading: boolean }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
