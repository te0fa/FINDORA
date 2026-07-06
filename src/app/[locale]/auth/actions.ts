'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureCustomerProfile, getCustomerByAuthId, createAdminClient, linkAuthUserToCustomer } from '@/lib/dal/customers'
import { getStaffMemberByAuthUserId, resolveStaffHomePath } from '@/lib/dal/staff'
import { normalizePhone } from '@/lib/phone'
import { headers } from 'next/headers'

function getLocaleFromReferer(referer: string): string {
  if (referer.includes('/en/') || referer.endsWith('/en')) return 'en'
  return 'ar'
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const referer = (await headers()).get('referer') || ''
  const locale = getLocaleFromReferer(referer)

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nextPath = formData.get('next') as string

  const getRedirectPath = (defaultPath: string) => {
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      return nextPath
    }
    return defaultPath
  }

  // 1. Sign In
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const nextSuffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/${locale}/auth/login?error=${encodeURIComponent(error.message)}${nextSuffix}`)
  }

  // 2. Get User
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const nextSuffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/${locale}/auth/login?error=invalid_login${nextSuffix}`)
  }

  // 3. Check Staff First (Priority)
  const staffMember = await getStaffMemberByAuthUserId(user.id)

  if (staffMember && staffMember.is_active) {
    const targetPath = getRedirectPath(resolveStaffHomePath(locale, staffMember))
    redirect(targetPath)
  }

  // 4. Check Customer Only if Not Staff
  const customer = await getCustomerByAuthId(user.id)

  if (customer) {
    const targetPath = getRedirectPath(`/${locale}/dashboard`)
    redirect(targetPath)
  }

  // 4b. Check Vendor if Not Staff or Customer
  const adminClient = await createAdminClient()
  const { data: vendor } = await (adminClient
    .from('vendors') as any)
    .select('id, display_name, system_status')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (vendor) {
    if (vendor.system_status === 'Suspended') {
      await supabase.auth.signOut()
      const nextSuffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''
      redirect(`/${locale}/auth/login?error=account_suspended${nextSuffix}`)
    }
    const targetPath = getRedirectPath(`/${locale}/vendor/auctions`)
    redirect(targetPath)
  }

  // 5. Unauthorized (No active staff, customer, or vendor profile)
  console.log('UNAUTHORIZED: No active profile found')
  console.log('--- LOGIN TRACE END ---')
  await supabase.auth.signOut()
  const nextSuffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''
  redirect(`/${locale}/auth/login?error=account_not_linked${nextSuffix}`)
}

export async function sendSignupOtp(phoneNumber: string) {
  try {
    const phoneObj = normalizePhone(phoneNumber)
    if (!phoneObj) {
      return { error: 'invalid_phone' }
    }
    // Check if phone already registered to an auth user
    const adminClient = await createAdminClient()
    const { data: existingUser } = await adminClient
      .from('customers')
      .select('auth_user_id')
      .eq('phone_number_normalized', phoneObj.normalized)
      .not('auth_user_id', 'is', null)
      .single()

    if (existingUser) {
      return { error: 'phone_in_use' }
    }

    console.log(`[OTP MOCK] Sending signup code 123456 to ${phoneObj.normalized}`)
    // Here you would call your SMS provider from the admin settings
    return { success: true }
  } catch (error: any) {
    console.error('Error sending signup OTP:', error)
    return { error: 'server_error' }
  }
}

export async function verifySignupOtp(phoneNumber: string, otp: string) {
  try {
    if (otp !== '123456') {
      return { error: 'invalid_otp' }
    }
    return { success: true }
  } catch (error: any) {
    console.error('Error verifying signup OTP:', error)
    return { error: 'server_error' }
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const referer = (await headers()).get('referer') || ''
  const locale = getLocaleFromReferer(referer)

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      const phoneObj = normalizePhone(phone)
      if (phoneObj) {
        const adminClient = await createAdminClient()
        
        // Try to link to an existing guest profile
        const linked = await linkAuthUserToCustomer(data.user.id, phoneObj.normalized)
        
        if (!linked) {
          // Create new customer profile with verified phone
          const customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`
          const { error: insertError } = await adminClient.from('customers').insert({
            auth_user_id: data.user.id,
            full_name: fullName,
            customer_code: customerCode,
            phone_number_raw: phoneObj.raw,
            phone_number_normalized: phoneObj.normalized,
            phone_verified_at: new Date().toISOString(),
            preferred_language: locale,
            email: email,
            status: 'active'
          })
          if (insertError) {
            console.error('Error inserting customer:', insertError)
            return { error: insertError.message }
          }
        } else {
          // Profile was linked, now mark phone as verified and update missing info
          const { error: updateError } = await adminClient.from('customers').update({
            phone_verified_at: new Date().toISOString(),
            full_name: fullName,
            email: email
          }).eq('id', linked.id)
          if (updateError) {
            console.error('Error updating customer:', updateError)
            return { error: updateError.message }
          }
        }
        
        // Auto-confirm email to allow immediate login since phone is verified
        const { error: confirmError } = await adminClient.auth.admin.updateUserById(data.user.id, {
          email_confirm: true
        })
        if (confirmError) {
          console.error('Error auto-confirming email:', confirmError)
          return { error: confirmError.message }
        }
        
      } else {
        const customerProfile = await ensureCustomerProfile(data.user.id, fullName, locale)
        if (!customerProfile) {
          return { error: 'Failed to create customer profile' }
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Signup error:', err)
    return { error: err.message || 'System error during signup' }
  }
}

export async function signOut() {
  const supabase = await createClient()
  const referer = (await headers()).get('referer') || ''
  const locale = getLocaleFromReferer(referer)

  await supabase.auth.signOut()
  redirect(`/${locale}/auth/login`)
}