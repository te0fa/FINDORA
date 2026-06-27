'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  duration?: number; // ms, default 4000
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Icons ───────────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const COLORS: Record<ToastType, { bg: string; border: string; accent: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', accent: '#10b981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  accent: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', accent: '#f59e0b' },
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', accent: '#3b82f6' },
};

// ─── Single Toast Item Component ──────────────────────────────────────────────
function ToastItemComponent({
  toast,
  onDismiss,
  isRTL,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  isRTL: boolean;
}) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const colors = COLORS[toast.type];

  // Slide-in effect
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    const intervalMs = 50;
    const steps = toast.duration / intervalMs;
    const decrement = 100 / steps;
    let current = 100;

    const interval = setInterval(() => {
      current -= decrement;
      setProgress(Math.max(0, current));
      if (current <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  const slideDir = isRTL ? 'translateX(-110%)' : 'translateX(110%)';

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        padding: '14px 16px 10px',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors.border}`,
        minWidth: '300px',
        maxWidth: '400px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: visible ? 'translateX(0)' : slideDir,
        opacity: visible ? 1 : 0,
        position: 'relative',
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: toast.title ? '4px' : '0' }}>
        <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.2 }}>{ICONS[toast.type]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <div style={{
              fontWeight: 700,
              fontSize: '0.875rem',
              color: colors.accent,
              marginBottom: '2px',
              lineHeight: 1.3,
            }}>
              {toast.title}
            </div>
          )}
          <div style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '16px',
            padding: '0',
            lineHeight: 1,
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
        >
          ✕
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(255,255,255,0.08)',
      }}>
        <div style={{
          height: '100%',
          background: colors.accent,
          width: `${progress}%`,
          transition: 'width 0.05s linear',
          borderRadius: '0 0 14px 14px',
        }} />
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const isRTL = useRef(false);

  // Detect RTL from document direction
  useEffect(() => {
    isRTL.current = document.documentElement.dir === 'rtl';
  }, []);

  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const item: ToastItem = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      message,
      type: options.type || 'info',
      title: options.title,
      duration: options.duration || 4000,
      createdAt: Date.now(),
    };

    setToasts(prev => {
      // Max 4 toasts — remove oldest if exceeded
      const updated = [...prev, item];
      return updated.length > 4 ? updated.slice(updated.length - 4) : updated;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const rtl = isRTL.current;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          style={{
            position: 'fixed',
            top: '20px',
            ...(rtl ? { left: '20px' } : { right: '20px' }),
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItemComponent
                toast={t}
                onDismiss={dismiss}
                isRTL={rtl}
              />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback — won't crash if used outside provider
    return {
      toast: (message, options) => {
        console.warn('[Toast] useToast called outside ToastProvider. Message:', message, options);
      },
    };
  }
  return ctx;
}
