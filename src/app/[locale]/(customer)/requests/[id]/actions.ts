'use server'

import { sendMessage as dalSendMessage } from '@/lib/dal/messages'
import { createAdminClient } from '@/lib/dal/customers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Enforces strict authentication and ownership verification for request operations.
 * Prevents Broken Object Level Authorization (BOLA/IDOR).
 */
async function verifyRequestOwnership(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const adminClient = await createAdminClient()

  // 1. Fetch customer profile associated with the authenticated user
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // 2. Check if user is an active staff member (staff override allowed)
  const { data: staffMember } = await adminClient
    .from('staff_members')
    .select('id, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!customer && !staffMember) {
    throw new Error('Customer profile not found')
  }

  // 3. Fetch request record
  const { data: requestRecord, error: fetchErr } = await adminClient
    .from('requests')
    .select('id, customer_id, current_status, title')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchErr || !requestRecord) {
    throw new Error('Request not found')
  }

  // 4. Verify ownership
  if (customer && requestRecord.customer_id !== customer.id && !staffMember) {
    throw new Error('Forbidden: You do not own this request')
  }

  return { user, customer, staffMember, requestRecord, adminClient, supabase }
}

export async function sendCustomerMessage(requestId: string, message: string) {
  try {
    await verifyRequestOwnership(requestId)
    const sent = await dalSendMessage(requestId, message)
    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true, message: sent }
  } catch (err: any) {
    const errorCode = err.message === 'CHAT_NOT_CONFIGURED' ? 'CHAT_NOT_CONFIGURED' : err.message
    return { success: false, error: errorCode }
  }
}

export async function updateRequestDetails(requestId: string, newDescription: string, newTitle?: string) {
  try {
    const { supabase, requestRecord } = await verifyRequestOwnership(requestId)

    // Call customer RPC under user auth context (auth.uid() preserved)
    const { error: rpcErr } = await (supabase as any).rpc('fn_customer_update_request_details', {
      p_request_id: requestId,
      p_title: newTitle && newTitle.trim() !== '' ? newTitle.trim() : null,
      p_raw_description: newDescription !== undefined && newDescription !== null ? newDescription : null,
    })

    if (rpcErr) throw new Error(rpcErr.message)

    // Send an automated notification message in the chat
    const alertMessage = `[SYSTEM] Client updated details:\n- Title: ${newTitle?.trim() || requestRecord.title}\n- Description: ${newDescription ?? ''}`
    await dalSendMessage(requestId, alertMessage)

    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function requestReviewerAction(requestId: string, messageText: string) {
  try {
    await verifyRequestOwnership(requestId)
    const sent = await dalSendMessage(requestId, `[CLIENT EDIT REQUEST] ${messageText}`)
    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true, message: sent }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function submitDisputeAction(
  requestId: string,
  customerId: string,
  vendorId: string,
  disputeReason: 'price_discrepancy' | 'item_mismatch' | 'execution_issue' | 'other',
  details: string
) {
  try {
    const { customer } = await verifyRequestOwnership(requestId)
    const effectiveCustomerId = customer?.id || customerId

    const { createDispute } = await import('@/lib/dal/disputes')
    const dispute = await createDispute({
      request_id: requestId,
      customer_id: effectiveCustomerId,
      vendor_id: vendorId,
      dispute_reason: disputeReason,
      details
    })
    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true, dispute }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function toggleAutoReorderAction(requestId: string, isRecurring: boolean, intervalMonths: number) {
  try {
    const { supabase } = await verifyRequestOwnership(requestId)

    // Call customer RPC under user auth context (auth.uid() preserved)
    const { error: rpcErr } = await (supabase as any).rpc('fn_customer_toggle_auto_reorder', {
      p_request_id: requestId,
      p_is_recurring: isRecurring,
      p_reorder_interval_months: intervalMonths,
    })

    if (rpcErr) throw new Error(rpcErr.message)

    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function submitPriceGuaranteeAction(
  requestId: string,
  customerId: string,
  productName: string,
  lowerPrice: number,
  proofDetails: string
) {
  try {
    const { customer, adminClient } = await verifyRequestOwnership(requestId)
    const effectiveCustomerId = customer?.id || customerId

    const { error } = await adminClient
      .from('price_guarantees')
      .insert({
        customer_id: effectiveCustomerId,
        request_id: requestId,
        product_name: productName,
        lower_price: lowerPrice,
        proof_details: proofDetails,
        status: 'pending'
      })

    if (error) throw new Error(error.message)
    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function startSmartNegotiationAction(requestId: string) {
  try {
    const { adminClient } = await verifyRequestOwnership(requestId)
    const { sendWhatsApp } = await import('@/lib/notifications/whatsapp')
    
    // Fetch active bids and their vendors
    const { data: bids, error } = await adminClient
      .from('vendor_bids')
      .select(`
        id,
        price_amount,
        vendor_id,
        vendor:vendors(display_name, whatsapp_number, portal_email)
      `)
      .eq('request_id', requestId)
      .eq('is_active', true)

    if (error) throw new Error(error.message)
    if (!bids || bids.length === 0) {
      throw new Error('No active bids found to negotiate.')
    }

    let notifiedCount = 0
    for (const bid of bids) {
      const vendorInfo = (bid.vendor as any)
      const phone = vendorInfo?.whatsapp_number
      if (phone) {
        const message = `مرحباً ${vendorInfo.display_name}، العميل مهتم بشراء طلبك الآن ويطلب تفاوضاً على السعر (العرض الحالي: ${bid.price_amount} EGP). هل لديكم عرض أفضل لجذب العميل؟ يرجى تحديث عرضكم على المنصة.`
        await sendWhatsApp(phone, message)
        notifiedCount++
      }
    }

    return { success: true, notifiedCount }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
