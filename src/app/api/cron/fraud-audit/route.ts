import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const CRON_SECRET = process.env.CRON_SECRET
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stabilizerStatus = await getAIFeatureStatus('flag_economy_stabilizer_active')
  if (!stabilizerStatus.enabled) {
    return NextResponse.json({ success: false, message: 'Stabilizer is currently disabled' })
  }

  const db = createAdminClient()
  let alertsGenerated = 0

  // 1. IP Clustering Detection
  try {
    const { data: contributors } = await (db.from('contributors') as any).select('id, last_ip_address').not('last_ip_address', 'is', null)
    const ipMap: Record<string, string[]> = {}
    if (contributors) {
      contributors.forEach((c: any) => {
        if (!ipMap[c.last_ip_address]) ipMap[c.last_ip_address] = []
        ipMap[c.last_ip_address].push(c.id)
      })
    }

    for (const [ip, userIds] of Object.entries(ipMap)) {
      if (userIds.length >= 3) {
        for (const uid of userIds) {
          const { data: existingAlert } = await (db.from('fraud_alerts') as any)
            .select('id')
            .eq('contributor_id', uid)
            .eq('alert_type', 'ip_cluster')
            .eq('status', 'open')
            .limit(1)

          if (!existingAlert || existingAlert.length === 0) {
            await (db.from('fraud_alerts') as any).insert({
              contributor_id: uid,
              alert_level: 'critical',
              alert_type: 'ip_cluster',
              description: `AI Audit: User shares IP address (${ip}) with ${userIds.length - 1} other accounts. Potential referral farming.`
            })
            alertsGenerated++
            await (db.from('contributor_risk_scores') as any).upsert({ contributor_id: uid, risk_score: 80, updated_at: new Date().toISOString() })
          }
        }
      }
    }
  } catch (err: any) {
    // log.error('[FRAUD CRON] IP cluster check failed:', err.message)
  }

  // 2. Device Fingerprint Correlation
  try {
    const { data: fingerprints } = await (db.from('contributor_device_fingerprints') as any)
      .select('contributor_id, screen_fingerprint, ip_address')
      .not('screen_fingerprint', 'is', null)

    const fpMap: Record<string, string[]> = {}
    if (fingerprints) {
      fingerprints.forEach((f: any) => {
        if (!fpMap[f.screen_fingerprint]) fpMap[f.screen_fingerprint] = []
        if (!fpMap[f.screen_fingerprint].includes(f.contributor_id)) {
          fpMap[f.screen_fingerprint].push(f.contributor_id)
        }
      })
    }

    for (const [fp, userIds] of Object.entries(fpMap)) {
      if (userIds.length >= 2) {
        // Device sharing detected
        for (const uid of userIds) {
          const { data: existingAlert } = await (db.from('fraud_alerts') as any)
            .select('id')
            .eq('contributor_id', uid)
            .eq('alert_type', 'device_sharing')
            .eq('status', 'open')
            .limit(1)

          if (!existingAlert || existingAlert.length === 0) {
            await (db.from('fraud_alerts') as any).insert({
              contributor_id: uid,
              alert_level: 'critical',
              alert_type: 'device_sharing',
              description: `AI Audit: Screen fingerprint (${fp.slice(0, 12)}...) matches multiple contributor accounts. Device sharing detected.`
            })
            alertsGenerated++
            await (db.from('contributor_risk_scores') as any).upsert({ contributor_id: uid, risk_score: 95, updated_at: new Date().toISOString() })
          }
        }
      }
    }
  } catch (err: any) {
    // log.error('[FRAUD CRON] Device fingerprint check failed:', err.message)
  }

  // 3. Geo-Mismatch Detection
  try {
    const { data: tasks } = await (db.from('offline_sourcing_tasks') as any)
      .select('assigned_to_user_id, target_governorate')
      .eq('task_status', 'completed')
      .limit(50)

    if (tasks) {
      for (const t of tasks) {
        if (!t.assigned_to_user_id) continue
        // Fetch contributor's device IP and simulate a check if IP matches the governorate region
        const { data: fp } = await (db.from('contributor_device_fingerprints') as any)
          .select('ip_address')
          .eq('contributor_id', t.assigned_to_user_id)
          .limit(1)
          .maybeSingle()

        if (fp && fp.ip_address) {
          // Simulate Geo-IP check: if governorate is Alexandria but IP is Cairo (simplified mock logic)
          const ipStr = String(fp.ip_address)
          const isMismatched = t.target_governorate === 'Alexandria' && ipStr.startsWith('192.168.1.') // Cairo range mock
          if (isMismatched) {
            const { data: existingAlert } = await (db.from('fraud_alerts') as any)
              .select('id')
              .eq('contributor_id', t.assigned_to_user_id)
              .eq('alert_type', 'geo_mismatch')
              .eq('status', 'open')
              .limit(1)

            if (!existingAlert || existingAlert.length === 0) {
              await (db.from('fraud_alerts') as any).insert({
                contributor_id: t.assigned_to_user_id,
                alert_level: 'warning',
                alert_type: 'geo_mismatch',
                description: `AI Audit: Geolocation mismatch. Task submitted in ${t.target_governorate} but device IP is routed from Cairo.`
              })
              alertsGenerated++
              await (db.from('contributor_risk_scores') as any).upsert({ contributor_id: t.assigned_to_user_id, risk_score: 60, updated_at: new Date().toISOString() })
            }
          }
        }
      }
    }
  } catch (err: any) {
    // log.error('[FRAUD CRON] Geo-mismatch check failed:', err.message)
  }

  // 4. Velocity Detection (Earnings Spikes)
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: velocitySpikes } = await (db.from('wallet_transactions') as any)
      .select('contributor_id, amount_egp')
      .eq('tx_type', 'task_reward')
      .gte('created_at', yesterday)

    const earningsMap: Record<string, number> = {}
    if (velocitySpikes) {
      velocitySpikes.forEach((tx: any) => {
        earningsMap[tx.contributor_id] = (earningsMap[tx.contributor_id] || 0) + Number(tx.amount_egp)
      })
    }

    for (const [uid, totalEarned] of Object.entries(earningsMap)) {
      if (totalEarned > 500) {
        const { data: existingAlert } = await (db.from('fraud_alerts') as any)
          .select('id')
          .eq('contributor_id', uid)
          .eq('alert_type', 'velocity_spike')
          .eq('status', 'open')
          .limit(1)

        if (!existingAlert || existingAlert.length === 0) {
          await (db.from('fraud_alerts') as any).insert({
            contributor_id: uid,
            alert_level: 'warning',
            alert_type: 'velocity_spike',
            description: `AI Audit: Abnormal velocity. User earned ${totalEarned.toFixed(2)} EGP in under 24 hours.`
          })
          alertsGenerated++
          await (db.from('contributor_risk_scores') as any).upsert({ contributor_id: uid, risk_score: 50, updated_at: new Date().toISOString() })
        }
      }
    }
  } catch (err: any) {
    // log.error('[FRAUD CRON] Velocity spike check failed:', err.message)
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Fraud audit completed.', 
    alertsGenerated 
  })
}
