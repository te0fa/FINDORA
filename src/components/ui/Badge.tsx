'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gold';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  outline?: boolean;
  animated?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  outline = false,
  animated = false,
  className = '',
  style,
  ...props
}) => {
  const getBadgeStyles = () => {
    if (outline) {
      switch (variant) {
        case 'success':
          return { bg: 'transparent', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' };
        case 'warning':
          return { bg: 'transparent', color: '#fde047', border: '1px solid rgba(245, 158, 11, 0.3)' };
        case 'danger':
          return { bg: 'transparent', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' };
        case 'gold':
          return { bg: 'transparent', color: 'var(--accent)', border: '1px solid rgba(200, 151, 59, 0.3)' };
        case 'primary':
        default:
          return { bg: 'transparent', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' };
      }
    }

    switch (variant) {
      case 'success':
        return { bg: 'var(--success-bg)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.15)' };
      case 'warning':
        return { bg: 'var(--warning-bg)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.15)' };
      case 'danger':
        return { bg: 'var(--danger-bg)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.15)' };
      case 'gold':
        return { bg: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(200, 151, 59, 0.15)' };
      case 'primary':
      default:
        return { bg: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.15)' };
    }
  };

  const badgeConfig = getBadgeStyles();

  return (
    <span
      className={`findora-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: 'var(--space-4) var(--space-12)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        background: badgeConfig.bg,
        color: badgeConfig.color,
        border: badgeConfig.border,
        ...style,
      }}
      {...props}
    >
      {animated && (
        <motion.span
          className="badge-pulse-dot"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: badgeConfig.color,
            boxShadow: `0 0 8px ${badgeConfig.color}`,
          }}
        />
      )}
      {children}
    </span>
  );
};
