'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { backdropVariants, modalVariants } from '@/lib/design-system/motion';

// ──────────────────────────────────────────────────────────────────────────
// 1. MODAL / DIALOG (OVERLAY)
// ──────────────────────────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: varColor('--z-index-modal', 1000),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-16)',
          }}
        >
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--overlay)',
              backdropFilter: 'blur(var(--blur-sm))',
            }}
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            role="dialog"
            aria-modal="true"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '500px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-24)',
              boxShadow: 'var(--elevation-high)',
              zIndex: 1,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-16)',
              }}
            >
              {title && (
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper for fallback
function varColor(variableName: string, fallback: number) {
  return fallback;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. ALERT (INLINE)
// ──────────────────────────────────────────────────────────────────────────
export type AlertType = 'success' | 'warning' | 'danger' | 'info';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  success: <CheckCircle size={20} style={{ color: '#22c55e' }} />,
  warning: <AlertTriangle size={20} style={{ color: '#f59e0b' }} />,
  danger: <AlertCircle size={20} style={{ color: '#ef4444' }} />,
  info: <Info size={20} style={{ color: '#3b82f6' }} />,
};

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, onClose }) => {
  const getAlertBg = () => {
    switch (type) {
      case 'success': return 'var(--success-bg)';
      case 'warning': return 'var(--warning-bg)';
      case 'danger': return 'var(--danger-bg)';
      case 'info':
      default:
        return 'var(--info-bg)';
    }
  };

  const getAlertBorder = () => {
    switch (type) {
      case 'success': return '1px solid rgba(34, 197, 94, 0.2)';
      case 'warning': return '1px solid rgba(245, 158, 11, 0.2)';
      case 'danger': return '1px solid rgba(239, 68, 68, 0.2)';
      case 'info':
      default:
        return '1px solid rgba(59, 130, 246, 0.2)';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-12)',
        padding: 'var(--space-16)',
        borderRadius: 'var(--radius-md)',
        background: getAlertBg(),
        border: getAlertBorder(),
        color: 'var(--text-primary)',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flexShrink: 0 }}>{alertIcons[type]}</div>
      <div style={{ flexGrow: 1 }}>
        {title && (
          <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.95rem', fontWeight: 800 }}>
            {title}
          </h4>
        )}
        <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 3. TOOLTIP
// ──────────────────────────────────────────────────────────────────────────
export interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 'var(--space-8)',
              padding: '6px 12px',
              background: '#0b0f19',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              zIndex: 3000,
              boxShadow: 'var(--elevation-low)',
              pointerEvents: 'none',
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
