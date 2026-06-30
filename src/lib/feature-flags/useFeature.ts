'use client'
/**
 * src/lib/feature-flags/useFeature.ts
 * Client-side React hook for reading a single feature flag.
 * - Fetches initial state on mount
 * - Subscribes to Postgres Realtime changes for live updates (no refresh needed)
 * - Returns { enabled, config, loading }
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FeatureState {
  enabled: boolean
  config: Record<string, unknown>
  loading: boolean
}

export function useFeature(key: string): FeatureState {
  const [state, setState] = useState<FeatureState>({
    enabled: false,
    config: {},
    loading: true,
  })

  // Stable ref for cleanup
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!key) return

    const supabase = createClient()
    let cancelled = false

    // ── Initial Fetch ─────────────────────────────────────────────────────────
    async function fetchFlag() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('enabled, config')
        .eq('key', key)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        // If flag doesn't exist, default to disabled
        setState({ enabled: false, config: {}, loading: false })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any
      setState({
        enabled: row.enabled ?? false,
        config: (row.config as Record<string, unknown>) ?? {},
        loading: false,
      })
    }


    fetchFlag()

    // ── Realtime Subscription ─────────────────────────────────────────────────
    const channel = supabase
      .channel(`feature_flag:${key}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feature_flags',
          filter: `key=eq.${key}`,
        },
        (payload) => {
          if (cancelled) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated = payload.new as any
          setState({
            enabled: updated.enabled ?? false,
            config: (updated.config as Record<string, unknown>) ?? {},
            loading: false,
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [key])

  return state
}
