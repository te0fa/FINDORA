'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  addToShortlist,
  getStaffMemberByAuthUserId,
  getStaffUiPermissions,
  releaseToCustomer,
  updateReviewerDecision,
  updateRequestPricing,
  prepareRequestClientBundle,
  getRequestUiStatus,
  StaffMemberLite
} from '@/lib/dal/staff'
import { 
  upsertReportOptionSnapshotAdmin, 
  deleteReportOptionSnapshotAdmin, 
  markReportReadyAdmin,
  getOrCreateReportForRequestAdmin
} from '@/lib/dal/reports'
import { TransitionName } from '@/lib/dal/transitions'
import { resolveRequestState } from '@/lib/dal/lifecycle'
import { getStaffActionPermissions } from '@/lib/workflow/action-permissions'
import { createAdminClient } from '@/lib/dal/customers'
import { archiveRequestAdmin } from '@/lib/dal/requests'

async function getAuthorizedStaff(locale: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)

  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)
  const isResearcher =
    staffMember.staff_role === 'researcher' || staffMember.team_code === 'online_research'
  const isFieldAgent =
    staffMember.staff_role === 'field_agent' || staffMember.team_code === 'offline_sourcing'

  return {
    staffMember,
    permissions,
    isResearcher,
    isFieldAgent,
  }
}

async function getActionPermissions(requestId: string, locale: string) {
  const { staffMember, permissions } = await getAuthorizedStaff(locale)
  const adminClient = await createAdminClient()
  
  // FIX: Removed duplicate alias 'auth_user_id:assigned_reviewer_staff_id' that caused
  // PostgREST to fail silently (selecting same column twice), returning null data.
  const { data: request, error: requestError } = await adminClient
    .from('requests')
    .select('id, current_status, reviewer_decision, is_archived, assigned_reviewer_staff_id')
    .eq('id', requestId)
    .single()
    
  if (requestError || !request) {
    console.error('[getActionPermissions] Request fetch failed:', requestError?.message, '| requestId:', requestId)
    throw new Error('Request not found')
  }

  const { data: uiStatus } = await adminClient
    .from('v_request_ui_status')
    .select('client_released_at, snapshot_count')
    .eq('request_id', requestId)
    .maybeSingle()

  const state = resolveRequestState({
    ...request,
    client_released_at: uiStatus?.client_released_at
  })

  const actionPermissions = getStaffActionPermissions({
    staff: staffMember,
    permissions,
    state,
    request: {
      ...request,
      assigned_reviewer_staff_id: request.assigned_reviewer_staff_id
    },
    snapshotCount: uiStatus?.snapshot_count || 0
  })

  return { staffMember, actionPermissions }
}

export async function handleAddToShortlist(formData: FormData) {
  const requestId = formData.get('request_id') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canAddShortlist) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_shortlist`)
  }

  const name = (formData.get('name') as string) || ''
  const price = (formData.get('price') as string) || ''
  const description = (formData.get('description') as string) || ''
  const researchItemId = (formData.get('research_item_id') as string) || ''
  const merchantQuoteId = (formData.get('merchant_quote_id') as string) || ''
  const candidateChannel = (formData.get('candidate_channel') as string) || (researchItemId ? 'online' : 'offline')

  try {
    await addToShortlist({
      request_id: requestId,
      candidate_channel: candidateChannel,
      option_label: name,
      reason_summary: description,
      customer_summary: price ? `Price: ${price}` : null,
      research_item_id: researchItemId || null,
      merchant_quote_id: merchantQuoteId || null,
      selected_by_user_id: staffMember.auth_user_id,
    })

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    revalidatePath('/', 'layout')
    redirect(`/${locale}/staff/workspace/${requestId}?success=shortlisted_${candidateChannel}`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=shortlist_failed`)
  }
}

export async function handlePrepareClientBundle(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canPrepareBundle) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_bundle`)
  }

  try {
    const reportId = randomUUID()
    
    await prepareRequestClientBundle({
      p_request_id: requestId,
      p_report_id: reportId,
      p_actor_user_id: staffMember.auth_user_id,
    })

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    redirect(`/${locale}/staff/workspace/${requestId}?success=bundle_prepared`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=bundle_prepare_failed`)
  }
}

export async function handleReleaseToCustomer(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canReleaseToCustomer) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_release`)
  }

  try {
    await releaseToCustomer(requestId, undefined, staffMember.auth_user_id)
    revalidatePath('/', 'layout')
    redirect(`/${locale}/staff/workspace/${requestId}?success=released`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=release_failed`)
  }
}

