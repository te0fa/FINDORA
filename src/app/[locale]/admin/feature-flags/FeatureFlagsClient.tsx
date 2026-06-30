'use client'
/**
 * src/app/[locale]/admin/feature-flags/FeatureFlagsClient.tsx
 *
 * Live feature flag management panel.
 * - Groups flags by category
 * - Toggle = optimistic UI update → DB UPDATE + audit INSERT
 * - Other open sessions update live via useFeature Realtime hook
 */

import React, { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toggle } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string
  key: string
  enabled: boolean
  title: string
  title_ar: string
  description: string | null
  category: string
  config: Record<string, unknown>
  updated_by: string | null
  updated_at: string | null
  created_at: string
}

interface Props {
  initialFlags: FeatureFlag[]
  userId: string
  locale: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString: string | null, locale: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  const isAr = locale === 'ar'
  if (diffSec < 60)  return isAr ? 'الآن'             : 'Just now'
  if (diffMin < 60)  return isAr ? `منذ ${diffMin} دقيقة`   : `${diffMin}m ago`
  if (diffHr < 24)   return isAr ? `منذ ${diffHr} ساعة`     : `${diffHr}h ago`
  return isAr ? `منذ ${diffDay} يوم` : `${diffDay}d ago`
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  ai_concierge:   { ar: 'المساعد الذكي', en: 'AI Concierge' },
  request_wizard: { ar: 'معالج الطلبات', en: 'Request Wizard' },
}

