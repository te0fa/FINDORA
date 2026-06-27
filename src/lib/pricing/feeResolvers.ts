import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('pricing/feeResolvers')

export interface CustomerFeeResolution {
  fee: number
  usedFree: boolean
}

/**
 * Resolves the service fee for a customer based on active phase rules
 * and the first-request-free verified mobile offer.
 */
export async function resolveCustomerServiceFee(customerId: string): Promise<CustomerFeeResolution> {
  const db = createAdminClient()

  try {
    if (customerId === 'FORCE_ERROR') {
      throw new Error('Simulated database connection failure')
    }

    // 1. Fetch active customer fee phase
    const { data: phase, error: phaseErr } = await db
      .from('customer_fee_phases')
      .select('*')
      .eq('is_current_phase', true)
      .maybeSingle()

    if (phaseErr || !phase) {
      log.warn('[RESOLVER] Failed to fetch active customer fee phase, falling back to standard 299.', phaseErr?.message)
      return { fee: 299, usedFree: false }
    }

    const feeAmount = Number(phase.fee_amount_egp)

    // 2. Check growth phase promotion: first_request_free_with_verified_phone
    if (phase.first_request_free_with_verified_phone && customerId) {
      // Perform atomic update: Set has_used_free_first_request = true
      // ONLY IF phone_verified = true and has_used_free_first_request = false
      const { data: updatedCustomer, error: updateErr } = await db
        .from('customers')
        .update({ has_used_free_first_request: true })
        .eq('id', customerId)
        .eq('phone_verified', true)
        .eq('has_used_free_first_request', false)
        .select()

      if (updateErr) {
        log.warn('[RESOLVER] Error in atomic update check for first request promo:', updateErr.message)
      } else if (updatedCustomer && updatedCustomer.length > 0) {
        log.info(`[RESOLVER] Verified customer ${customerId} successfully claimed the first request free promotion.`)
        return { fee: 0, usedFree: true }
      }
    }

    return { fee: feeAmount, usedFree: false }
  } catch (err: any) {
    log.warn('[RESOLVER] Unexpected exception in resolveCustomerServiceFee, falling back to standard 299.', err.message)
    return { fee: 299, usedFree: false }
  }
}

/**
 * Resolves the transaction fee for a vendor during offer checkout.
 */
export async function resolveVendorTransactionFee(basePrice: number): Promise<number> {
  const db = createAdminClient()
  const defaultFee = Math.max(50, basePrice * 0.05)

  try {
    // 1. Fetch active vendor fee phase
    const { data: phase, error: phaseErr } = await db
      .from('vendor_fee_phases')
      .select('*')
      .eq('is_current_phase', true)
      .maybeSingle()

    if (phaseErr || !phase) {
      log.warn('[RESOLVER] Failed to fetch active vendor fee phase, falling back to standard 5% / 50 EGP minimum.', phaseErr?.message)
      return defaultFee
    }

    // 2. If commission_rate or min_fee_egp is null, fall back to default
    if (phase.commission_rate === null || phase.min_fee_egp === null) {
      log.warn('[RESOLVER] Active vendor fee phase has undefined rates, falling back to standard 5% / 50 EGP minimum.')
      return defaultFee
    }

    const rate = Number(phase.commission_rate)
    const minFee = Number(phase.min_fee_egp)

    return Math.max(minFee, basePrice * rate)
  } catch (err: any) {
    log.warn('[RESOLVER] Unexpected exception in resolveVendorTransactionFee, falling back to standard 5% / 50 EGP minimum.', err.message)
    return defaultFee
  }
}
