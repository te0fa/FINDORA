/**
 * POST /api/vendor/register
 * Public endpoint for vendor self-registration.
 * Registers vendor with email + password (Supabase Auth) and links to vendors table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, VENDOR_REGISTRATION_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:vendor/register')

interface VendorRegistrationBody {
  businessNameAr: string
  businessNameEn?: string
  merchantType: string
  category: string
  governorate: string
  city?: string
  area?: string
  address?: string
  primaryPhone: string
  secondaryPhone?: string
  email: string
  password: string
  website?: string
  notes?: string
}

function validateBody(body: Partial<VendorRegistrationBody>): string | null {
  if (!body.businessNameAr?.trim()) return 'Business name (Arabic) is required'
  if (!body.merchantType?.trim()) return 'Merchant type is required'
  if (!body.category?.trim()) return 'Category is required'
  if (!body.governorate?.trim()) return 'Governorate is required'
  if (!body.primaryPhone?.trim()) return 'Primary phone is required'
  if (!body.email?.trim()) return 'Email address is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return 'Invalid email address'
  }
  if (!body.password || body.password.length < 6) {
    return 'Password must be at least 6 characters'
  }
  const cleanPhone = body.primaryPhone.replace(/\s/g, '')
  if (!/^01[0-9]{9}$/.test(cleanPhone)) {
    return 'Invalid Egyptian phone number'
  }
  return null
}

async function handler(request: NextRequest): Promise<NextResponse> {
  let body: Partial<VendorRegistrationBody>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validationError = validateBody(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const trimmedEmail = body.email!.trim().toLowerCase()
  const trimmedPhone = body.primaryPhone!.replace(/\s/g, '').trim()
  const adminClient = createAdminClient()

  // 1. Check for duplicate phone number in vendors table
  const { data: existingPhone } = await (adminClient
    .from('vendors') as any)
    .select('id')
    .eq('whatsapp_number', trimmedPhone)
    .maybeSingle()

  if (existingPhone) {
    return NextResponse.json(
      { error: 'A vendor with this phone number is already registered.' },
      { status: 409 }
    )
  }

  // 2. Check for duplicate portal_email in vendors table
  const { data: existingPortalEmail } = await (adminClient
    .from('vendors') as any)
    .select('id')
    .eq('portal_email', trimmedEmail)
    .maybeSingle()

  if (existingPortalEmail) {
    return NextResponse.json(
      { error: 'A vendor with this email address is already registered.' },
      { status: 409 }
    )
  }

  // 3. Create Supabase Auth user natively
  const { data: newAuth, error: authError } = await adminClient.auth.admin.createUser({
    email: trimmedEmail,
    password: body.password!,
    email_confirm: true,
    user_metadata: {
      full_name: body.businessNameAr!.trim(),
      role: 'vendor',
      phone: trimmedPhone,
    },
  })

  if (authError || !newAuth?.user) {
    if (
      authError?.message?.toLowerCase().includes('already registered') ||
      authError?.message?.toLowerCase().includes('already exists') ||
      authError?.message?.toLowerCase().includes('unique')
    ) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      )
    }
    log.error('Failed to create auth user for vendor', { error: authError?.message })
    return NextResponse.json(
      { error: authError?.message || 'Failed to create registration credentials.' },
      { status: 400 }
    )
  }

  const authUserId = newAuth.user.id

  // 4. Call the atomic postgres function to register the vendor and link auth_user_id
  const { data: vendorId, error: rpcError } = await adminClient.rpc('fn_register_vendor', {
    p_business_name_ar: body.businessNameAr!.trim(),
    p_business_name_en: body.businessNameEn?.trim() ?? '',
    p_merchant_type: body.merchantType!,
    p_category: body.category!,
    p_governorate: body.governorate!,
    p_city: body.city?.trim() ?? '',
    p_area: body.area?.trim() ?? '',
    p_address: body.address?.trim() ?? '',
    p_primary_phone: trimmedPhone,
    p_secondary_phone: body.secondaryPhone?.trim() ?? '',
    p_email: trimmedEmail,
    p_website: body.website?.trim() ?? '',
    p_notes: body.notes?.trim() ?? '',
    p_auth_user_id: authUserId,
  })

  if (rpcError || !vendorId) {
    log.error('Failed to create vendor registration via RPC', { error: rpcError?.message })
    // Compensation: delete the created auth user so we don't leave orphaned auth accounts
    await adminClient.auth.admin.deleteUser(authUserId).catch(() => {})
    return NextResponse.json(
      { error: 'Failed to submit registration. Please try again.' },
      { status: 500 }
    )
  }

  // 5. Populate portal_email on vendors table
  await (adminClient
    .from('vendors') as any)
    .update({ portal_email: trimmedEmail })
    .eq('id', vendorId)

  log.info('New vendor registration submitted successfully', {
    vendorId,
    businessName: body.businessNameAr,
    governorate: body.governorate,
  })

  return NextResponse.json(
    { success: true, message: 'Registration submitted successfully. Welcome to FINDORA!', id: vendorId },
    { status: 201 }
  )
}

export const POST = withRateLimit(VENDOR_REGISTRATION_RATE_LIMIT, handler)