function categoryLabel(cat: string, locale: string): string {
  const label = CATEGORY_LABELS[cat]
  if (!label) return cat
  return locale === 'ar' ? label.ar : label.en
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeatureFlagsClient({ initialFlags, userId, locale }: Props) {
  const isAr = locale === 'ar'
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Group by category
  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    acc[flag.category] = acc[flag.category] ?? []
    acc[flag.category].push(flag)
    return acc
  }, {})

  const handleToggle = useCallback(async (flag: FeatureFlag) => {
    if (toggling.has(flag.key)) return

    const oldValue = flag.enabled
    const newValue = !flag.enabled

    // ── Optimistic update ─────────────────────────────────────────────────────
    setFlags(prev =>
      prev.map(f => f.key === flag.key ? { ...f, enabled: newValue, updated_at: new Date().toISOString() } : f)
    )
    setToggling(prev => new Set(prev).add(flag.key))
    setErrors(prev => { const e = { ...prev }; delete e[flag.key]; return e })

    const supabase = createClient()

    try {
      // ── a. Update feature_flags row ─────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('feature_flags')
        .update({
          enabled:    newValue,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('key', flag.key)

      if (updateError) throw updateError

      // ── b. Insert audit row ─────────────────────────────────────────────────
      // Fetch current user's staff role for audit record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: staffRow } = await (supabase as any)
        .from('staff_members')
        .select('staff_role')
        .eq('auth_user_id', userId)
        .maybeSingle()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: auditError } = await (supabase as any)
        .from('feature_flags_audit')
        .insert({
          flag_key:        flag.key,
          old_value:       oldValue,
          new_value:       newValue,
          changed_by:      userId,
          changed_by_role: (staffRow as { staff_role?: string } | null)?.staff_role ?? 'unknown',
        })

      if (auditError) {
        // Audit failure is non-critical — log but don't revert UI
        console.warn('[feature-flags] Audit insert failed:', auditError.message)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[feature-flags] Toggle failed:', msg)

      // ── Revert optimistic update on error ────────────────────────────────────
      setFlags(prev =>
        prev.map(f => f.key === flag.key ? { ...f, enabled: oldValue } : f)
      )
      setErrors(prev => ({
        ...prev,
        [flag.key]: isAr ? 'فشل تحديث الميزة، يرجى المحاولة مرة أخرى' : 'Update failed, please try again',
      }))
    } finally {
      setToggling(prev => {
        const next = new Set(prev)
        next.delete(flag.key)
        return next
      })
    }
  }, [toggling, userId, isAr])

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ padding: 'var(--space-32, 32px)', maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-32, 32px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🎛️</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>
            {isAr ? 'لوحة التحكم في الميزات' : 'Feature Control Panel'}
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          {isAr
            ? 'تشغيل وإيقاف ميزات المنصة بشكل فوري — التغييرات تنعكس على جميع المستخدمين في الوقت الفعلي'
            : 'Enable or disable platform features instantly — changes propagate to all users in real time'}
        </p>
      </div>

      {/* Live indicator */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '6px 14px', borderRadius: '9999px',
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
        marginBottom: '28px',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
          animation: 'ffPulse 2s ease-in-out infinite',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>
          {isAr ? 'تحديث فوري مفعّل' : 'Live Updates Active'}
        </span>
      </div>

      {/* Grouped Flag Sections */}
      {Object.entries(grouped).map(([category, categoryFlags]) => (
        <div key={category} style={{ marginBottom: '32px' }}>
          {/* Category header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '16px', paddingBottom: '10px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          }}>
            <span style={{
              padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'rgba(200,151,59,0.15)', color: 'var(--accent, #c8973b)',
              border: '1px solid rgba(200,151,59,0.25)',
            }}>
              {categoryLabel(category, locale)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
              {categoryFlags.length} {isAr ? 'ميزة' : 'features'}
            </span>
          </div>

          {/* Flag cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categoryFlags.map(flag => {
              const isTogglingThis = toggling.has(flag.key)
              const flagError = errors[flag.key]
              const lastModified = relativeTime(flag.updated_at, locale)

              return (
                <Card key={flag.key} variant="default" style={{ padding: 'var(--space-20, 20px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Status glow */}
                    <div style={{
                      width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%',
                      background: flag.enabled ? '#22c55e' : 'rgba(255,255,255,0.2)',
                      boxShadow: flag.enabled ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                      transition: 'all 0.3s ease',
                    }} />

                    {/* Title + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          {isAr ? flag.title_ar : flag.title}
                        </span>
                        <code style={{
                          fontSize: '11px', color: 'var(--text-muted, #64748b)',
                          background: 'rgba(255,255,255,0.05)', padding: '1px 6px',
                          borderRadius: '4px', fontFamily: 'monospace',
                        }}>
                          {flag.key}
                        </code>
                      </div>

                      {flag.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                          {flag.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {/* Status badge */}
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                          background: flag.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                          color: flag.enabled ? '#22c55e' : '#ef4444',
                          border: `1px solid ${flag.enabled ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                          transition: 'all 0.2s ease',
                        }}>
                          {flag.enabled
                            ? (isAr ? '● مفعّل' : '● Enabled')
                            : (isAr ? '○ معطّل' : '○ Disabled')}
                        </span>

                        {/* Last modified */}
                        {lastModified && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                            {isAr ? 'آخر تعديل:' : 'Modified:'} {lastModified}
                          </span>
                        )}

                        {/* Config summary (non-empty) */}
                        {flag.config && Object.keys(flag.config).length > 0 && (
                          <span style={{
                            fontSize: '10px', color: 'var(--text-muted, #64748b)',
                            background: 'rgba(255,255,255,0.04)', padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            {isAr ? 'إعدادات' : 'Config'}: {JSON.stringify(flag.config).slice(0, 60)}
                            {JSON.stringify(flag.config).length > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>

                      {/* Error message */}
                      {flagError && (
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                          ⚠️ {flagError}
                        </p>
                      )}
                    </div>

                    {/* Toggle */}
                    <div style={{ opacity: isTogglingThis ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                      <Toggle
                        checked={flag.enabled}
                        disabled={isTogglingThis}
                        onChange={() => handleToggle(flag)}
                        aria-label={`Toggle ${flag.key}`}
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {flags.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #64748b)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎛️</div>
          <p>{isAr ? 'لا توجد ميزات بعد' : 'No feature flags found'}</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ffPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      ` }} />
    </div>
  )
}
