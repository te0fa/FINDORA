'use server'

import { createAdminClient, upsertGuestCustomerByPhone, isCustomerEligibleForFreeTrial, consumeFreeTrial } from '@/lib/dal/customers'
import { createSourcingRequest } from '@/lib/dal/requests'
import { autoAssignReviewerToRequest } from '@/lib/dal/staff'
import { normalizePhone } from '@/lib/phone'
import { revalidatePath } from 'next/cache'

const REFERENCE_IMAGE_BUCKET = 'request-reference-images'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export type StartRequestFieldErrors = {
  phone_number?: string
  title?: string
  reference_image?: string
}

export type StartRequestFormValues = {
  full_name: string
  phone_number: string
  email: string
  request_kind: string
  item_type: string
  title: string
  budget_min: string
  budget_max: string
  urgency_level: string
  execution_requested: 'on' | 'off'
  followup_requested: 'on' | 'off'
  site_visit_requested: 'on' | 'off'
  raw_description: string
  preferred_brands: string
  preferred_models: string
  preferred_specs: string
  condition_preference: string
  allow_alternatives: 'on' | 'off'
  priority_focus: string
  search_scope: string
  preferred_governorate: string
  preferred_area: string
  delivery_needed: 'on' | 'off'
  notes: string
  show_detailed: 'on' | 'off'
  image_search_intent?: string
}

export type StartRequestState = {
  success?: boolean
  error?: string
  requestCode?: string
  phoneUsed?: string
  fieldErrors?: StartRequestFieldErrors
  formError?: string
  formValues?: StartRequestFormValues
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
}

function buildFormError(fieldErrors: StartRequestFieldErrors, locale: string) {
  const hasPhone = !!fieldErrors.phone_number
  const hasTitle = !!fieldErrors.title
  const hasImage = !!fieldErrors.reference_image

  if (locale === 'ar') {
    if (hasPhone && (hasTitle || hasImage)) {
      return 'من فضلك راجع رقم الموبايل وملخص الطلب أو الصورة المرجعية'
    }
    if (hasPhone) return 'من فضلك راجع رقم الموبايل'
    if (hasTitle || hasImage) return 'من فضلك راجع ملخص الطلب أو الصورة المرجعية'
    return 'من فضلك راجع الحقول المحددة'
  }

  if (hasPhone && (hasTitle || hasImage)) {
    return 'Please review the phone number and the short summary or reference image'
  }
  if (hasPhone) return 'Please review the phone number'
  if (hasTitle || hasImage) return 'Please review the short summary or reference image'
  return 'Please review the highlighted fields'
}

