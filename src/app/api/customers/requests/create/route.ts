import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { expandDemandAndCreateTasks } from '@/lib/intelligence/demand-expansion'

export async function POST(request: Request) {
  const supabase = await createClient() as any

  // 1. Parse Request
  const body = await request.json()
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

  // Graceful fallbacks for guest/AI-derived optional paths
  const finalCategory = category && String(category).trim() ? category : 'general'
  const finalTargetLocation = targetLocation && String(targetLocation).trim() ? targetLocation : 'القاهرة'

  if (!customerName || !productName) {
    return NextResponse.json({ error: 'Missing required fields (Name or Product Name)' }, { status: 400 })
  }

  // Find a system/admin user ID to attribute the auto-generated tasks to
  const { data: admin } = await supabase
    .from('staff_members')
    .select('id')
    .limit(1)
    .maybeSingle()

  // Look up or create a customer profile
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
      const guestCust = await upsertGuestCustomerByPhone(customerPhone, customerName, undefined, 'ar')
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

  // 2. Insert into customer_requests
  const { data: newRequest, error } = await supabase
    .from('customer_requests')
    .insert({
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      category: finalCategory,
      target_location: finalTargetLocation,
      max_price: maxPrice ? Number(maxPrice) : null,
      additional_notes: notes || ''
    })
    .select()
    .single()

  if (error || !newRequest) {
    console.error('Failed to create customer request:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // 3. Populate requests table (Dual-Write for tracking and operations)
  const requestCode = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  let rfqDocument = ''

  if (isBusiness) {
    try {
      const { getAIFeatureStatus, logAIFeatureUsage } = await import('@/lib/dal/ai-control')
      const status = await getAIFeatureStatus('flag_ai_rfq_generation')
      
      if (!status.enabled) {
        console.log('[AI_RFQ] B2B RFQ generation is disabled. Using programmatic fallback.')
        await logAIFeatureUsage({
          featureKey: 'flag_ai_rfq_generation',
          success: false,
          errorMessage: status.reason || 'Disabled'
        })
        rfqDocument = `
# Request for Quote (RFQ) / طلب عروض أسعار
- **Product / المنتج**: ${productName}
- **Category / القسم**: ${category}
- **Required Quantity / الكمية المطلوبة**: ${quantity}
- **Company Name / اسم الشركة**: ${companyName}
- **Commercial Register (CR) / السجل التجاري**: ${crNumber}
- **Tax Registration Number / الرقم الضريبي**: ${taxNumber}
- **Additional Notes & Details / تفاصيل إضافية**: ${notes || 'None'}

---
*Generated programmatically. AI RFQ generator is currently offline.*
        `.trim()
      } else {
        const { generateRfqDocument } = await import('@/lib/gemini/client')
        rfqDocument = await generateRfqDocument(
          productName,
          category,
          notes || '',
          companyName || '',
          crNumber || '',
          taxNumber || '',
          quantity || '1'
        )
        await logAIFeatureUsage({
          featureKey: 'flag_ai_rfq_generation',
          success: true,
          estimatedCost: 0.02
        })
      }
    } catch (err: any) {
      console.error('Gemini RFQ generation error:', err.message)
      try {
        const { logAIFeatureUsage } = await import('@/lib/dal/ai-control')
        await logAIFeatureUsage({
          featureKey: 'flag_ai_rfq_generation',
          success: false,
          errorMessage: err.message || String(err)
        })
      } catch {}
    }
  }

  try {
    const { createAdminClient } = await import('@/lib/dal/customers')
    const adminClient = await createAdminClient()
    
    const allowedKinds = ['everyday_purchase', 'high_value_asset', 'project_supply', 'general']
    let finalRequestKind = 'everyday_purchase'

    if (isBusiness) {
      finalRequestKind = 'project_supply'
    } else if (allowedKinds.includes(category)) {
      finalRequestKind = category
    } else if (category === 'high_value_deals') {
      finalRequestKind = 'high_value_asset'
    } else if (category === 'projects_supplies') {
      finalRequestKind = 'project_supply'
    }

    const requestPayload: any = {
      id: newRequest.id as string, // Keep the same UUID!
      request_code: requestCode,
      customer_id: customerId,
      title: productName,
      raw_description: notes || '',
      current_status: 'open',
      source_channel: 'landing_page',
      request_kind: finalRequestKind,
      is_business: !!isBusiness,
      source_type: body.source_type || 'manual',
      ai_confidence: body.ai_confidence ? Number(body.ai_confidence) : null,
      metadata: body.metadata || {},
    }

    if (isBusiness) {
      requestPayload.business_metadata = {
        company_name: companyName,
        cr_number: crNumber,
        tax_number: taxNumber,
        quantity: quantity
      }
      requestPayload.rfq_document = rfqDocument
    }

    const { error: reqError } = await adminClient
      .from('requests')
      .insert(requestPayload)
      
    if (reqError) {
      console.error('Failed to create row in requests table:', reqError)
    } else {
      // Auto assign reviewer to request
      try {
        const { autoAssignReviewerToRequest } = await import('@/lib/dal/staff')
        await autoAssignReviewerToRequest(newRequest.id, null)
      } catch (assignErr: any) {
        console.warn('Auto-assignment failed for requests:', assignErr.message)
      }
    }
  } catch (err: any) {
    console.error('Error inserting request into requests table:', err.message)
  }

  // 4. Trigger the Growth Engine: Demand Expansion (Fire and forget, so we don't block the UI)
  if (admin?.id) {
    await expandDemandAndCreateTasks(
      newRequest.id,
      productName,
      finalCategory,
      finalTargetLocation,
      admin.id
    )
  }

  return NextResponse.json({ success: true, requestId: newRequest.id, requestCode, isExistingRegisteredAccount })
}

