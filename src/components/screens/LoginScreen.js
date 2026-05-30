'use client';
import { useState } from 'react';
import { signup, login, loginWithGoogle } from '@/lib/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Friendly error messages for common Firebase Auth error codes.
   */
  const getErrorMessage = (code) => {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    };
    return messages[code] || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      // Auth state change is handled by AuthContext — no manual redirect needed
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page animate-fade-in" id="login-screen">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          🛒
        </div>

        {/* Title */}
        <h1 className="login-title">College Marketplace</h1>
        <p className="login-subtitle">Buy & sell within your campus</p>

        {/* Illustration */}
        <div className="login-illustration">
          <svg
            viewBox="0 0 420 260"
            role="img"
            aria-label="Students exchanging books and gadgets"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <rect width="420" height="260" rx="28" fill="#EFF6FF" />
            <circle cx="340" cy="54" r="34" fill="#DBEAFE" />
            <circle cx="76" cy="204" r="42" fill="#DCFCE7" />
            <path d="M92 176h236c16 0 30 14 30 30v10H62v-10c0-16 14-30 30-30Z" fill="#CBD5E1" />
            <rect x="134" y="77" width="58" height="78" rx="16" fill="#2563EB" />
            <circle cx="163" cy="54" r="22" fill="#FBBF24" />
            <path d="M126 121c-30 6-45 23-48 51" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
            <path d="M194 120c31 9 51 22 70 44" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
            <rect x="246" y="76" width="58" height="79" rx="16" fill="#0F172A" />
            <circle cx="275" cy="53" r="22" fill="#F59E0B" />
            <path d="M238 121c-26 8-46 23-66 43" stroke="#0F172A" strokeWidth="12" strokeLinecap="round" />
            <path d="M306 120c28 8 46 25 53 52" stroke="#0F172A" strokeWidth="12" strokeLinecap="round" />
            <rect x="187" y="114" width="48" height="34" rx="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="3" />
            <path d="M197 125h28M197 136h20" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
            <rect x="218" y="140" width="44" height="32" rx="7" fill="#22C55E" />
            <path d="M230 152h20M230 161h14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            <path d="M122 192h48M250 192h48" stroke="#64748B" strokeWidth="12" strokeLinecap="round" />
            <path d="M158 196l-16 32M270 196l16 32" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            width: '100%',
            padding: 'var(--space-md) var(--space-lg)',
            background: 'var(--error-light)',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            fontSize: '13px',
            color: 'var(--error)',
            fontWeight: 500,
            animation: 'slideDown 300ms ease-out',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">College Email</label>
            <input
              type="email"
              className="input-field"
              id="login-email"
              placeholder="yourname@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">Password</label>
            <input
              type="password"
              className="input-field"
              id="login-password"
              placeholder={isSignup ? 'Create a password (min 6 chars)' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            id="login-button"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⏳' : ''} {isSignup ? 'Create Account' : 'Login'}
          </button>

          <div className="divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR</span>
            <span className="divider-line"></span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleGoogle}
            id="google-login-button"
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle Login / Signup */}
          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            id="toggle-auth-mode"
            style={{
              width: '100%',
              textAlign: 'center',
              padding: 'var(--space-md)',
              fontSize: '14px',
              color: 'var(--primary)',
              fontWeight: 600,
            }}
          >
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            🔒 Only verified students allowed
          </p>
        </div>
      </div>
    </div>
  );
}
