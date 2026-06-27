/**
 * FINDORA Economy OS — Configuration & Simulation Engine
 * Interfaces with `economy_config` to provide dynamic multipliers and thresholds.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface EconomyConfigRecord {
  config_key: string
  value: any
  description_en: string | null
  description_ar: string | null
  is_system_controlled: boolean
}

/**
 * Fetch a specific configuration key
 */
export async function getEconomyConfig(key: string): Promise<any | null> {
  const db = createAdminClient()
  const { data, error } = await (db.from('economy_config') as any)
    .select('value')
    .eq('config_key', key)
    .single()

  if (error || !data) return null
  return data.value
}

/**
 * Fetch all economy configurations
 */
export async function getAllEconomyConfigs(): Promise<EconomyConfigRecord[]> {
  const db = createAdminClient()
  const { data, error } = await (db.from('economy_config') as any)
    .select('*')
    .order('config_key', { ascending: true })

  if (error || !data) return []
  return data
}

/**
 * Update an economy configuration
 */
export async function updateEconomyConfig(
  key: string,
  value: any,
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient()
  const { error } = await (db.from('economy_config') as any)
    .update({ value, updated_by_staff_id: staffId, updated_at: new Date().toISOString() })
    .eq('config_key', key)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Simulation Engine
 * Projects the financial impact of changing configurations based on recent averages.
 * E.g., Changing the base multiplier for "casual" users from 0.8 to 1.0.
 */
export async function simulateImpact(
  configKey: string,
  oldValue: any,
  newValue: any
): Promise<{ impactPct: number; description: string; warningLevel: 'none' | 'low' | 'high' }> {
  const db = createAdminClient()

  if (configKey === 'role_multipliers') {
    // Project impact on total payouts
    // Fetch last 7 days of transactions to calculate average distribution
    const { data: recentTx } = await (db.from('wallet_transactions') as any)
      .select('amount_egp, metadata')
      .eq('tx_type', 'task_reward')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (!recentTx || recentTx.length === 0) {
      return { impactPct: 0, description: 'Not enough recent transaction data to simulate.', warningLevel: 'none' }
    }

    let projectedTotalOld = 0
    let projectedTotalNew = 0

    recentTx.forEach((tx: any) => {
      const baseAmount = tx.metadata?.base_amount_egp || tx.amount_egp
      const role = tx.metadata?.role || 'casual'
      
      const oldMult = oldValue[role] ?? 1.0
      const newMult = newValue[role] ?? 1.0

      projectedTotalOld += baseAmount * oldMult
      projectedTotalNew += baseAmount * newMult
    })

    const impactPct = projectedTotalOld > 0 
      ? ((projectedTotalNew - projectedTotalOld) / projectedTotalOld) * 100 
      : 0

    const warningLevel = Math.abs(impactPct) > 15 ? 'high' : (Math.abs(impactPct) > 5 ? 'low' : 'none')

    return {
      impactPct,
      description: `Projected ${impactPct > 0 ? 'increase' : 'decrease'} of ${Math.abs(impactPct).toFixed(1)}% in weekly task reward payouts.`,
      warningLevel
    }
  }

  if (configKey === 'risk_thresholds') {
    return {
      impactPct: 0,
      description: 'Changes to risk thresholds take effect immediately. Lowering thresholds will increase the manual HR review queue.',
      warningLevel: 'low'
    }
  }

  if (configKey === 'stabilizer_config') {
    return {
      impactPct: 0,
      description: 'Changes to the stabilizer bounds will affect how quickly the system throttles viral growth.',
      warningLevel: 'high'
    }
  }

  return { impactPct: 0, description: 'Impact simulation not configured for this key.', warningLevel: 'none' }
}
