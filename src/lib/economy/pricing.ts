/**
 * FINDORA Economy OS — Pricing Resolver Engine
 * Centralizes how much clients pay and how the money is distributed.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { getEconomyConfig } from '@/lib/contributors/config'

export interface PricingResolution {
  serviceType: string
  originalPriceEgp: number
  finalPriceEgp: number
  discountAppliedPct: number
  distribution: {
    contributorPoolEgp: number
    platformEgp: number
    reserveEgp: number
  }
}

export async function resolveServicePrice(serviceType: string): Promise<PricingResolution | null> {
  const db = createAdminClient()

  // 1. Fetch Pricing Rule
  const { data: rule, error } = await (db as any).from('pricing_rules')
    .select('*')
    .eq('service_type', serviceType)
    .single()

  if (error || !rule) {
    console.error(`[PricingEngine] Service type '${serviceType}' not found in pricing_rules.`)
    return null
  }

  let finalPrice = Number(rule.base_price_egp)
  let discountPct = 0

  // 2. Check if there is an active offer/discount
  const now = new Date()
  const validFrom = rule.valid_from ? new Date(rule.valid_from) : null
  const validTo = rule.valid_to ? new Date(rule.valid_to) : null

  let isOfferActive = false
  if (rule.active_offer_percentage && Number(rule.active_offer_percentage) > 0) {
    isOfferActive = true
    // If dates are provided, ensure we are within the window
    if (validFrom && now < validFrom) isOfferActive = false
    if (validTo && now > validTo) isOfferActive = false
  }

  // 3. Apply Discount & Bounds Checking
  if (isOfferActive && !rule.override_by_admin) {
    discountPct = Number(rule.active_offer_percentage)
    finalPrice = finalPrice * (1 - (discountPct / 100))
  }

  // Ensure bounds
  if (rule.min_price_egp && finalPrice < Number(rule.min_price_egp)) {
    finalPrice = Number(rule.min_price_egp)
  }
  if (rule.max_price_egp && finalPrice > Number(rule.max_price_egp)) {
    finalPrice = Number(rule.max_price_egp)
  }

  // 4. Fetch Revenue Split Configuration
  const defaultSplit = {
    contributor_pool_pct: 0.70,
    platform_pct: 0.20,
    reserve_pct: 0.10
  }
  const splitConfig = await getEconomyConfig('revenue_split') || defaultSplit

  const contributorPoolEgp = Number((finalPrice * splitConfig.contributor_pool_pct).toFixed(2))
  const platformEgp = Number((finalPrice * splitConfig.platform_pct).toFixed(2))
  const reserveEgp = Number((finalPrice * splitConfig.reserve_pct).toFixed(2))

  return {
    serviceType,
    originalPriceEgp: Number(rule.base_price_egp),
    finalPriceEgp: finalPrice,
    discountAppliedPct: discountPct,
    distribution: {
      contributorPoolEgp,
      platformEgp,
      reserveEgp
    }
  }
}