async function uploadReferenceImage(file: File, customerId: string) {
  const adminClient = await createAdminClient()

  const safeName = sanitizeFileName(file.name || 'reference-image')
  const path = `${customerId}/${Date.now()}-${safeName}`

  console.log(`[UPLOAD_DEBUG] Initiating Supabase Storage upload. Path="${path}", Size=${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  const { error } = await adminClient.storage
    .from(REFERENCE_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }

  return path
}

async function deleteReferenceImage(path: string) {
  const adminClient = await createAdminClient()

  const { error } = await adminClient.storage
    .from(REFERENCE_IMAGE_BUCKET)
    .remove([path])

  if (error) {
    console.error('Failed to delete uploaded reference image during cleanup:', error)
  }
}

export async function submitQuickRequest(
  prevState: StartRequestState | null,
  formData: FormData
): Promise<StartRequestState> {
  const locale = ((formData.get('locale') as string) || 'ar').trim()

  let uploadedReferenceImagePath: string | null = null

  const formValues: StartRequestFormValues = {
    full_name: ((formData.get('full_name') as string) || '').trim(),
    phone_number: ((formData.get('phone_number') as string) || '').trim(),
    email: ((formData.get('email') as string) || '').trim(),
    title: ((formData.get('title') as string) || '').trim(),
    budget_min: ((formData.get('budget_min') as string) || '').trim(),
    budget_max: ((formData.get('budget_max') as string) || '').trim(),
    urgency_level: ((formData.get('urgency_level') as string) || 'normal').trim(),
    execution_requested: formData.get('execution_requested') === 'on' ? 'on' : 'off',
    followup_requested: formData.get('followup_requested') === 'on' ? 'on' : 'off',
    site_visit_requested: formData.get('site_visit_requested') === 'on' ? 'on' : 'off',
    raw_description: ((formData.get('raw_description') as string) || '').trim(),
    preferred_brands: ((formData.get('preferred_brands') as string) || '').trim(),
    preferred_models: ((formData.get('preferred_models') as string) || '').trim(),
    preferred_specs: ((formData.get('preferred_specs') as string) || '').trim(),
    condition_preference: ((formData.get('condition_preference') as string) || 'new').trim(),
    allow_alternatives: formData.get('allow_alternatives') === 'on' ? 'on' : 'off',
    priority_focus: ((formData.get('priority_focus') as string) || 'best_value').trim(),
    search_scope: ((formData.get('search_scope') as string) || 'online_and_offline').trim(),
    preferred_governorate: ((formData.get('preferred_governorate') as string) || '').trim(),
    preferred_area: ((formData.get('preferred_area') as string) || '').trim(),
    delivery_needed: formData.get('delivery_needed') === 'on' ? 'on' : 'off',
    notes: ((formData.get('notes') as string) || '').trim(),
    request_kind: ((formData.get('request_kind') as string) || 'everyday_purchase').trim(),
    item_type: ((formData.get('item_type') as string) || 'product').trim(),
    show_detailed: formData.get('show_detailed') === 'on' ? 'on' : 'off',
    image_search_intent: ((formData.get('image_search_intent') as string) || undefined),
  }

  try {
    const referenceImageCandidate = formData.get('reference_image')
    const referenceImage =
      referenceImageCandidate instanceof File && referenceImageCandidate.size > 0
        ? referenceImageCandidate
        : null

    if (referenceImage) {
      console.log(`[UPLOAD_DEBUG] Server received reference image: Name="${referenceImage.name}", Type="${referenceImage.type}", Size=${referenceImage.size} bytes (${(referenceImage.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log('[UPLOAD_DEBUG] No reference image file received on server.');
    }

    const fieldErrors: StartRequestFieldErrors = {}

    const phoneObj = normalizePhone(formValues.phone_number)
    if (!phoneObj) {
      fieldErrors.phone_number =
        locale === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number'
    }

    if (!formValues.title && !referenceImage) {
      fieldErrors.title =
        locale === 'ar'
          ? 'اكتب ملخصًا قصيرًا أو ارفع صورة مرجعية'
          : 'Write a short summary or upload a reference image'
    }

    if (referenceImage) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (typeof referenceImage.size !== 'number') {
        fieldErrors.reference_image = locale === 'ar' ? 'ملف غير صالح' : 'INVALID_FILE';
      } else if (!referenceImage.type?.startsWith('image/')) {
        fieldErrors.reference_image =
          locale === 'ar'
            ? 'مسموح فقط برفع الصور.'
            : 'Only image files are allowed.';
      } else if (referenceImage.size > MAX_FILE_SIZE) {
        fieldErrors.reference_image =
          locale === 'ar'
            ? 'حجم الصورة لازم يكون أقل من ٥ ميجا.'
            : 'Image size must be less than 5MB.';
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        fieldErrors,
        formError: buildFormError(fieldErrors, locale),
        formValues,
      }
    }

    const requestKind = formValues.request_kind

    const budgetMin =
      formValues.budget_min !== '' ? Number(formValues.budget_min) : undefined
    const budgetMax =
      formValues.budget_max !== '' ? Number(formValues.budget_max) : undefined

    const customer = await upsertGuestCustomerByPhone(
      formValues.phone_number,
      formValues.full_name,
      formValues.email || undefined,
      locale
    )

    if (referenceImage) {
      uploadedReferenceImagePath = await uploadReferenceImage(referenceImage, customer.id)
    }

    const fallbackTitle =
      locale === 'ar' ? 'طلب بصورة مرجعية' : 'Request with reference image'

    let serviceFeeAmount: number | null = null
    const isEligible = await isCustomerEligibleForFreeTrial(customer.id)
    if (isEligible && requestKind === 'everyday_purchase') {
      serviceFeeAmount = 0
      await consumeFreeTrial(customer.id)
      console.log(`[FREE_TRIAL] Applied free everyday purchase to customer ${customer.id}`)
    }

    const request = await createSourcingRequest({
      customerId: customer.id,
      title: formValues.title || fallbackTitle,
      rawDescription: formValues.raw_description,
      status: 'open',
      channel: 'landing_page',
      requestKind,
      intakeMode: 'quick',
      serviceFeeAmount,
      executionRequested: formValues.execution_requested === 'on',
      followupRequested: formValues.followup_requested === 'on',
      siteVisitRequested: formValues.site_visit_requested === 'on',
      referenceImagePath: uploadedReferenceImagePath,
      autoSubmit: true,
      preferences: {
        budget_min: budgetMin,
        budget_max: budgetMax,
        urgency_level: formValues.urgency_level,
        preferred_brands: formValues.preferred_brands || undefined,
        preferred_models: formValues.preferred_models || undefined,
        preferred_specs: formValues.preferred_specs || undefined,
        condition_preference: formValues.condition_preference,
        allow_alternatives: formValues.allow_alternatives === 'on',
        priority_focus: formValues.priority_focus,
        search_scope: formValues.search_scope,
        preferred_governorate: formValues.preferred_governorate || undefined,
        preferred_area: formValues.preferred_area || undefined,
        delivery_needed: formValues.delivery_needed === 'on',
        notes: formValues.notes || undefined,
        knows_market_price: false,
        item_type: formValues.item_type,
        image_search_intent: formValues.image_search_intent,
      },
    })

    // --- AUTO ASSIGNMENT ---
    try {
      await autoAssignReviewerToRequest(request.id, null)
    } catch (assignError) {
      console.warn('Auto-assignment failed for request:', request.request_code, assignError)
      // We don't fail the whole request creation if assignment fails
    }

    revalidatePath(`/${locale}/track-request`)
    revalidatePath(`/${locale}/recover-requests`)

    return {
      success: true,
      requestCode: request.request_code,
      phoneUsed: phoneObj!.raw,
    }
  } catch (error: any) {
    if (uploadedReferenceImagePath) {
      await deleteReferenceImage(uploadedReferenceImagePath)
    }

    console.error('Error submitting quick request:', error)

    return {
      error: error.message || 'unknown_error',
      formError:
        locale === 'ar'
          ? 'حدث خطأ غير متوقع أثناء إرسال الطلب'
          : 'Unexpected error while submitting the request',
      formValues,
    }
  }
}