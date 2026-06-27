// src/lib/intelligence/margin-balancer.ts
import { createClient } from '@/lib/supabase/server'

interface MarginCalculationResult {
  customerPriceEgp: number
  contributorPayoutEgp: number
  platformProfitEgp: number
  marginPct: number
}

/**
 * AI Profit Optimization Engine (Margin Balancer)
 * Calculates the split between the platform and the contributor.
 * Standard margin is 30%, but dynamically adjusts from 10% to 50% based on demand/supply.
 */
export async function calculateDynamicMargin(
  customerBudgetEgp: number,
  taskType: string,
  locationZone: string,
  priority: number
): Promise<MarginCalculationResult> {
  const supabase = await createClient()

  let baseMarginPct = 30 // Default 30% take rate

  // 1. Task Type Adjustments
  // Data intelligence or premium tasks might have higher margins
  if (taskType === 'market_intel') baseMarginPct += 10
  if (taskType === 'price_quote') baseMarginPct -= 5 // Keep quotes cheap to drive volume

  // 2. Supply vs Demand Check (Live calculation)
  // Find how many open tasks exist in this zone vs how many active contributors
  const { count: openTasks } = await supabase
    .from('platform_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .contains('location_data', { zone: locationZone })

  // Find how many contributors claimed a task in the last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: activeContributors } = await supabase
    .from('task_claims')
    .select('contributor_id', { count: 'exact', head: true })
    .gte('claimed_at', twentyFourHoursAgo)

  const demand = openTasks || 0
  const supply = activeContributors || 1 // Avoid divide by zero

  const demandSupplyRatio = demand / supply

  // 3. Margin Balancing Logic
  if (demandSupplyRatio > 3) {
    // High demand, low supply -> We must incentivize contributors
    // Lower our margin to increase their payout
    baseMarginPct -= 10
  } else if (demandSupplyRatio < 0.5) {
    // Low demand, high supply -> Contributors are hungry
    // We can safely take a higher margin
    baseMarginPct += 10
  }

  // 4. Priority overrides (If a task is urgent, we drop margins to get it done fast)
  if (priority > 10) {
    baseMarginPct -= 5
  }

  // 5. Hard Limits (Protect unit economics)
  const MIN_MARGIN = 10 // Never go below 10%
  const MAX_MARGIN = 60 // Never go above 60%
  
  let finalMarginPct = Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, baseMarginPct))

  // 6. Calculate absolute values
  const platformProfitEgp = (customerBudgetEgp * finalMarginPct) / 100
  const contributorPayoutEgp = customerBudgetEgp - platformProfitEgp

  return {
    customerPriceEgp: customerBudgetEgp,
    contributorPayoutEgp: Number(contributorPayoutEgp.toFixed(2)),
    platformProfitEgp: Number(platformProfitEgp.toFixed(2)),
    marginPct: finalMarginPct
  }
}
