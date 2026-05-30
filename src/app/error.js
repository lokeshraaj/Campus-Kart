'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }) {
  console.error('App route error:', error);

  return (
    <main style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#F8FAFC',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
        }}>
          <section style={{
            width: 'min(420px, 100%)',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'center',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={24} strokeWidth={2} />
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0F172A' }}>
              Something went wrong
            </h1>
            <p style={{ margin: '0 0 22px', color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
              CampusKart hit a temporary error. Try reloading this view.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                height: '44px',
                border: 'none',
                borderRadius: '10px',
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '0 18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <RefreshCw size={16} strokeWidth={2} />
              Try again
            </button>
          </section>
    </main>
  );
}
