'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Inbox, AlertTriangle, CheckCircle, Search } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// 1. AVATAR
// ──────────────────────────────────────────────────────────────────────────
export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md' }) => {
  const sizeMap = {
    sm: '32px',
    md: '44px',
    lg: '64px',
  };

  const currentSize = sizeMap[size];

  return (
    <div
      style={{
        width: currentSize,
        height: currentSize,
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        background: 'var(--surface-secondary)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: size === 'lg' ? '1.5rem' : '1.0rem',
        fontWeight: 700,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : name ? (
        name.substring(0, 2).toUpperCase()
      ) : (
        <User size={size === 'lg' ? 32 : 20} />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 2. PROFILE CARD
// ──────────────────────────────────────────────────────────────────────────
export interface ProfileCardProps {
  name: string;
  role: string;
  avatarSrc?: string;
  email?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ name, role, avatarSrc, email }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-16)',
        padding: 'var(--space-16)',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid var(--border)',
      }}
    >
      <Avatar src={avatarSrc} name={name} size="md" />
      <div>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{name}</h4>
        <p style={{ margin: 'var(--space-4) 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{role}</p>
        {email && (
          <p style={{ margin: 'var(--space-4) 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{email}</p>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 3. EMPTY STATE
// ──────────────────────────────────────────────────────────────────────────
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-48) var(--space-24)',
        textAlign: 'center',
      }}
    >
      <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-16)' }} />
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--space-8)' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '350px', marginBottom: 'var(--space-24)' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 4. LOADING SKELETON
// ──────────────────────────────────────────────────────────────────────────
export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', width: '100%' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'center' }}>
          <div
            className="skeleton-pulse"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              className="skeleton-pulse"
              style={{
                width: '60%',
                height: '14px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: '40%',
                height: '10px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          </div>
        </div>
      ))}
      <style jsx global>{`
        .skeleton-pulse {
          animation: pulse 1.8s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.35; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 5. ERROR STATE
// ──────────────────────────────────────────────────────────────────────────
export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-32)',
        textAlign: 'center',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        background: 'var(--danger-bg)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: 'var(--space-12)' }} />
      <p style={{ fontWeight: 700, margin: '0 0 var(--space-16) 0' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            padding: 'var(--space-8) var(--space-16)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          إعادة المحاولة / Retry
        </button>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 6. SUCCESS STATE
// ──────────────────────────────────────────────────────────────────────────
export interface SuccessStateProps {
  message: string;
  action?: React.ReactNode;
}

export const SuccessState: React.FC<SuccessStateProps> = ({ message, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-32)',
        textAlign: 'center',
        border: '1px solid rgba(34, 197, 94, 0.15)',
        background: 'var(--success-bg)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <CheckCircle size={36} style={{ color: 'var(--success)', marginBottom: 'var(--space-12)' }} />
      <p style={{ fontWeight: 700, margin: '0 0 var(--space-16) 0' }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