export async function handleReviewerDecision(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const decision = formData.get('decision') as string
  const note = (formData.get('reviewer_note') as string) || ''
  const locale = ((formData.get('locale') as string) || 'en').trim()
  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  const permissions = getStaffUiPermissions(staffMember)
  const isAdminStaff = permissions.isAdmin
  const isReviewerStaff = permissions.canReviewIntake
  if (!actionPermissions.canReviewIntake && !isAdminStaff && !isReviewerStaff) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_review`)
  }

  const allowed = ['approve', 'reject', 'needs_clarification']
  if (!allowed.includes(decision)) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=invalid_reviewer_decision#reviewer-panel`)
  }

  if ((decision === 'reject' || decision === 'needs_clarification') && !note.trim()) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=note_required&decision_type=${decision}#reviewer-panel`)
  }

  if (decision === 'approve') {
    const isConfirmed = formData.get('confirmed_approval') === 'true'
    const adminClient = await createAdminClient()
    const { data: req, error: dbError } = await adminClient
      .from('requests')
      .select('id, request_kind, pricing_model, payment_policy, service_fee_amount, pricing_notes')
      .eq('id', requestId)
      .single()

    if (dbError) {
      console.error('[ACTIONS] Database error fetching request for pricing gate:', dbError)
    }

    if (!req) {
      redirect(`/${locale}/staff/workspace/${requestId}?error=request_not_found#reviewer-panel`)
    }

    if (!isConfirmed) {
      // 1. Call forcePricingGate(request)
      const { forcePricingGate } = await import('@/lib/middleware/forcePricingGate')
      const enriched_data = await forcePricingGate(req)

      // 2. Return PENDING_STAFF_CONFIRMATION payload and stop auto-approval
      return {
        status: "PENDING_STAFF_CONFIRMATION",
        payload: enriched_data
      }
    }

    // Enforce resolved pricing onto requests record when confirmed
    const resolvedFinalPrice = parseFloat(formData.get('final_price') as string) || req.service_fee_amount || 299
    const resolvedModel = (formData.get('pricing_model') as string) || req.pricing_model || 'fixed_fee'
    const resolvedPolicy = (formData.get('payment_policy') as string) || req.payment_policy || 'pay_after_preview'
    const resolvedNotes = (formData.get('pricing_notes') as string) || req.pricing_notes || 'Approved after pricing gate review.'
    const resolvedKind = req.request_kind || 'everyday_purchase'

    await adminClient
      .from('requests')
      .update({
        request_kind: resolvedKind,
        service_fee_amount: resolvedFinalPrice,
        pricing_model: resolvedModel,
        payment_policy: resolvedPolicy,
        pricing_notes: resolvedNotes
      })
      .eq('id', requestId)
  }

  try {
    await updateReviewerDecision({
      request_id: requestId,
      decision: decision as 'approve' | 'reject' | 'needs_clarification',
      staff_id: staffMember.id,
      reviewer_notes: note,
    })

    if (decision === 'approve') {
      const { onRequestApproved } = await import('@/lib/workflow/orchestrator')
      onRequestApproved(requestId).catch(e => console.error('[ACTIONS] Orchestrator launch failed:', e.message))
    }

    revalidatePath(`/${locale}/staff/queue`)
    revalidatePath(`/${locale}/staff/dashboard`)
    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    
    redirect(`/${locale}/staff/workspace/${requestId}?success=true#reviewer-panel`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    const msg = encodeURIComponent(err.message || 'system_error')
    redirect(`/${locale}/staff/workspace/${requestId}?error=${msg}#reviewer-panel`)
  }
}

export async function handleSaveOnlineFinding(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canAddOnlineFinding) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_finding`)
  }

  const { addManualResearchItem } = await import('@/lib/dal/research')

  try {
    await addManualResearchItem({
      request_id: requestId,
      source_name: formData.get('source_name') as string,
      product_title: formData.get('product_title') as string,
      listing_url: formData.get('listing_url') as string,
      price_amount: parseFloat((formData.get('price_amount') as string) || '0') || 0,
      availability_status: formData.get('availability_status') as string,
      product_specs_summary: formData.get('specs') as string,
      notes: formData.get('notes') as string,
      captured_by_staff_id: staffMember.id,
    })

    revalidatePath('/', 'layout')
    redirect(`/${locale}/staff/workspace/${requestId}?success=finding_saved`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=finding_failed`)
  }
}

