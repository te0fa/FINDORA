'use server'

import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId, createAdminClient } from '@/lib/dal/customers'
import { 
  getOrCreatePaymentIntentForCustomer, 
  submitPaymentReceipt, 
  getPaymentIntentAdmin,
  confirmPaymentIntentSystem,
  logPaymentAuditEventAdmin
} from '@/lib/dal/payments'
import { verifyInstapayReceiptWithGemini } from '@/lib/gemini/ocr'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function handleConfirmRequestProposal(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = (formData.get('locale') as string) || 'en'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  try {
    const customer = await getCustomerByAuthId(user.id)
    if (!customer) {
      redirect(`/${locale}/dashboard?error=customer_not_found`)
    }

    await getOrCreatePaymentIntentForCustomer(requestId, customer.id)
    
    revalidatePath(`/${locale}/reports/${requestId}`)
    redirect(`/${locale}/reports/${requestId}?success=proposal_confirmed`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('[Action] Confirm proposal failed:', err.message)
    redirect(`/${locale}/reports/${requestId}?error=confirm_failed`)
  }
}

export async function handleUploadPaymentReceipt(formData: FormData) {
  const paymentIntentId = formData.get('paymentIntentId') as string
  const requestId = formData.get('requestId') as string
  const locale = (formData.get('locale') as string) || 'en'
  const file = formData.get('receipt') as File | null

  if (!file || file.size === 0) {
    redirect(`/${locale}/reports/${requestId}?error=no_file_uploaded`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  try {
    // 1. Check customer ownership
    const customer = await getCustomerByAuthId(user.id)
    if (!customer) {
      redirect(`/${locale}/dashboard?error=customer_not_found`)
    }

    // 2. Fetch expected payment amount
    const intent = await getPaymentIntentAdmin(paymentIntentId)
    if (!intent) {
      redirect(`/${locale}/reports/${requestId}?error=intent_not_found`)
    }
    const expectedAmount = Number(intent.amount)

    // 3. Upload file to Supabase storage 'payment-receipts' bucket
    const adminClient = await createAdminClient()
    const safeName = (file.name || 'receipt').replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const path = `${customer.id}/${Date.now()}-${safeName}`

    const { error: uploadErr } = await adminClient.storage
      .from('payment-receipts')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadErr) {
      console.error('[Action] Storage upload failed:', uploadErr)
      redirect(`/${locale}/reports/${requestId}?error=upload_failed`)
    }

    // Get the public URL
    const { data: { publicUrl } } = adminClient.storage.from('payment-receipts').getPublicUrl(path)

    // 4. Run Gemini Multimodal Vision OCR to verify receipt
    console.log('[Action] Initiating receipt OCR for image URL:', publicUrl)
    const ocrResult = await verifyInstapayReceiptWithGemini(publicUrl)
    console.log('[Action] OCR result:', ocrResult)

    const isMatch = ocrResult.isValidReceipt && ocrResult.amount >= expectedAmount

    if (isMatch) {
      // 5a. Auto-Confirm: updates status to 'confirmed', logs audit, unlocks report snapshots
      await confirmPaymentIntentSystem({
        id: paymentIntentId,
        externalReference: ocrResult.transactionReference,
        notes: `Auto-verified & confirmed via Gemini OCR. Reference: ${ocrResult.transactionReference}. Confidence: ${ocrResult.confidence}. Reason: ${ocrResult.reason}`
      })

      // Update the receipt image path for reference
      await adminClient.from('payment_intents').update({
        receipt_image_path: publicUrl,
        metadata: { ...(intent.metadata as any || {}), ocr: ocrResult }
      }).eq('id', paymentIntentId)

      revalidatePath(`/${locale}/reports/${requestId}`)
      redirect(`/${locale}/reports/${requestId}?success=receipt_auto_confirmed`)
    } else {
      // 5b. Submission Only (mismatch/uncertain): updates status to 'submitted' for manual staff check
      await submitPaymentReceipt({
        paymentIntentId,
        receiptImagePath: publicUrl
      })

      // Save OCR metadata for staff to review in payment intents
      await adminClient.from('payment_intents').update({
        metadata: { ...(intent.metadata as any || {}), ocr: ocrResult }
      }).eq('id', paymentIntentId)

      // Audit log the OCR warning
      await logPaymentAuditEventAdmin({
        paymentIntentId,
        requestId,
        eventType: 'RECEIPT_OCR_WARNING',
        actorType: 'system',
        notes: `OCR verification uncertain. Reason: ${ocrResult.reason}. Amount extracted: ${ocrResult.amount} EGP (Expected: ${expectedAmount} EGP)`
      })

      revalidatePath(`/${locale}/reports/${requestId}`)
      redirect(`/${locale}/reports/${requestId}?success=receipt_uploaded`)
    }

  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('[Action] Upload receipt failed:', err.message)
    redirect(`/${locale}/reports/${requestId}?error=receipt_upload_failed`)
  }
}
