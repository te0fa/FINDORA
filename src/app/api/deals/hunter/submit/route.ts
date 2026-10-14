import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { getContributorByAuthUserId } from '@/lib/dal/contributors'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { withRateLimit } from '@/lib/middleware/rate-limiter'

const HUNTER_SUBMIT_RATE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  message: 'Too many deal submissions. Please wait before submitting more deals.',
}

/**
 * Escape PostgreSQL ILIKE pattern wildcards ('%', '_', and '\')
 * to ensure user input is evaluated strictly as literal text.
 */
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

async function hunterSubmitHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { productName, discoveredPrice, storeName, category, proofUrl } = body || {}

    if (
      !productName ||
      typeof productName !== 'string' ||
      !productName.trim() ||
      !storeName ||
      typeof storeName !== 'string' ||
      !storeName.trim()
    ) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate price: reject missing, boolean, object/array, non-numeric, non-finite, zero, and negative
    if (
      discoveredPrice === null ||
      discoveredPrice === undefined ||
      discoveredPrice === '' ||
      typeof discoveredPrice === 'boolean' ||
      Array.isArray(discoveredPrice) ||
      typeof discoveredPrice === 'object'
    ) {
      return NextResponse.json({ error: 'discoveredPrice must be a valid positive number' }, { status: 400 })
    }

    let numericPrice: number
    if (typeof discoveredPrice === 'number') {
      if (!Number.isFinite(discoveredPrice)) {
        return NextResponse.json({ error: 'discoveredPrice must be a finite number' }, { status: 400 })
      }
      numericPrice = discoveredPrice
    } else if (typeof discoveredPrice === 'string') {
      const trimmedPrice = discoveredPrice.trim()
      if (!/^\d+(\.\d+)?$/.test(trimmedPrice)) {
        return NextResponse.json({ error: 'discoveredPrice must be a valid positive number' }, { status: 400 })
      }
      numericPrice = Number(trimmedPrice)
      if (!Number.isFinite(numericPrice)) {
        return NextResponse.json({ error: 'discoveredPrice must be a finite number' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'discoveredPrice must be a valid number' }, { status: 400 })
    }

    if (numericPrice <= 0) {
      return NextResponse.json({ error: 'discoveredPrice must be greater than 0' }, { status: 400 })
    }

    // Enforce database column boundary: PostgreSQL numeric(10,2) allows up to 99,999,999.99
    if (numericPrice > 99_999_999.99) {
      return NextResponse.json({ error: 'discoveredPrice exceeds maximum allowable limit' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // 1. Get or create contributor profile
    let contributor = await getContributorByAuthUserId(user.id)
    if (!contributor) {
      const customer = await getCustomerByAuthId(user.id)
      const name = customer?.full_name || user.user_metadata?.full_name || 'Casual Hunter'
      const phone = customer?.phone_number_normalized || customer?.phone_number_raw || '+20000000000'

      const { data: newContrib, error: err } = await adminClient
        .from('contributors')
        .insert({
          auth_user_id: user.id,
          full_name: name,
          phone_number: phone,
          role: 'casual',
          status: 'active',
          referral_code: '' // Canonical trigger auto-generation (trg_contributors_auto_referral_code)
        })
        .select()
        .single()

      if (err || !newContrib) {
        return NextResponse.json(
          { error: `Failed to initialize hunter profile: ${err?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
      contributor = newContrib as any
    }

    if (!contributor) {
      return NextResponse.json(
        { error: 'Failed to resolve hunter profile' },
        { status: 500 }
      )
    }

    const contributorId = (contributor as any).id as string
    const trimmedProductName = productName.trim()
    const trimmedStoreName = storeName.trim()

    // 2. Duplicate Guard: Check if an insight for this contributor, product, and store is already pending review
    const { data: existingPending, error: dupCheckError } = await adminClient
      .from('market_insights')
      .select('id')
      .eq('contributor_id', contributorId)
      .eq('status', 'pending_review')
      .ilike('product_name', escapeIlike(trimmedProductName))
      .ilike('store_name', escapeIlike(trimmedStoreName))
      .limit(1)
      .maybeSingle()

    if (dupCheckError) {
      return NextResponse.json(
        { error: `Failed to verify submission status: ${dupCheckError.message}` },
        { status: 500 }
      )
    }

    if (existingPending) {
      return NextResponse.json(
        { error: 'A submission for this product and store is already pending review' },
        { status: 409 }
      )
    }

    // 3. Insert into market_insights
    const { data, error } = await adminClient
      .from('market_insights')
      .insert({
        contributor_id: contributorId,
        product_name: trimmedProductName,
        discovered_price: numericPrice,
        store_name: trimmedStoreName,
        category: (typeof category === 'string' && category.trim()) || 'General',
        location_data: { proof_url: (typeof proofUrl === 'string' && proofUrl.trim()) || '' },
        status: 'pending_review'
      })
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to submit market insight' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, insight: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export const POST = withRateLimit(HUNTER_SUBMIT_RATE_LIMIT, hunterSubmitHandler)
