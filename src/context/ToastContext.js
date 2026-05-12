// ============================================
// CampusKart - Toast Notification System
// ============================================
// Global toast provider + hook. Supports success,
// error, and info variants with auto-dismiss.
//
// Usage in any component:
//   const { showToast } = useToast();
//   showToast('Item posted!', 'success');
//   showToast('Upload failed', 'error');
//   showToast('Reconnecting…', 'info');
// ============================================

'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toaster } from 'react-hot-toast';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext(null);

// ─────────────────────────────────────────────
// Provider + Toast UI
// ─────────────────────────────────────────────

/** Auto-dismiss duration in ms */
const TOAST_DURATION = 3500;

/** Max toasts visible at once */
const MAX_TOASTS = 3;

/** Variant → icon mapping */
const TOAST_ICONS = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️',
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  /**
   * Show a toast notification.
   *
   * @param {string} message  – The text to display
   * @param {'success'|'error'|'info'} [variant='info'] – Visual style
   * @param {number} [duration] – Override auto-dismiss ms (0 = sticky)
   */
  const showToast = useCallback((message, variant = 'info', duration = TOAST_DURATION) => {
    const id = ++toastIdCounter;

    setToasts((prev) => {
      // Cap number of visible toasts
      const next = [...prev, { id, message, variant, exiting: false }];
      if (next.length > MAX_TOASTS) next.shift();
      return next;
    });

    // Auto-dismiss
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismissToast(id), duration);
    }

    return id;
  }, []);

  /**
   * Dismiss a toast with an exit animation.
   */
  const dismissToast = useCallback((id) => {
    // Clear any pending auto-dismiss timer
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <Toaster position="top-center" />

      {/* Toast Container — renders at top-center of viewport */}
      {toasts.length > 0 && (
        <div
          className="toast-container"
          aria-live="polite"
          aria-atomic="true"
          id="toast-container"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.variant} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
              onClick={() => dismissToast(toast.id)}
              role="alert"
              id={`toast-${toast.id}`}
            >
              <span className="toast-icon">{TOAST_ICONS[toast.variant]}</span>
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-close"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(toast.id);
                }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Access the toast notification system.
 *
 * @returns {{ showToast: function, dismissToast: function }}
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
