import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTurnstileToken } from '@/lib/security/turnstile'

export async function POST(request: Request) {
  // 1. Parse JSON safely
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed or invalid JSON payload' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 2. Client IP & Turnstile Verification (P0-03-A)
  const clientIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined

  const turnstileToken =
    body.turnstileToken ||
    request.headers.get('cf-turnstile-response') ||
    request.headers.get('x-turnstile-token')

  const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp)
  if (!turnstileResult.success) {
    const safeIpPrefix = clientIp
      ? clientIp.includes(':')
        ? clientIp.split(':')[0] + ':*'
        : clientIp.split('.').slice(0, 2).join('.') + '.x.x'
      : 'unknown'

    console.warn('[SECURITY][GUEST_REQUEST] Human verification failed:', {
      ipPrefix: safeIpPrefix,
      error: turnstileResult.error,
    })

    return NextResponse.json(
      {
        error: 'Human verification failed. Please refresh and try again.',
        code: turnstileResult.error,
      },
      { status: 403 }
    )
  }

  // 3. Strict Input Boundary Validation (P0-03-A)
  const { 
    customerName, 
    customerPhone, 
    productName, 
    category, 
    targetLocation, 
    maxPrice, 
    notes,
    isBusiness,
    companyName,
    crNumber,
    taxNumber,
    quantity
  } = body

  // customerName: required string, 1..100 characters
  if (typeof customerName !== 'string' || customerName.trim().length === 0) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
  }
  const trimmedCustomerName = customerName.trim()
  if (trimmedCustomerName.length > 100) {
    return NextResponse.json({ error: 'Customer name must not exceed 100 characters' }, { status: 400 })
  }

  // productName: required string, 1..150 characters
  if (typeof productName !== 'string' || productName.trim().length === 0) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
  }
  const trimmedProductName = productName.trim()
  if (trimmedProductName.length > 150) {
    return NextResponse.json({ error: 'Product name must not exceed 150 characters' }, { status: 400 })
  }

  // notes: optional string, max 2000 characters
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be text' }, { status: 400 })
    }
    if (notes.trim().length > 2000) {
      return NextResponse.json({ error: 'Notes must not exceed 2000 characters' }, { status: 400 })
    }
  }
  const trimmedNotes = typeof notes === 'string' ? notes.trim() : ''

  // metadata: optional object, max 10KB serialized
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      return NextResponse.json({ error: 'Metadata must be an object' }, { status: 400 })
    }
    try {
      const serialized = JSON.stringify(body.metadata)
      if (serialized.length > 10240) {
        return NextResponse.json({ error: 'Metadata payload exceeds maximum size limit (10KB)' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid metadata serialization' }, { status: 400 })
    }
  }

  // maxPrice: optional number, non-negative, finite <= 100,000,000
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    const parsedPrice = Number(maxPrice)
    if (isNaN(parsedPrice) || !isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > 100_000_000) {
      return NextResponse.json({ error: 'Price must be a valid positive number' }, { status: 400 })
    }
  }

  // quantity: optional string/number, max 50 chars, no negative
  if (quantity !== undefined && quantity !== null && quantity !== '') {
    const qtyStr = String(quantity).trim()
    if (qtyStr.length > 50) {
      return NextResponse.json({ error: 'Quantity string must not exceed 50 characters' }, { status: 400 })
    }
    const numQty = Number(qtyStr)
    if (!isNaN(numQty) && numQty < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 })
    }
  }

  // Optional string bounds
  if (companyName && (typeof companyName !== 'string' || companyName.trim().length > 150)) {
    return NextResponse.json({ error: 'Company name must not exceed 150 characters' }, { status: 400 })
  }
  if (crNumber && (typeof crNumber !== 'string' || crNumber.trim().length > 50)) {
    return NextResponse.json({ error: 'Commercial registration number must not exceed 50 characters' }, { status: 400 })
  }
  if (taxNumber && (typeof taxNumber !== 'string' || taxNumber.trim().length > 50)) {
    return NextResponse.json({ error: 'Tax registration number must not exceed 50 characters' }, { status: 400 })
  }
  if (category && (typeof category !== 'string' || category.trim().length > 50)) {
    return NextResponse.json({ error: 'Category must not exceed 50 characters' }, { status: 400 })
  }
  if (targetLocation && (typeof targetLocation !== 'string' || targetLocation.trim().length > 100)) {
    return NextResponse.json({ error: 'Target location must not exceed 100 characters' }, { status: 400 })
  }

  // Optional client idempotency key (header or body, max 100 chars)
  const clientHeaderIdempotencyKey =
    request.headers.get('idempotency-key') ||
    request.headers.get('x-idempotency-key')
  const clientBodyIdempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length <= 100
      ? body.idempotencyKey.trim()
      : undefined
  const idempotencyKey = clientHeaderIdempotencyKey || clientBodyIdempotencyKey

  // Graceful fallbacks for category and location
  const finalCategory = category && String(category).trim() ? String(category).trim() : 'general'
  const finalTargetLocation = targetLocation && String(targetLocation).trim() ? String(targetLocation).trim() : 'القاهرة'

  // 4. Resolve Customer Identity (Session or Normalized Phone)
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  let customerId: string | null = null
  let authUserId: string | null = null
  let isExistingRegisteredAccount = false

  if (user) {
    authUserId = user.id
    const { data: cust } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (cust) customerId = cust.id
  }

  if (!customerId && customerPhone) {
    try {
      const { upsertGuestCustomerByPhone } = await import('@/lib/dal/customers')
      const guestCust = await upsertGuestCustomerByPhone(String(customerPhone).trim(), trimmedCustomerName, undefined, 'ar')
      if (guestCust) {
        customerId = guestCust.id
        if (guestCust.auth_user_id) {
          isExistingRegisteredAccount = true
        }
      }
    } catch (err: any) {
      console.error('upsertGuestCustomerByPhone failed:', err.message)
    }
  }

  // Fail-closed: Never proceed to request creation if customer identity cannot be resolved
  if (!customerId) {
    return NextResponse.json(
      { error: 'Valid phone number or customer account required to submit a request' },
      { status: 400 }
    )
  }

  // Pre-generate UUID and request code
  const requestId = crypto.randomUUID()
  const requestCode = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  // 5. B2B RFQ: Programmatic Intake Template (ZERO Synchronous Billable AI Calls — P0-03-A)
  let rfqDocument = ''
  if (isBusiness) {
    rfqDocument = `
# Request for Quote (RFQ) / طلب عروض أسعار
- **Product / المنتج**: ${trimmedProductName}
- **Category / القسم**: ${finalCategory}
- **Required Quantity / الكمية المطلوبة**: ${quantity ? String(quantity).trim() : '1'}
- **Company Name / اسم الشركة**: ${companyName ? String(companyName).trim() : 'N/A'}
- **Commercial Register (CR) / السجل التجاري**: ${crNumber ? String(crNumber).trim() : 'N/A'}
- **Tax Registration Number / الرقم الضريبي**: ${taxNumber ? String(taxNumber).trim() : 'N/A'}
- **Additional Notes & Details / تفاصيل إضافية**: ${trimmedNotes || 'None'}

---
*Generated programmatically on intake. AI refinement available during staff triage.*
    `.trim()
  }

  // Pre-transaction storage image copy if present
  let finalReferenceImagePath: string | null = null
  const tempImgPath = body.reference_image_path || body.metadata?.reference_image_path
  if (tempImgPath && customerId) {
    finalReferenceImagePath = await copyTempImageToPermanent(tempImgPath, customerId)
  }

  const allowedKinds = ['everyday_purchase', 'high_value_asset', 'project_supply', 'general']
  let finalRequestKind = 'everyday_purchase'

  if (isBusiness) {
    finalRequestKind = 'project_supply'
  } else if (allowedKinds.includes(finalCategory)) {
    finalRequestKind = finalCategory
  } else if (finalCategory === 'high_value_deals') {
    finalRequestKind = 'high_value_asset'
  } else if (finalCategory === 'projects_supplies') {
    finalRequestKind = 'project_supply'
  }

  const businessMetadata = isBusiness ? {
    company_name: companyName ? String(companyName).trim() : undefined,
    cr_number: crNumber ? String(crNumber).trim() : undefined,
    tax_number: taxNumber ? String(taxNumber).trim() : undefined,
    quantity: quantity ? String(quantity).trim() : undefined
  } : {}

  const safeMetadata = {
    ...(body.metadata || {}),
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  }

  // 6. Atomic PostgreSQL Request Creation via canonical fn_create_sourcing_request RPC (P0-04)
  const { createAdminClient } = await import('@/lib/dal/customers')
  const adminClient = await createAdminClient()

  const { data: rpcResult, error: rpcError } = await adminClient.rpc('fn_create_sourcing_request', {
    p_request_id: requestId,
    p_customer_id: customerId,
    p_customer_name: trimmedCustomerName,
    p_customer_phone: customerPhone ? String(customerPhone).trim() : '',
    p_product_name: trimmedProductName,
    p_category: finalCategory,
    p_target_location: finalTargetLocation,
    p_max_price: maxPrice ? Number(maxPrice) : undefined,
    p_additional_notes: trimmedNotes,
    p_request_code: requestCode,
    p_title: trimmedProductName,
    p_raw_description: trimmedNotes,
    p_status: 'open',
    p_channel: 'landing_page',
    p_request_kind: finalRequestKind,
    p_intake_mode: 'quick',
    p_pricing_decision: 'pending_review',
    p_service_fee_amount: 299,
    p_execution_requested: false,
    p_followup_requested: false,
    p_site_visit_requested: false,
    p_reference_image_path: finalReferenceImagePath || undefined,
    p_preferences: {},
    p_is_business: !!isBusiness,
    p_business_metadata: businessMetadata,
    p_rfq_document: rfqDocument || undefined,
    p_metadata: safeMetadata,
    p_source_type: body.source_type || 'manual',
    p_ai_confidence: body.ai_confidence ? Number(body.ai_confidence) : undefined,
  })

  if (rpcError) {
    console.error('Failed to create sourcing request atomically:', rpcError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // 7. Staff Reviewer Assignment: Preserved for intake triage
  try {
    const { autoAssignReviewerToRequest } = await import('@/lib/dal/staff')
    await autoAssignReviewerToRequest(requestId, null)
  } catch (assignErr: any) {
    console.warn('Auto-assignment failed for request:', assignErr.message)
  }

  // Note on Demand Expansion (P0-03-A):
  // expandDemandAndCreateTasks is intentionally decoupled from synchronous guest intake
  // to eliminate immediate billable LLM calls and unreviewed platform task creation.

  return NextResponse.json({ success: true, requestId, requestCode, isExistingRegisteredAccount })
}

async function copyTempImageToPermanent(tempPath: string, customerId: string): Promise<string | null> {
  try {
    const { createAdminClient } = await import('@/lib/dal/customers')
    const adminClient = await createAdminClient()
    
    // 1. Download from 'ai-concierge-uploads'
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('ai-concierge-uploads')
      .download(tempPath)

    if (downloadError) {
      console.error('[IMAGE_MOVE] Download failed from temp path:', tempPath, downloadError)
      return null
    }

    // 2. Determine new path in 'request-reference-images'
    const filename = tempPath.split('/').pop() || 'image.jpg'
    const newPath = `${customerId}/${Date.now()}-${filename}`

    // 3. Upload to 'request-reference-images'
    const { error: uploadError } = await adminClient.storage
      .from('request-reference-images')
      .upload(newPath, fileData, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      console.error('[IMAGE_MOVE] Upload failed to permanent path:', newPath, uploadError)
      return null
    }

    console.log(`[IMAGE_MOVE] Successfully copied image from temp bucket to permanent bucket: "${newPath}"`)
    return newPath
  } catch (err: any) {
    console.error('[IMAGE_MOVE] Unexpected error:', err.message)
    return null
  }
}

