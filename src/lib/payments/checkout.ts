import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymobCheckout, PAYMOB_AVAILABLE } from './paymob'
import { createLogger } from '@/lib/utils/logger'
import { resolveVendorTransactionFee } from '@/lib/pricing/feeResolvers'
const log = createLogger('payments/checkout')

export interface CheckoutSessionParams {
  offerId: string
  customerId?: string
  customerPhone: string
  customerFirstName?: string
  customerLastName?: string
  customerEmail?: string
  locale: string
}

export interface CheckoutSessionResult {
  success: boolean
  checkoutUrl?: string
  sessionId?: string
  totalEgp?: number
  isSimulated?: boolean
  error?: string
}

/**
 * Initializes a checkout session for a customer accepting a contributor's offer.
 * Uses Paymob when PAYMOB_API_KEY is configured, falls back to simulation.
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
  const db = createAdminClient()

  try {
    // 1. Fetch the Offer
    const { data: offerRaw, error: offerError } = await db
      .from('contributor_submissions')
      .select('id, price_reported, product_id, contributor_id')
      .eq('id', params.offerId)
      .maybeSingle()

    const offer = offerRaw as { id: string; price_reported: number; product_id: string; contributor_id: string } | null

    if (offerError || !offer) {
      return { success: false, error: 'Offer not found or no longer available.' }
    }

    // 2. Fetch the Request to ensure it's still open
    const { data: requestRaw, error: reqError } = await db
      .from('customer_requests')
      .select('id, status, product_name_en')
      .eq('id', offer.product_id)
      .maybeSingle()

    const request = requestRaw as { id: string; status: string; product_name_en?: string } | null

    if (reqError || !request || request.status !== 'open') {
      return { success: false, error: 'Request is already closed or fulfilled.' }
    }

    // 3. Calculate Platform Fee (Dynamic Margin Engine)
    const basePrice = Number(offer.price_reported)
    let platformFee = Math.max(50, basePrice * 0.05) // Fallback: 5% or 50 EGP minimum
    try {
      platformFee = await resolveVendorTransactionFee(basePrice)
    } catch (err: any) {
      log.warn('[CHECKOUT] Error resolving vendor transaction fee (using 5%/50 EGP fallback):', err.message)
    }
    const totalEgp = basePrice + platformFee
    const amountCents = Math.round(totalEgp * 100)

    // 4. Generate internal session ID
    const sessionId = `chk_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // 5. Use Paymob if available, otherwise simulate
    if (PAYMOB_AVAILABLE) {
      const paymobResult = await createPaymobCheckout({
        amountCents,
        orderId: request.id, // Use request ID as the Paymob merchant_order_id
        customerFirstName: params.customerFirstName || 'Customer',
        customerLastName: params.customerLastName || 'FINDORA',
        customerEmail: params.customerEmail || 'customer@findora.app',
        customerPhone: params.customerPhone,
        items: [
          {
            name: request.product_name_en || 'FINDORA Service',
            description: `Order #${sessionId}`,
            amount_cents: amountCents,
            quantity: 1,
          },
        ],
      })

      if (!paymobResult.success) {
        // Fall back to simulation on Paymob failure
        log.warn('[CHECKOUT] Paymob failed, falling back to simulation:', paymobResult.error)
      } else {
        return {
          success: true,
          sessionId,
          checkoutUrl: paymobResult.paymentUrl,
          totalEgp,
          isSimulated: false,
        }
      }
    }

    // Simulation mode (dev or Paymob fallback)
    const checkoutUrl = `/${params.locale}/customer/checkout/simulate?sessionId=${sessionId}&amount=${totalEgp}&offerId=${offer.id}`
    return {
      success: true,
      sessionId,
      checkoutUrl,
      totalEgp,
      isSimulated: true,
    }

  } catch (err: any) {
    log.error('[CHECKOUT ENGINE] Error:', err)
    return { success: false, error: 'Internal system error during checkout initialization.' }
  }
}
