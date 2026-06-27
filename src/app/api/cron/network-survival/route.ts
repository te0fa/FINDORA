import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

// This endpoint is hit by a Cron Job (e.g. Vercel Cron)
// To keep it secure, it uses the Service Role Key since it runs without a user context
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stabilizerStatus = await getAIFeatureStatus('flag_economy_stabilizer_active')
    if (!stabilizerStatus.enabled) {
      return NextResponse.json({ success: false, message: 'Stabilizer is currently disabled' })
    }

    const supabase = createAdminClient() as any

    // 1. Fetch Config
    const { data: configRow } = await supabase
      .from('economy_config')
      .select('value')
      .eq('config_key', 'network_survival_config')
      .single()

    const config = configRow?.value || {
      activity_window_days: 7,
      decay_tiers: [
        { min_active: 10, multiplier: 1.0 },
        { min_active: 7, multiplier: 0.8 },
        { min_active: 5, multiplier: 0.6 },
        { min_active: 3, multiplier: 0.4 },
        { min_active: 0, multiplier: 0.2 }
      ],
      notifications: { in_app_enabled: true }
    }

    const windowDays = config.activity_window_days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - windowDays)
    const cutoffIso = cutoffDate.toISOString()

    // 2. Fetch all contributors who have referrals
    // To do this properly, we need to join contributor_referrals and contributors
    const { data: contributors } = await supabase
      .from('contributors')
      .select('id, full_name, active_referrals, total_referrals, decay_multiplier, network_health_score')
      .gt('total_referrals', 0)

    if (!contributors) {
      return NextResponse.json({ message: 'No contributors found' })
    }

    let updatedCount = 0

    // 3. Process each contributor
    for (const c of contributors) {
      // Find how many of their referrals have completed a task recently
      const { count: activeCount } = await supabase
        .from('contributor_referrals')
        .select('referred_id', { count: 'exact', head: true })
        .eq('referrer_id', c.id)
        .eq('status', 'active') // Assuming they reached active status
        // Normally we'd check the referred user's last_task_completed_at.
        // Let's do a join query: count where referred contributor has last_task_completed_at >= cutoffIso
        
      // For simplicity in Supabase REST without custom RPC, we can just fetch the referred IDs
      const { data: referrals } = await supabase
        .from('contributor_referrals')
        .select('referred_id')
        .eq('referrer_id', c.id)

      if (!referrals || referrals.length === 0) continue

      const referredIds = referrals.map((r: any) => r.referred_id)

      // Count how many of these users completed a task recently
      const { data: activeUsers } = await supabase
        .from('contributors')
        .select('id')
        .in('id', referredIds)
        .gte('last_task_completed_at', cutoffIso)

      const realActiveCount = activeUsers?.length || 0
      const healthScore = c.total_referrals > 0 ? (realActiveCount / c.total_referrals) : 0

      // Determine Multiplier
      let newMultiplier = 0.2 // default lowest
      for (const tier of config.decay_tiers) {
        if (realActiveCount >= tier.min_active) {
          newMultiplier = tier.multiplier
          break
        }
      }

      // 4. Check if multiplier dropped
      if (newMultiplier < c.decay_multiplier && config.notifications.in_app_enabled) {
        // Multiplier dropped, they are losing passive income! Alert them.
        const droppedTiers = c.decay_multiplier - newMultiplier
        const messageEn = `Warning: Your active network dropped to ${realActiveCount} members. Your passive income multiplier has decayed to ${newMultiplier}x. Reactivate your network to recover your earnings!`
        const messageAr = `تحذير: شبكتك النشطة انخفضت إلى ${realActiveCount} مندوبين. نسبة أرباحك السلبية انخفضت إلى ${newMultiplier}x. شجع شبكتك للعمل لتعود أرباحك للحد الأقصى!`

        await supabase.from('contributor_notifications').insert({
          contributor_id: c.id,
          message_en: messageEn,
          message_ar: messageAr,
          type: 'warning'
        })
      } else if (newMultiplier > c.decay_multiplier && config.notifications.in_app_enabled) {
        // Multiplier increased, they recovered!
        const messageEn = `Great job! Your active network increased to ${realActiveCount} members. Your passive income multiplier is now ${newMultiplier}x.`
        const messageAr = `عمل ممتاز! شبكتك النشطة زادت إلى ${realActiveCount} مندوبين. نسبة أرباحك السلبية أصبحت الآن ${newMultiplier}x.`

        await supabase.from('contributor_notifications').insert({
          contributor_id: c.id,
          message_en: messageEn,
          message_ar: messageAr,
          type: 'success'
        })
      }

      // Update the contributor
      if (
        c.decay_multiplier !== newMultiplier || 
        c.network_health_score !== healthScore || 
        c.active_referrals !== realActiveCount
      ) {
        await supabase
          .from('contributors')
          .update({
            decay_multiplier: newMultiplier,
            network_health_score: healthScore,
            active_network_count: realActiveCount // Added to schema
          })
          .eq('id', c.id)
        
        updatedCount++
      }
    }

    return NextResponse.json({ success: true, processed: contributors.length, updated: updatedCount })
  } catch (err: any) {
    // log.error('Network survival cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
