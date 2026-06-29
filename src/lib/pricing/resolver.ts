// src/lib/pricing/resolver.ts

import { createAdminClient } from '@/lib/dal/customers'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('pricing/resolver')

export interface ResolvedPricing {
  service_type: string
  status: 'active' | 'scheduled' | 'expired' | 'inactive' | 'fallback'
  price: number
  original_price: number | null
  is_promo: boolean
  currency: string
  starts_at: string | null
  expires_at: string | null
  discount_percentage: number
  promo_label_en?: string | null
  promo_label_ar?: string | null
  /** Pricing model: 'flat' = fixed price, 'percentage' = % of deal, 'hybrid' = base fee + % */
  pricing_model?: 'flat' | 'percentage' | 'hybrid'
}

// Temporary/Baseline hardcoded fallbacks to guarantee 100% pricing presence
// These values are used ONLY when the database has no pricing records.
// The actual pricing is always resolved from the `service_pricing_versions` table.
export const BASELINE_PRICING: Record<string, { price: number; original_price: number | null }> = {
  everyday_purchase: { price: 0, original_price: 299 },
  high_value_asset: { price: 1500, original_price: 1500 },
  high_value_deals: { price: 1500, original_price: 1500 },
  project_supply: { price: 2500, original_price: 2500 },
  projects_supplies: { price: 2500, original_price: 2500 }
};

/**
 * Single backend resolver to resolve current service pricing.
 * It strictly evaluates time-based lifecycles, calculates snapshots, and enforces safe fallbacks.
 */
export async function resolvePricing(serviceType: string, client?: any): Promise<ResolvedPricing> {
  const now = new Date()
  const nowIso = now.toISOString()
  
  // Align service type names
  let alignedKey = serviceType
  if (serviceType === 'high_value_deals') alignedKey = 'high_value_asset'
  if (serviceType === 'projects_supplies') alignedKey = 'project_supply'

  // Diagnostic logging setup (temporarily exposed in dev mode)
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    log.info(`[PricingResolver] Current server timestamp: ${nowIso}`)
    log.info(`[PricingResolver] Requesting resolved pricing for: ${serviceType} (mapped: ${alignedKey})`)
  }

  try {
    const supabase = client || await createAdminClient()
    
    // Fetch only non-deleted pricing versions
    const { data: pricingList, error } = await supabase
      .from('service_pricing_versions')
      .select('*')
      .eq('service_key', alignedKey)
      .is('deleted_at', null)
      .order('version_no', { ascending: false })

    if (error) {
      log.error(`[PricingResolver Error] Failed to fetch from DB:`, error.message)
      return getFallback(alignedKey, 'fallback')
    }

    if (!pricingList || pricingList.length === 0) {
      if (isDev) log.info(`[PricingResolver] No pricing versions found in DB for: ${alignedKey}. Applying baseline fallbacks.`)
      return getFallback(alignedKey, 'fallback')
    }

    // Evaluate records dynamically based on strict v2 lifecycle definitions
    const resolvedVersions = pricingList.map((row: any) => {
      const startsAt = row.starts_at ? new Date(row.starts_at) : null
      const expiresAt = row.ends_at || row.expires_at ? new Date(row.ends_at || row.expires_at) : null
      const isActiveFlag = row.is_active === true

      let status: 'active' | 'scheduled' | 'expired' | 'inactive' | 'fallback' = 'active'

      if (!isActiveFlag) {
        status = 'inactive'
      } else if (expiresAt && expiresAt <= now) {
        status = 'expired'
      } else if (startsAt && startsAt > now) {
        status = 'scheduled'
      }

      if (isDev) {
        log.info(`[PricingResolver Row Eval] Version: ${row.version_no}, status: ${status}, is_active_flag: ${isActiveFlag}, starts_at: ${row.starts_at}, expires_at: ${row.ends_at || row.expires_at}`)
      }

      return {
        row,
        status,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        starts_at: startsAt ? startsAt.toISOString() : null
      }
    })

    // Prioritize active pricing version
    const activeVersion = resolvedVersions.find((v: any) => v.status === 'active')

    if (activeVersion) {
      const { row, expires_at, starts_at } = activeVersion
      const currentPrice = Number(row.current_price)
      
      // Intelligent traceback fallback for original price
      let originalPrice = row.original_price ? Number(row.original_price) : null
      if (!originalPrice) {
        // Look back for the latest standard non-promo version (where original_price equals current_price and no promo labels)
        const standardVersion = resolvedVersions.find((v: any) => {
          return !v.row.promo_label_en && !v.row.promo_label_ar && v.row.original_price === v.row.current_price
        })
        if (standardVersion) {
          originalPrice = Number(standardVersion.row.current_price)
        } else {
          // If no previous version in DB, fall back to baseline hardcoded value
          originalPrice = BASELINE_PRICING[alignedKey]?.price || currentPrice
        }
      }
      
      // Trust ONLY active promo record having a real promo label, DO NOT infer from prices
      const isPromo = !!(row.promo_label_en || row.promo_label_ar)
      const discountPercentage = isPromo && originalPrice 
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0

      log.info("[PRICING_SOURCE]", { service_type: alignedKey, status: 'active', is_promo: isPromo })

      return {
        service_type: alignedKey,
        status: 'active',
        price: currentPrice,
        original_price: originalPrice,
        is_promo: isPromo,
        currency: row.currency_code || 'EGP',
        starts_at,
        expires_at,
        discount_percentage: discountPercentage,
        promo_label_en: row.promo_label_en,
        promo_label_ar: row.promo_label_ar
      }
    }

    // Fallback logic if no active version is currently found:
    // Fall back to the newest valid pricing version
    const newestRecord = resolvedVersions[0]
    if (newestRecord) {
      const { row, starts_at, status } = newestRecord
      const originalPrice = row.original_price ? Number(row.original_price) : Number(row.current_price)
      
      log.info("[PRICING_SOURCE]", { service_type: alignedKey, status, is_promo: false })

      return {
        service_type: alignedKey,
        status: status === 'scheduled' ? 'scheduled' : status === 'expired' ? 'expired' : 'fallback',
        price: originalPrice,
        original_price: originalPrice,
        is_promo: false,
        currency: row.currency_code || 'EGP',
        starts_at,
        expires_at: newestRecord.expires_at,
        discount_percentage: 0,
        promo_label_en: row.promo_label_en,
        promo_label_ar: row.promo_label_ar
      }
    }

    return getFallback(alignedKey, 'fallback')
  } catch (err: any) {
    log.error(`[PricingResolver Exception] Critical error resolving pricing:`, err.message)
    return getFallback(alignedKey, 'fallback')
  }
}

/**
 * Returns baseline hardcoded fallback pricing to guarantee 100% uptime.
 */
function getFallback(serviceKey: string, status: 'active' | 'scheduled' | 'expired' | 'inactive' | 'fallback'): ResolvedPricing {
  const baseline = BASELINE_PRICING[serviceKey] || { price: 299, original_price: 299 }
  return {
    service_type: serviceKey,
    status,
    price: baseline.price,
    original_price: baseline.original_price,
    is_promo: false,
    currency: 'EGP',
    starts_at: null,
    expires_at: null,
    discount_percentage: 0
  }
}
