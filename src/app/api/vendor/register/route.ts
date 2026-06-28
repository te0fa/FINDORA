/**
 * POST /api/vendor/register
 * Public endpoint for vendor self-registration.
 * Verifies OTP and registers vendor.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, VENDOR_REGISTRATION_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'
import { verifyOtp } from '@/lib/notifications/otp'

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
  email?: string
  website?: string
  notes?: string
  otpCode: string
}

function validateBody(body: Partial<VendorRegistrationBody>): string | null {
  if (!body.businessNameAr?.trim()) return 'Business name (Arabic) is required'
  if (!body.merchantType?.trim()) return 'Merchant type is required'
  if (!body.category?.trim()) return 'Category is required'
  if (!body.governorate?.trim()) return 'Governorate is required'
  if (!body.primaryPhone?.trim()) return 'Primary phone is required'
  if (!body.otpCode?.trim()) return 'Verification OTP is required'
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return 'Invalid email address'
  }
  if (body.primaryPhone && !/^01[0-9]{9}$/.test(body.primaryPhone.replace(/\s/g, ''))) {
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

  const adminClient = createAdminClient()

  // 1. Verify OTP first
  const otpResult = await verifyOtp(body.primaryPhone!.trim(), body.otpCode!.trim(), 'vendor_auth', adminClient)
  if (!otpResult.success) {
    return NextResponse.json({ error: otpResult.error }, { status: 400 })
  }

  // 2. Check for duplicate phone number
  const { data: existing } = await adminClient
    .from('vendors')
    .select('id')
    .eq('whatsapp_number', body.primaryPhone!.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A vendor with this phone number is already registered.' },
      { status: 409 }
    )
  }

  const email = `${body.primaryPhone!.trim()}@vendor.findora.com`;
  const password = `${body.primaryPhone!.trim()}_vendor_secure_2026!`;

  // 3. Create Supabase Auth user
  let authUserId: string | null = null;
  try {
    const { data: usersList } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = usersList?.users?.find(u => u.email === email);
    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
    } else {
      const { data: newAuth, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: body.primaryPhone!.trim(),
        phone_confirm: true,
      });
      if (authError || !newAuth.user) {
        log.error('Failed to create auth user', { error: authError?.message })
        return NextResponse.json({ error: 'Failed to create registration credentials.' }, { status: 500 })
      }
      authUserId = newAuth.user.id;
    }
  } catch (err: any) {
    log.error('Auth check error', { error: err.message })
  }

  // 4. Call the atomic postgres function to register the vendor and link auth_user_id
  const { data: vendorId, error } = await adminClient.rpc('fn_register_vendor', {
    p_business_name_ar: body.businessNameAr!.trim(),
    p_business_name_en: body.businessNameEn?.trim() ?? '',
    p_merchant_type: body.merchantType!,
    p_category: body.category!,
    p_governorate: body.governorate!,
    p_city: body.city?.trim() ?? '',
    p_area: body.area?.trim() ?? '',
    p_address: body.address?.trim() ?? '',
    p_primary_phone: body.primaryPhone!.trim(),
    p_secondary_phone: body.secondaryPhone?.trim() ?? '',
    p_email: body.email?.trim() ?? '',
    p_website: body.website?.trim() ?? '',
    p_notes: body.notes?.trim() ?? '',
    p_auth_user_id: authUserId
  })

  if (error) {
    log.error('Failed to create vendor registration via RPC', { error: error.message })
    return NextResponse.json(
      { error: 'Failed to submit registration. Please try again.' },
      { status: 500 }
    )
  }

  // Set is_phone_verified to true since OTP is verified
  await (adminClient
    .from('vendors') as any)
    .update({ is_phone_verified: true })
    .eq('id', vendorId);

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
