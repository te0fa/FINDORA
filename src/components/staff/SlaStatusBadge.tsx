'use client';

import React from 'react';

interface SlaStatusBadgeProps {
  status: 'on_time' | 'warning' | 'breached';
  label: string;
}

export function SlaStatusBadge({ status, label }: SlaStatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'breached':
        return 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
      case 'warning':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getDotStyles = () => {
    switch (status) {
      case 'breached':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${getStyles()}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotStyles()}`} />
      {label}
    </div>
  );
}
