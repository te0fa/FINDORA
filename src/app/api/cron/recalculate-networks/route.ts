import { NextRequest, NextResponse } from 'next/server'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

export async function POST(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET
  // Auth gate
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stabilizerStatus = await getAIFeatureStatus('flag_economy_stabilizer_active')
  if (!stabilizerStatus.enabled) {
    return NextResponse.json({ success: false, message: 'Stabilizer is currently disabled' })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const { runEconomyStabilizer } = await import('@/lib/contributors/stabilizer')
  const { syncChallengeProgress, syncBadges, createDecayAlert } = await import('@/lib/contributors/gamification')

  const db = createAdminClient()
  const results = {
    stabilizer: null as any,
    contributors_processed: 0,
    errors: [] as string[]
  }

  try {
    // 1. Run economy stabilizer
    results.stabilizer = await runEconomyStabilizer()
    // log.info('[CRON] Stabilizer:', results.stabilizer.status, 'growth:', results.stabilizer.growth_pct + '%')
  } catch (e: any) {
    results.errors.push(`stabilizer: ${e.message}`)
  }

  try {
    // 2. Fetch all active contributors
    const { data: contributors, error } = await (db as any).from('contributors')
      .select('id, referral_count, active_referral_count')
      .in('status', ['active', 'approved'])
      .limit(500) // process in batches

    if (error) throw new Error(error.message)

    for (const contributor of (contributors ?? []) as any[]) {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
        let activeCount = contributor.active_referral_count
        try {
          const { count } = await db
            .from('contributor_referrals' as any)
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', contributor.id)
            .eq('status', 'active')
            .gte('first_activity_at', thirtyDaysAgo)
          if (count !== null) activeCount = count
        } catch (err) {
          // log.error('[CRON] Failed to query active referrals:', err)
        }

        const newActiveCount = activeCount
        const previousActive = contributor.active_referral_count

        // Update contributor if changed
        if (newActiveCount !== previousActive) {
          await (db as any).from('contributors').update({
            active_referral_count: newActiveCount
          }).eq('id', contributor.id)

          // Decay alert if count dropped
          if (newActiveCount < previousActive) {
            await createDecayAlert(contributor.id, newActiveCount, previousActive)
          }
        }

        // Sync challenge progress and badges
        await Promise.all([
          syncChallengeProgress(contributor.id, newActiveCount),
          syncBadges(contributor.id, newActiveCount)
        ])

        results.contributors_processed++
      } catch (e: any) {
        results.errors.push(`contributor ${contributor.id}: ${e.message}`)
      }
    }
  } catch (e: any) {
    results.errors.push(`network_loop: ${e.message}`)
  }

  const isFallback = results.stabilizer?.action === 'error_fallback'
  const hasErrors = results.errors.length > 0

  return NextResponse.json({
    success: !isFallback && !hasErrors,
    warning: isFallback,
    message: isFallback ? "fn_run_economy_stabilizer call failed, using safe default multiplier" : undefined,
    ran_at: new Date().toISOString(),
    ...results
  })
}

// GET not allowed
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