async function uploadMerchantQuoteImage(file: File | null) {
  if (!file || file.size === 0) return undefined
  const adminClient = await createAdminClient()
  const safeName = (file.name || 'quote-image').replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `merchant-quotes/${Date.now()}-${safeName}`
  
  const { error } = await adminClient.storage
    .from('findora-products')
    .upload(path, file, { contentType: file.type, upsert: false })
    
  if (error) {
    console.error('Storage upload failed:', error)
    return undefined
  }
  
  const { data: { publicUrl } } = adminClient.storage.from('findora-products').getPublicUrl(path)
  return publicUrl
}

export async function handleSaveOfflineQuote(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canAddOfflineQuote) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_quote`)
  }

  const { saveMerchantQuote } = await import('@/lib/dal/staff')

  try {
    const productImgFile = formData.get('product_image') as File | null
    const businessCardImgFile = formData.get('business_card_image') as File | null

    const product_image_path = await uploadMerchantQuoteImage(productImgFile)
    const business_card_image_path = await uploadMerchantQuoteImage(businessCardImgFile)

    await saveMerchantQuote({
      request_id: requestId,
      merchant_name: formData.get('merchant_name') as string,
      product_title: formData.get('product_title') as string,
      price_amount: parseFloat((formData.get('price_amount') as string) || '0') || 0,
      captured_by_staff_id: staffMember.id,
      contact_person: formData.get('contact_person') as string,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      governorate: formData.get('governorate') as string,
      area: formData.get('area') as string,
      availability_status: formData.get('availability_status') as string,
      installment_details: formData.get('installment_details') as string,
      notes: formData.get('notes') as string,
      product_image_path,
      business_card_image_path
    })

    revalidatePath('/', 'layout')
    redirect(`/${locale}/staff/workspace/${requestId}?success=quote_saved`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=quote_failed`)
  }
}

export async function handleTransition(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const transition = formData.get('transition') as TransitionName
  const note = formData.get('note') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  const canTransition = (transition === 'RESOLVE_ISSUE' && actionPermissions.canResolveIssue) ||
                        (transition === 'START_RESEARCH' && actionPermissions.canStartResearch) ||
                        (transition === 'START_FIELD_WORK' && actionPermissions.canStartResearch) || 
                        (transition === 'MOVE_TO_REPORTING' && actionPermissions.canMoveToReporting) ||
                        (transition === 'REVERT_TO_OPS' && actionPermissions.canRevertToOps) ||
                        (transition === 'SIGNAL_READY' && actionPermissions.canMoveToReporting) 

  if (!canTransition) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_transition`)
  }

  try {
    const { executeTransition } = await import('@/lib/dal/transitions')
    await executeTransition(transition, requestId, staffMember.id, note)

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    revalidatePath(`/${locale}/staff/queue`)
    
    redirect(`/${locale}/staff/workspace/${requestId}?success=transition_${transition.toLowerCase()}`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    const msg = err.message || 'Transition failed'
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(msg)}`)
  }
}

export async function handleUpdateScopePricing(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  const permissions = getStaffUiPermissions(staffMember)
  const isAdminStaff = permissions.isAdmin
  const isReviewerStaff = permissions.canReviewIntake
  if (!actionPermissions.canReviewIntake && !isAdminStaff && !isReviewerStaff) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_pricing`)
  }

  const requestKind = formData.get('requestKind') as string
  const pricingModel = formData.get('pricingModel') as string
  const paymentPolicy = formData.get('paymentPolicy') as string
  const serviceFee = Number(formData.get('serviceFee')) || 0
  const pricingNotes = formData.get('pricingNotes') as string

  try {
    await updateRequestPricing({
      requestId,
      requestKind,
      pricingModel,
      paymentPolicy,
      serviceFeeAmount: serviceFee,
      pricingNotes,
      staffId: staffMember.id
    })

    const { logTimelineEvent } = await import('@/lib/dal/timeline')
    await logTimelineEvent({
      requestId,
      transitionName: 'PRICING_CONFIRMED',
      notes: `Scope & Pricing confirmed: Service Fee ${serviceFee} EGP (${pricingModel.toUpperCase()})`,
      changedByStaffId: staffMember.id
    })

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    redirect(`/${locale}/staff/workspace/${requestId}?success=pricing_updated`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}`)
  }
}

