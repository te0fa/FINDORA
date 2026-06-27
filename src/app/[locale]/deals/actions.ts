'use server'

import { createFindoraDealInquiry } from '@/lib/dal/marketing'
import { redirect } from 'next/navigation'

export async function submitDealInquiry(formData: FormData) {
  const locale = formData.get('locale') as string
  const deal_id = formData.get('deal_id') as string
  const customer_name = formData.get('customer_name') as string
  const customer_phone = formData.get('customer_phone') as string
  const notes = formData.get('notes') as string
  const slug = formData.get('slug') as string

  if (!deal_id || !customer_phone) {
    const target = slug ? `/${locale}/deals/${slug}?error=missing_fields` : `/${locale}/deals?error=missing_fields`
    redirect(target)
  }

  try {
    await createFindoraDealInquiry({
      deal_id,
      customer_name,
      customer_phone,
      notes
    })
  } catch (err: any) {
    console.error('[DealsInquiry] Error:', err.message)
    const target = slug ? `/${locale}/deals/${slug}?error=submission_failed` : `/${locale}/deals?error=submission_failed`
    redirect(target)
  }

  const target = slug ? `/${locale}/deals/${slug}?success=true` : `/${locale}/deals?success=inquiry_sent`
  redirect(target)
}
