'use client';

import React, { ForwardRefRenderFunction, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cardHoverVariants } from '@/lib/design-system/motion';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'glass' | 'statistics' | 'feature' | 'pricing';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  glow?: boolean;
  hoverLift?: boolean;
}

const CardBase: ForwardRefRenderFunction<HTMLDivElement, CardProps> = (
  {
    children,
    className = '',
    variant = 'default',
    glow = false,
    hoverLift = true,
    style,
    ...props
  },
  ref
) => {
  const getCardClasses = () => {
    const classes = ['findora-card'];
    classes.push(`card-${variant}`);
    if (glow) classes.push('card-glow');
    return classes.join(' ');
  };

  const getMotionProps = () => {
    if (variant === 'interactive' || hoverLift) {
      return {
        variants: cardHoverVariants,
        initial: 'initial',
        whileHover: 'hover',
      };
    }
    return {};
  };

  return (
    <motion.div
      ref={ref}
      className={`${getCardClasses()} ${className}`}
      {...getMotionProps()}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: 'var(--space-24)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
      {...(props as any)}
    >
      {/* Decorative premium glow overlay */}
      {(glow || variant === 'pricing') && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(to right, transparent, var(--accent), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {children}

      <style jsx global>{`
        .findora-card {
          background: rgba(15, 23, 42, 0.4);
          transition: background var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard);
        }
        
        .card-default {
          background: rgba(15, 23, 42, 0.4);
        }
        
        .card-elevated {
          background: var(--surface);
          box-shadow: var(--elevation-md);
        }
        
        .card-interactive {
          cursor: pointer;
        }
        .card-interactive:hover {
          background: rgba(15, 23, 42, 0.55);
        }
        
        .card-glass {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(var(--blur-md));
          -webkit-backdrop-filter: blur(var(--blur-md));
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .card-statistics {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(2, 6, 23, 0.8) 100%);
          border-color: rgba(255, 255, 255, 0.05);
        }
        
        .card-feature {
          background: rgba(11, 15, 25, 0.7);
        }
        
        .card-pricing {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(2, 6, 23, 0.9) 100%);
          border: 1px solid rgba(200, 151, 59, 0.2);
          box-shadow: var(--premium-glow);
        }
        
        .card-glow {
          box-shadow: var(--premium-glow);
        }
      `}</style>
    </motion.div>
  );
};

export const Card = forwardRef(CardBase);
Card.displayName = 'Card';
