'use client';

import React, { ForwardRefRenderFunction, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { buttonPressVariants } from '@/lib/design-system/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFAB?: boolean;
  isIconButton?: boolean;
}

const ButtonBase: ForwardRefRenderFunction<HTMLButtonElement, ButtonProps> = (
  {
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    isFAB = false,
    isIconButton = false,
    disabled,
    ...props
  },
  ref
) => {
  const isDisabled = disabled || isLoading;

  // Base and variant styles
  const sizeStyles = {
    sm: 'padding: var(--space-8) var(--space-16); font-size: var(--font-caption); border-radius: var(--radius-sm); height: 36px;',
    md: 'padding: var(--space-12) var(--space-24); font-size: var(--font-button); border-radius: var(--radius-md); height: 46px;',
    lg: 'padding: var(--space-16) var(--space-32); font-size: var(--font-body-lg); border-radius: var(--radius-lg); height: 56px;',
  };

  const fabStyles = 'position: fixed; bottom: var(--space-24); right: var(--space-24); border-radius: var(--radius-full); width: 56px; height: 56px; padding: 0; box-shadow: var(--elevation-high); z-index: var(--z-index-sticky);';
  
  const iconButtonStyles = 'padding: 0; border-radius: var(--radius-full); width: 42px; height: 42px; display: inline-flex; align-items: center; justify-content: center;';

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: 'var(--surface-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          hoverBg: 'rgba(255, 255, 255, 0.05)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          hoverBg: 'rgba(255, 255, 255, 0.03)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
          hoverBg: 'rgba(255, 255, 255, 0.04)',
        };
      case 'danger':
        return {
          background: 'var(--danger-bg)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          hoverBg: 'rgba(239, 68, 68, 0.2)',
        };
      case 'success':
        return {
          background: 'var(--success-bg)',
          color: '#22c55e',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          hoverBg: 'rgba(34, 197, 94, 0.2)',
        };
      case 'primary':
      default:
        return {
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          border: '1px solid transparent',
          hoverBg: 'var(--primary-hover)',
        };
    }
  };

  const currentStyles = getVariantStyles();

  // Combine inline styles or rely on css classes
  const styles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 'var(--opacity-disabled)' : 1,
    transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
    width: isFAB || isIconButton ? 'auto' : '100%',
    direction: 'inherit',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <motion.button
      ref={ref}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      disabled={isDisabled}
      className={`findora-btn findora-btn-${variant} ${className}`}
      variants={buttonPressVariants}
      initial="rest"
      whileHover={isDisabled ? "rest" : "hover"}
      whileTap={isDisabled ? "rest" : "pressed"}
      style={styles}
      {...(props as any)}
    >
      {/* Premium subtle glow overlay for primary gold components */}
      {variant === 'primary' && (
        <span 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {isLoading ? (
        <svg
          className="animate-spin"
          style={{
            width: '18px',
            height: '18px',
            marginInlineEnd: '8px',
            animation: 'spin 1s linear infinite',
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}

      {!isLoading && leftIcon && (
        <span style={{ display: 'inline-flex', marginInlineEnd: '8px' }}>
          {leftIcon}
        </span>
      )}

      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </span>

      {!isLoading && rightIcon && (
        <span style={{ display: 'inline-flex', marginInlineStart: '8px' }}>
          {rightIcon}
        </span>
      )}

      <style jsx global>{`
        .findora-btn {
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
        }
        .findora-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(200, 151, 59, 0.4);
        }
        .findora-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border: 1px solid transparent;
        }
        .findora-btn-primary:hover:not(:disabled) {
          background: var(--primary-hover);
        }
        .findora-btn-secondary {
          background: var(--surface-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }
        .findora-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .findora-btn-outline {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border);
        }
        .findora-btn-outline:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .findora-btn-ghost {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
        }
        .findora-btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
        }
        .findora-btn-danger {
          background: var(--danger-bg);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .findora-btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }
        .findora-btn-success {
          background: var(--success-bg);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .findora-btn-success:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.2);
        }
        
        /* Size classes */
        .findora-btn {
          height: 46px;
          padding: var(--space-12) var(--space-24);
          font-size: 0.95rem;
          border-radius: var(--radius-md);
        }
        .findora-btn.sm {
          height: 36px;
          padding: var(--space-8) var(--space-16);
          font-size: 0.85rem;
          border-radius: var(--radius-sm);
        }
        .findora-btn.lg {
          height: 56px;
          padding: var(--space-16) var(--space-32);
          font-size: 1.05rem;
          border-radius: var(--radius-lg);
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.button>
  );
};

export const Button = forwardRef(ButtonBase);
Button.displayName = 'Button';
