'use server'

import { createSourcingRequest } from '@/lib/dal/requests'
import { autoAssignReviewerToRequest } from '@/lib/dal/staff'
import { getCustomerByAuthId, ensureCustomerProfile, isCustomerEligibleForFreeTrial, consumeFreeTrial } from '@/lib/dal/customers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function submitRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Extract locale from referer for redirection
  const referer = (await headers()).get('referer') || ''
  const locale = referer.includes('/en/') ? 'en' : 'ar'

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/requests/new`)
  }

  // Gracefully ensure customer profile exists
  const fullName = user.user_metadata?.full_name || 'Valued Customer'
  const customer = await ensureCustomerProfile(user.id, fullName, locale)
  
  if (!customer) {
    redirect(`/${locale}/dashboard?error=Could not verify customer profile`)
  }

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!title) {
    throw new Error('Title is required')
  }

  if (!description) {
    throw new Error('Description is required')
  }

  // Temporary logging as requested for operational verification
  console.log('submitRequest:customer.id=', customer.id)
  console.log('submitRequest:title=', title)
  console.log('submitRequest:description=', description)

  const requestKind = String(formData.get('request_kind') ?? 'everyday_purchase').trim()

  let serviceFeeAmount: number | null = null
  const isEligible = await isCustomerEligibleForFreeTrial(customer.id)
  if (isEligible && requestKind === 'everyday_purchase') {
    serviceFeeAmount = 0
    await consumeFreeTrial(customer.id)
    console.log(`[FREE_TRIAL] Applied free everyday purchase to customer ${customer.id} in dashboard request`)
  }

  const request = await createSourcingRequest({
    customerId: customer.id,
    title,
    rawDescription: description,
    status: 'submitted',
    channel: 'web',
    requestKind,
    serviceFeeAmount,
    preferences: {
      budget_min: formData.get('budget_min')
        ? Number(formData.get('budget_min'))
        : undefined,
      budget_max: formData.get('budget_max')
        ? Number(formData.get('budget_max'))
        : undefined,
      preferred_brands: String(formData.get('preferred_brands') ?? '') || undefined,
      preferred_models: String(formData.get('preferred_models') ?? '') || undefined,
      preferred_specs: String(formData.get('preferred_specs') ?? '') || undefined,
      allow_alternatives: formData.get('allow_alternatives') === 'on',
      condition_preference: String(formData.get('condition_preference') ?? 'new'),
      urgency_level: String(formData.get('urgency_level') ?? 'normal'),
      knows_market_price: formData.get('knows_market_price') === 'on',
      estimated_market_price: formData.get('estimated_market_price')
        ? Number(formData.get('estimated_market_price'))
        : undefined,
      priority_focus: String(formData.get('priority_focus') ?? 'best_value'),
      search_scope: String(formData.get('search_scope') ?? 'online_and_offline'),
      preferred_governorate: String(formData.get('preferred_governorate') ?? '') || undefined,
      preferred_area: String(formData.get('preferred_area') ?? '') || undefined,
      delivery_needed: formData.get('delivery_needed') === 'on',
      notes: String(formData.get('notes') ?? '') || undefined,
    },
  })

  // B) AUTO-ASSIGN ON REQUEST CREATION
  try {
    if (request?.id) {
      await autoAssignReviewerToRequest(request.id, null)
      console.log(`[Auto-Assign] Successfully assigned reviewer for request ${request.request_code}`)
    }
  } catch (err) {
    console.error(`[Auto-Assign] Failed to auto-assign reviewer for request ${request?.request_code}:`, err)
  }

  redirect(`/${locale}/dashboard`)
}
