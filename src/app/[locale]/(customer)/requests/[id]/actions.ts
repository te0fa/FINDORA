'use server'

import { sendMessage as dalSendMessage } from '@/lib/dal/messages'
import { createAdminClient } from '@/lib/dal/customers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sendCustomerMessage(requestId: string, message: string) {
  try {
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const adminClient = await createAdminClient()

    // First check request ownership and status
    const { data: req, error: fetchErr } = await adminClient
      .from('requests')
      .select('customer_id, current_status, title')
      .eq('id', requestId)
      .single()

    if (fetchErr || !req) throw new Error('Request not found')

    const updates: any = { raw_description: newDescription }
    if (newTitle) {
      updates.title = newTitle
    }

    // Update request
    const { error: updateErr } = await adminClient
      .from('requests')
      .update(updates)
      .eq('id', requestId)

    if (updateErr) throw new Error(updateErr.message)

    // Send an automated notification message in the chat
    const alertMessage = `[SYSTEM] Client updated details:\n- Title: ${newTitle || req.title}\n- Description: ${newDescription}`
    await dalSendMessage(requestId, alertMessage)

    revalidatePath(`/[locale]/requests/${requestId}`, 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function requestReviewerAction(requestId: string, messageText: string) {
  try {
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
    const { createDispute } = await import('@/lib/dal/disputes')
    const dispute = await createDispute({
      request_id: requestId,
      customer_id: customerId,
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
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('requests')
      .update({
        is_recurring: isRecurring,
        reorder_interval_months: intervalMonths,
        last_reordered_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (error) throw new Error(error.message)
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
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('price_guarantees')
      .insert({
        customer_id: customerId,
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
    const adminClient = await createAdminClient()
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
