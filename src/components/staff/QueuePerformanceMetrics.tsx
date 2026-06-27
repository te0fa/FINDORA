'use client';

import React from 'react';
import Link from 'next/link';
import { QueueMetrics } from '@/lib/dal/performance';

interface QueuePerformanceMetricsProps {
  metrics: QueueMetrics[];
  dict: any;
  locale: string;
}

export function QueuePerformanceMetrics({ metrics, dict, locale }: QueuePerformanceMetricsProps) {
  const breachedCount = metrics
    .filter(m => m.sla_status === 'breached')
    .reduce((acc, curr) => acc + curr.request_count, 0);

  const warningCount = metrics
    .filter(m => m.sla_status === 'warning')
    .reduce((acc, curr) => acc + curr.request_count, 0);

  const onTimeCount = metrics
    .filter(m => m.sla_status === 'on_time')
    .reduce((acc, curr) => acc + curr.request_count, 0);

  return (
    <div className="metrics-grid">
      <Link href={`/${locale}/staff/queue?sla=breached`} className="metric-card card-breached">
        <div className="metric-label">{dict.sla.metrics_breached}</div>
        <div className="metric-value value-red">{breachedCount}</div>
      </Link>

      <Link href={`/${locale}/staff/queue?sla=warning`} className="metric-card card-warning">
        <div className="metric-label">{dict.sla.metrics_at_risk}</div>
        <div className="metric-value value-orange">{warningCount}</div>
      </Link>

      <Link href={`/${locale}/staff/queue?sla=on_time`} className="metric-card card-on-track">
        <div className="metric-label">{dict.sla.metrics_on_track}</div>
        <div className="metric-value value-emerald">{onTimeCount}</div>
      </Link>

      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr; }
        }
        .metric-card {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .metric-card:hover {
          background: rgba(15, 23, 42, 0.8);
          transform: translateY(-2px);
        }
        .card-breached { border-color: rgba(239, 68, 68, 0.2); }
        .card-warning { border-color: rgba(245, 158, 11, 0.2); }
        .card-on-track { border-color: rgba(16, 185, 129, 0.2); }
        
        .metric-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 1.5rem;
          font-weight: 900;
        }
        .value-red { color: #ef4444; }
        .value-orange { color: #f59e0b; }
        .value-emerald { color: #10b981; }
      `}</style>
    </div>
  );
}
