import crypto from 'node:crypto'

export interface CanonicalRequestPayload {
  customerId: string
  productName: string
  category?: string
  targetLocation?: string
  maxPrice?: number | string | null
  notes?: string
  isBusiness?: boolean
  companyName?: string
  crNumber?: string
  taxNumber?: string
  quantity?: string | number
  sourceType?: string
  aiConfidence?: number | string | null
}

/**
 * Computes a deterministic SHA-256 fingerprint of the canonical business fields
 * for a sourcing request. Unstable properties (e.g. Turnstile tokens, IPs, random UUIDs,
 * timestamps, and the idempotency key itself) are strictly excluded.
 */
export function computeCanonicalPayloadHash(payload: CanonicalRequestPayload): string {
  const parsedPrice =
    payload.maxPrice !== undefined && payload.maxPrice !== null && payload.maxPrice !== ''
      ? Number(payload.maxPrice)
      : null

  const parsedConfidence =
    payload.aiConfidence !== undefined && payload.aiConfidence !== null && payload.aiConfidence !== ''
      ? Number(payload.aiConfidence)
      : null

  const canonical = {
    customer_id: payload.customerId,
    product_name: payload.productName.trim().toLowerCase(),
    category: (payload.category || 'general').trim().toLowerCase(),
    target_location: (payload.targetLocation || 'القاهرة').trim().toLowerCase(),
    max_price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
    notes: (payload.notes || '').trim(),
    is_business: Boolean(payload.isBusiness),
    company_name: payload.companyName ? payload.companyName.trim() : null,
    cr_number: payload.crNumber ? payload.crNumber.trim() : null,
    tax_number: payload.taxNumber ? payload.taxNumber.trim() : null,
    quantity: payload.quantity ? String(payload.quantity).trim() : null,
    source_type: (payload.sourceType || 'manual').trim().toLowerCase(),
    ai_confidence: parsedConfidence !== null && !isNaN(parsedConfidence) ? parsedConfidence : null,
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
}
