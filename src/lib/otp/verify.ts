import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtp as verifyOtpInternal, hashOtpCode } from '@/lib/notifications/otp'
import { normalizePhoneForLookup } from '@/lib/intelligence/lookup-guard'

/**
 * Verify OTP token for a phone number.
 * Returns true if valid, false otherwise.
 */
export async function verifyOtp(phone: string, otpToken: string): Promise<boolean> {
  if (!phone || !otpToken) return false

  const adminClient = createAdminClient()
  const normalizedPhone = normalizePhoneForLookup(phone) || phone

  // 1. Check direct match in phone_otp_codes for purpose 'history_lookup'
  try {
    const res = await verifyOtpInternal(normalizedPhone, otpToken, 'history_lookup', adminClient)
    if (res.success) return true
  } catch {
    // continue fallback check
  }

  // 2. Also check across phone variations for any valid unexpired OTP code
  try {
    const codeHash = hashOtpCode(otpToken)
    const now = new Date().toISOString()
    
    let localDigits = phone
    if (localDigits.startsWith('+20')) localDigits = localDigits.substring(3)
    else if (localDigits.startsWith('+2')) localDigits = localDigits.substring(2)
    if (localDigits.startsWith('0')) localDigits = localDigits.substring(1)

    const phoneFormats = Array.from(new Set([
      phone,
      normalizedPhone,
      `0${localDigits}`,
      `+20${localDigits}`,
      localDigits
    ])).filter(Boolean)

    const { data: record } = await (adminClient as any)
      .from('phone_otp_codes')
      .select('id, attempts, expires_at, is_used, code_hash')
      .in('phone_number', phoneFormats)
      .eq('is_used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (record && record.code_hash === codeHash && (record.attempts ?? 0) < 5) {
      await (adminClient as any)
        .from('phone_otp_codes')
        .update({ is_used: true })
        .eq('id', record.id)
      return true
    }
  } catch (e) {
    console.error('[verifyOtp] Error:', e)
  }

  return false
}
