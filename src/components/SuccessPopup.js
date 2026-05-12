'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const SuccessPopupContext = createContext(null);

// ─────────────────────────────────────────────
// Confetti Particle (pure CSS, no icons)
// ─────────────────────────────────────────────

function ConfettiParticles() {
  // Each particle: type (dot | ring | squiggle), color, position, size, delay
  const particles = [
    { type: 'dot',     color: '#10B981', top: '12%', left: '38%', size: 10, delay: '0s' },
    { type: 'dot',     color: '#EF4444', top: '16%', left: '52%', size: 7,  delay: '0.1s' },
    { type: 'ring',    color: '#FCD34D', top: '28%', left: '18%', size: 10, delay: '0.15s' },
    { type: 'ring',    color: '#CBD5E1', top: '62%', left: '20%', size: 12, delay: '0.2s' },
    { type: 'dot',     color: '#3B82F6', top: '68%', left: '55%', size: 10, delay: '0.25s' },
    { type: 'ring',    color: '#A78BFA', top: '35%', left: '72%', size: 8,  delay: '0.05s' },
    { type: 'squiggle',color: '#3B82F6', top: '30%', left: '12%', size: 24, delay: '0.3s', rotate: '-20deg' },
    { type: 'squiggle',color: '#EF4444', top: '10%', left: '68%', size: 22, delay: '0.12s', rotate: '140deg' },
    { type: 'squiggle',color: '#F59E0B', top: '65%', left: '70%', size: 20, delay: '0.18s', rotate: '30deg' },
  ];

  return (
    <>
      {particles.map((p, i) => {
        if (p.type === 'dot') {
          return (
            <span key={i} className="confetti-dot" style={{
              position: 'absolute', top: p.top, left: p.left,
              width: p.size, height: p.size, borderRadius: '50%',
              background: p.color, animationDelay: p.delay,
            }} />
          );
        }
        if (p.type === 'ring') {
          return (
            <span key={i} className="confetti-ring" style={{
              position: 'absolute', top: p.top, left: p.left,
              width: p.size, height: p.size, borderRadius: '50%',
              border: `2px solid ${p.color}`, animationDelay: p.delay,
            }} />
          );
        }
        // squiggle — a small curved SVG line
        return (
          <svg key={i} className="confetti-squiggle" width={p.size} height={p.size * 0.5}
            viewBox="0 0 24 12" fill="none" style={{
              position: 'absolute', top: p.top, left: p.left,
              transform: `rotate(${p.rotate || '0deg'})`,
              animationDelay: p.delay,
            }}
          >
            <path d="M2 10C6 2 10 2 12 6C14 10 18 10 22 2"
              stroke={p.color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────
// Provider + Popup UI
// ─────────────────────────────────────────────

export function SuccessPopupProvider({ children }) {
  const [popup, setPopup] = useState(null); // { title, message }
  const [phase, setPhase] = useState('idle'); // 'idle' | 'entering' | 'visible' | 'exiting'
  const timerRef = useRef(null);
  const onDismissRef = useRef(null);

  const showSuccess = useCallback((title, message, onDismiss) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    onDismissRef.current = onDismiss || null;
    setPopup({ title, message });
    setPhase('entering');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('visible');
      });
    });

    timerRef.current = setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => {
        setPopup(null);
        setPhase('idle');
        if (onDismissRef.current) {
          onDismissRef.current();
          onDismissRef.current = null;
        }
      }, 400);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <SuccessPopupContext.Provider value={{ showSuccess }}>
      {children}

      {popup && (
        <div
          className={`sp-overlay ${phase === 'exiting' ? 'sp-overlay--exit' : 'sp-overlay--enter'}`}
          id="success-popup-overlay"
        >
          <div
            className={`sp-card ${phase === 'exiting' ? 'sp-card--exit' : 'sp-card--enter'}`}
            id="success-popup-card"
          >
            {/* Confetti + Icon area */}
            <div className="sp-icon-area">
              <ConfettiParticles />
              {/* Outer ring */}
              <div className="sp-circle-outer">
                {/* Inner filled circle */}
                <div className="sp-circle-inner">
                  <Check size={40} strokeWidth={3} color="#fff" />
                </div>
              </div>
            </div>

            {/* Text */}
            <h2 className="sp-title">{popup.title}</h2>
            <p className="sp-message">{popup.message}</p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        /* ══ Overlay ══ */
        .sp-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .sp-overlay--enter { animation: spOverlayIn 0.3s ease forwards; }
        .sp-overlay--exit  { animation: spOverlayOut 0.4s ease forwards; }

        @keyframes spOverlayIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spOverlayOut { from { opacity: 1; } to { opacity: 0; } }

        /* ══ Card ══ */
        .sp-card {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 48px 40px 40px;
          text-align: center;
          box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.18),
                      0 0 0 1px rgba(0, 0, 0, 0.04);
          max-width: 380px;
          width: 92%;
        }
        .sp-card--enter { animation: spCardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .sp-card--exit  { animation: spCardOut 0.35s ease forwards; }

        @keyframes spCardIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spCardOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.9) translateY(12px); }
        }

        /* ══ Icon Area (contains confetti + circle) ══ */
        .sp-icon-area {
          position: relative;
          width: 180px;
          height: 180px;
          margin: 0 auto 28px;
        }

        /* ══ Green Circle ══ */
        .sp-circle-outer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 110px;
          height: 110px;
          border-radius: 50%;
          border: 3px solid #34D399;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: spRingIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
        }

        .sp-circle-inner {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(145deg, #34D399, #10B981);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
          animation: spCheckBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both;
        }

        @keyframes spRingIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        @keyframes spCheckBounce {
          from { opacity: 0; transform: scale(0.3); }
          60%  { transform: scale(1.1); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ══ Confetti Animations ══ */
        .confetti-dot {
          animation: spDotPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .confetti-ring {
          animation: spDotPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .confetti-squiggle {
          animation: spSquiggleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes spDotPop {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes spSquiggleIn {
          from { opacity: 0; transform: rotate(var(--r, 0deg)) scale(0); }
          to   { opacity: 0.8; transform: rotate(var(--r, 0deg)) scale(1); }
        }

        /* ══ Text ══ */
        .sp-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 8px;
          font-family: 'Poppins', Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.3;
        }

        .sp-message {
          font-size: 0.9rem;
          color: #64748B;
          margin: 0;
          line-height: 1.6;
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}} />
    </SuccessPopupContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useSuccessPopup() {
  const context = useContext(SuccessPopupContext);
  if (!context) {
    throw new Error('useSuccessPopup must be used within a SuccessPopupProvider');
  }
  return context;
}
