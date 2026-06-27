/**
 * FINDORA — Free OTP System
 * DB-based 6-digit OTP with expiry. SMS-provider-agnostic (plug any provider).
 * Currently: Console log in dev, ready for Twilio/Vonage/any SMS in prod.
 */

import crypto from 'crypto';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('notifications/otp')

// ─── Types ────────────────────────────────────────────────────────────────────
export type OtpPurpose = 'contributor_registration' | 'merchant_registration' | 'withdrawal_verification';

export interface SendOtpResult {
  success: boolean;
  expiresInSeconds: number;
  isDev?: boolean; // In dev, code is returned for testing
  devCode?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function generateOtpCode(): string {
  // Cryptographically secure 6-digit code
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code + process.env.OTP_SALT || 'findora_otp_salt_2026').digest('hex');
}

/**
 * Send OTP to a phone number.
 * In production: integrate with SMS provider by replacing the sendViaSMS function.
 * In development: logs to console and returns devCode.
 */
export async function sendOtp(
  phoneNumber: string,
  purpose: OtpPurpose,
  adminClient: any
): Promise<SendOtpResult> {
  try {
    // 1. Invalidate any existing unused OTPs for this phone+purpose
    await adminClient
      .from('phone_otp_codes')
      .update({ is_used: true })
      .eq('phone_number', phoneNumber)
      .eq('purpose', purpose)
      .eq('is_used', false);

    // 2. Generate new code
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 3. Store hashed code in DB
    const { error: insertError } = await adminClient
      .from('phone_otp_codes')
      .insert({
        phone_number: phoneNumber,
        code_hash: codeHash,
        purpose,
        expires_at: expiresAt,
      });

    if (insertError) {
      log.error('[OTP] Insert error:', insertError.message);
      return { success: false, expiresInSeconds: 0, error: 'Failed to create OTP' };
    }

    // 4. Send via SMS provider
    const isDev = process.env.NODE_ENV !== 'production';
    
    if (!isDev) {
      // ─── PRODUCTION: Plug your SMS provider here ────────────────────────
      // Option A — Twilio:
      // await sendViaTwilio(phoneNumber, `FINDORA: Your code is ${code}. Valid 10 minutes.`);
      // 
      // Option B — Vonage:
      // await sendViaVonage(phoneNumber, `FINDORA: Your code is ${code}. Valid 10 minutes.`);
      //
      // Option C — AWS SNS:
      // await sendViaAwsSns(phoneNumber, `FINDORA: Your code is ${code}. Valid 10 minutes.`);
      //
      // For WhatsApp via WhatsApp Business API:
      // await sendViaWhatsApp(phoneNumber, code);
      // ────────────────────────────────────────────────────────────────────
      log.info(`[OTP] Production SMS to ${phoneNumber} — provider not configured`);
    } else {
      // Development: log to console
      log.info(`\n╔══════════════════════════════════╗`);
      log.info(`║  FINDORA OTP (Development Mode)   ║`);
      log.info(`║  Phone: ${phoneNumber.padEnd(23)} ║`);
      log.info(`║  Code:  ${code.padEnd(23)} ║`);
      log.info(`║  Purpose: ${purpose.padEnd(21)} ║`);
      log.info(`╚══════════════════════════════════╝\n`);
    }

    return {
      success: true,
      expiresInSeconds: 600, // 10 minutes
      isDev,
      devCode: isDev ? code : undefined, // Only return code in dev
    };
  } catch (err: any) {
    log.error('[OTP] Error sending OTP:', err);
    return { success: false, expiresInSeconds: 0, error: 'Internal error' };
  }
}

/**
 * Verify OTP code entered by user.
 * Checks: not expired, not used, attempts < 5, hash matches.
 */
export async function verifyOtp(
  phoneNumber: string,
  code: string,
  purpose: OtpPurpose,
  adminClient: any
): Promise<VerifyOtpResult> {
  try {
    const codeHash = hashOtpCode(code);
    const now = new Date().toISOString();

    // 1. Find valid OTP record
    const { data: otpRecord, error } = await adminClient
      .from('phone_otp_codes')
      .select('id, attempts, expires_at, is_used')
      .eq('phone_number', phoneNumber)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: 'Database error' };
    }

    if (!otpRecord) {
      return { success: false, error: 'OTP expired or not found. Please request a new code.' };
    }

    const record = otpRecord as { id: string; attempts: number; expires_at: string; is_used: boolean };

    // 2. Check max attempts (5 tries)
    if (record.attempts >= 5) {
      // Invalidate the record
      await adminClient
        .from('phone_otp_codes')
        .update({ is_used: true })
        .eq('id', record.id);
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }

    // 3. Increment attempt count first (prevent timing attacks)
    await adminClient
      .from('phone_otp_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    // 4. Verify hash (compare by re-fetching to ensure the hash matches)
    const { data: fullRecord } = await adminClient
      .from('phone_otp_codes')
      .select('code_hash')
      .eq('id', record.id)
      .maybeSingle();

    const full = fullRecord as { code_hash: string } | null;
    if (!full || full.code_hash !== codeHash) {
      const remaining = 4 - record.attempts;
      return {
        success: false,
        error: remaining > 0 ? `Invalid code. ${remaining} attempts remaining.` : 'Invalid code. Please request a new one.',
      };
    }

    // 5. Mark as used (one-time use)
    await adminClient
      .from('phone_otp_codes')
      .update({ is_used: true })
      .eq('id', record.id);

    return { success: true };
  } catch (err: any) {
    log.error('[OTP] Verify error:', err);
    return { success: false, error: 'Internal error verifying OTP' };
  }
}