export async function handleUpsertSnapshot(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()
  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)

  if (!actionPermissions.canMoveToReporting && !actionPermissions.canAddShortlist) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_builder`)
  }

  const id = formData.get('id') as string
  const reportId = formData.get('reportId') as string
  const displayTitle = formData.get('displayTitle') as string
  const highlightSummary = formData.get('highlightSummary') as string
  const rank = Number(formData.get('displayRank')) || 0
  const price = Number(formData.get('price')) || 0
  
  const hiddenMerchantName = formData.get('hiddenMerchantName') as string
  const hiddenSourceUrl = formData.get('hiddenSourceUrl') as string
  const hiddenContactNotes = formData.get('hiddenContactNotes') as string

  try {
    let finalReportId = reportId
    if (!finalReportId) {
       const report = await getOrCreateReportForRequestAdmin(requestId, staffMember.auth_user_id)
       finalReportId = report!.id
    }

    await upsertReportOptionSnapshotAdmin({
      id: id || undefined,
      report_id: finalReportId,
      request_id: requestId,
      display_title: displayTitle,
      highlight_summary: highlightSummary,
      display_rank: rank,
      display_price_amount: price,
      hidden_merchant_name: hiddenMerchantName,
      hidden_reference_url: hiddenSourceUrl,
      hidden_contact_notes: hiddenContactNotes,
      reveal_locked: true
    })

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    redirect(`/${locale}/staff/workspace/${requestId}?success=snapshot_saved#report-builder`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}#report-builder`)
  }
}

export async function handleDeleteSnapshot(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const snapshotId = formData.get('snapshotId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()
  
  const { actionPermissions } = await getActionPermissions(requestId, locale)
  if (!actionPermissions.canMoveToReporting) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_builder`)
  }

  try {
    await deleteReportOptionSnapshotAdmin(snapshotId)
    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    redirect(`/${locale}/staff/workspace/${requestId}?success=snapshot_deleted#report-builder`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=delete_failed#report-builder`)
  }
}

export async function handleMarkReportReady(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()
  
  const { staffMember, actionPermissions } = await getActionPermissions(requestId, locale)
  if (!actionPermissions.canMoveToReporting) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_release`)
  }

  try {
    await markReportReadyAdmin(requestId, staffMember.auth_user_id)
    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    revalidatePath(`/${locale}/staff/queue`)
    revalidatePath('/', 'layout')
    redirect(`/${locale}/staff/workspace/${requestId}?success=report_ready`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}#report-builder`)
  }
}

// ─── ADMIN-ONLY ACTIONS ────────────────────────────────────────────────────────

export async function handleAdminCancelRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember } = await getAuthorizedStaff(locale)
  const permissions = getStaffUiPermissions(staffMember)

  if (!permissions.isAdmin) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_admin_action`)
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('requests')
    .update({
      current_status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(error.message)}`)
  }

  const { logTimelineEvent } = await import('@/lib/dal/timeline')
  await logTimelineEvent({
    requestId,
    transitionName: 'ADMIN_CANCELLED',
    notes: 'Admin cancelled this request manually.',
    changedByStaffId: staffMember.id
  }).catch(() => {})

  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
  revalidatePath(`/${locale}/staff/queue`)
  revalidatePath(`/${locale}/staff/dashboard`)
  redirect(`/${locale}/staff/workspace/${requestId}?success=request_cancelled`)
}

export async function handleAdminArchiveRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()

  const { staffMember } = await getAuthorizedStaff(locale)
  const permissions = getStaffUiPermissions(staffMember)

  if (!permissions.canManageArchive) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_admin_action`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await archiveRequestAdmin(requestId, user!.id, 'Admin archived manually from workspace.')

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
    revalidatePath(`/${locale}/staff/queue`)
    revalidatePath(`/${locale}/staff/dashboard`)
    revalidatePath(`/${locale}/staff/archive`)
    redirect(`/${locale}/staff/archive?success=archived`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}`)
  }
}

