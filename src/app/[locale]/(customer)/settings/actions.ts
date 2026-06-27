'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { normalizePhone } from '@/lib/phone'
import { revalidatePath } from 'next/cache'

export async function updateProfile(customerId: string, fullName: string, rawPhone: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const phoneObj = normalizePhone(rawPhone)
    const normalizedPhone = phoneObj ? phoneObj.normalized : rawPhone
    const rawPhoneNumber = phoneObj ? phoneObj.raw : rawPhone

    const adminClient = await createAdminClient()
    
    // Check if phone already normalized is in use by another customer
    if (phoneObj) {
      const { data: existingUser } = await adminClient
        .from('customers')
        .select('id')
        .eq('phone_number_normalized', phoneObj.normalized)
        .not('id', 'eq', customerId)
        .maybeSingle()

      if (existingUser) {
        return { success: false, error: 'Phone number already in use.' }
      }
    }

    // Update customer table
    const { error: updateErr } = await adminClient
      .from('customers')
      .update({
        full_name: fullName,
        phone_number_raw: rawPhoneNumber,
        phone_number_normalized: normalizedPhone
      })
      .eq('id', customerId)
      .eq('auth_user_id', user.id)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Also update auth user metadata if desired
    await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    revalidatePath('/[locale]/settings', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updatePassword(password: string, confirmPassword: string) {
  try {
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' }
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