export async function handleAdminDeleteRequest(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = ((formData.get('locale') as string) || 'en').trim()
  const confirmCode = (formData.get('confirmCode') as string || '').trim().toUpperCase()
  const requestCode = (formData.get('requestCode') as string || '').trim().toUpperCase()

  const { staffMember } = await getAuthorizedStaff(locale)
  const permissions = getStaffUiPermissions(staffMember)

  if (!permissions.canHardDelete) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=unauthorized_admin_action`)
  }

  if (!confirmCode || confirmCode !== requestCode) {
    redirect(`/${locale}/staff/workspace/${requestId}?error=confirm_code_mismatch`)
  }

  try {
    const { buildRequestDeleteBackupAdmin, hardDeleteRequestWithBackupAdmin } = await import('@/lib/dal/archive')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const backup = await buildRequestDeleteBackupAdmin(requestId, user!.id)
    await hardDeleteRequestWithBackupAdmin({
      requestId,
      backupId: backup!.id,
      actorUserId: user!.id,
      notes: 'Admin hard-deleted from workspace control panel.'
    })

    revalidatePath(`/${locale}/staff/queue`)
    revalidatePath(`/${locale}/staff/dashboard`)
    redirect(`/${locale}/staff/queue?success=request_deleted`)
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}`)
  }
}

export async function handleTriggerOnlineSourcing(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string
  
  const { triggerOnlineSourcingAction } = await import('../../intelligence/customers/actions')
  await triggerOnlineSourcingAction(requestId, locale)
  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
}

export async function handleGenerateUnifiedReport(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string
  
  const { generateUnifiedOnlineReportAction } = await import('../../intelligence/customers/actions')
  await generateUnifiedOnlineReportAction(requestId, locale)
  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
}

export async function handlePromoteOnlineQuote(formData: FormData) {
  const quoteId = formData.get('quoteId') as string
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string
  
  const { promoteOnlineQuoteToSnapshotAction } = await import('../../intelligence/customers/actions')
  await promoteOnlineQuoteToSnapshotAction(quoteId, locale)
  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
}

export async function handleGenerateOfflineAIReport(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string
  
  const { generateUnifiedOfflineReportAction } = await import('../../intelligence/customers/actions')
  await generateUnifiedOfflineReportAction(requestId, locale)
  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
}

export async function handleGenerateFinalSynthesisProposal(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const locale = formData.get('locale') as string
  
  const { generateFinalProposalSynthesisAction } = await import('../../intelligence/customers/actions')
  await generateFinalProposalSynthesisAction(requestId, locale)
  revalidatePath(`/${locale}/staff/workspace/${requestId}`)
}

export async function handleSendClarificationMessage(formData: FormData) {
  const requestId = formData.get('requestId') as string
  const messageText = (formData.get('messageText') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'

  if (!requestId || !messageText.trim()) {
    throw new Error('Missing requestId or messageText')
  }

  try {
    const { staffMember } = await getActionPermissions(requestId, locale)

    const { createAdminClient } = await import('@/lib/dal/customers')
    const adminClient = await createAdminClient()

    // 1. Fetch request details to get customer ID and code
    const { data: request, error: fetchErr } = await adminClient
      .from('requests')
      .select('id, request_code, customer_id')
      .eq('id', requestId)
      .single()

    if (fetchErr || !request) {
      throw new Error('Request not found')
    }

    // 2. Insert message into request_messages table
    const { error: insertErr } = await adminClient
      .from('request_messages')
      .insert({
        request_id: requestId,
        sender_type: 'staff',
        sender_id: staffMember.auth_user_id || staffMember.id,
        message: messageText.trim()
      })

    if (insertErr) {
      throw new Error(`Failed to save message to chat table: ${insertErr.message}`)
    }

    // 3. Send email notification to customer
    const { sendClarificationEmail } = await import('@/lib/notifications/email')
    if (request.customer_id) {
      await sendClarificationEmail({
        customerId: request.customer_id,
        requestCode: request.request_code,
        messageText: messageText.trim(),
        locale,
        requestId: request.id
      }).catch(e => console.error('[ACTIONS] sendClarificationEmail failed:', e.message))
    }

    // 4. Log Timeline event
    const { logTimelineEvent } = await import('@/lib/dal/timeline')
    await logTimelineEvent({
      requestId,
      transitionName: 'CLARIFICATION_REQUESTED',
      notes: `Staff query sent to customer: "${messageText.trim().substring(0, 60)}..."`,
      changedByStaffId: staffMember.id
    })

    revalidatePath(`/${locale}/staff/workspace/${requestId}`)
  } catch (err: any) {
    console.error('[ACTIONS] handleSendClarificationMessage error:', err.message)
    redirect(`/${locale}/staff/workspace/${requestId}?error=${encodeURIComponent(err.message)}`)
  }
}
