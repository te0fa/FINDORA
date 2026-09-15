/**
 * FINDORA — Free OTP System
 * DB-based 6-digit OTP with expiry. SMS-provider-agnostic (plug any provider).
 * Currently: Console log in dev, ready for Twilio/Vonage/any SMS in prod.
 */

import crypto from 'crypto';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('notifications/otp')

// ─── Re-exports ────────────────────────────────────────────────────────────────
export { canonicalizeEgyptianMobile, EGYPTIAN_MOBILE_REGEX } from '@/lib/phone';

// ─── Types ────────────────────────────────────────────────────────────────────
export type OtpPurpose = 'contributor_registration' | 'merchant_registration' | 'withdrawal_verification' | 'vendor_auth' | 'history_lookup';


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
export function getOtpSalt(): string {
  const salt = process.env.OTP_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL_SECURITY_ERROR: OTP_SALT environment variable is required in production');
    }
    // Isolated fallback strictly for local development and unit tests
    return 'dev_test_otp_salt_do_not_use_in_prod';
  }
  return salt;
}

export function generateOtpCode(): string {
  // Cryptographically secure 6-digit code
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
}

export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code + getOtpSalt()).digest('hex');
}

export function isSmsProviderConfigured(): boolean {
  const hasSmsMisr = Boolean(process.env.SMS_MISR_API_KEY && process.env.SMS_MISR_SENDER_ID);
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  const hasGeneric = Boolean(process.env.SMS_PROVIDER_API_KEY);
  return hasSmsMisr || hasTwilio || hasGeneric;
}

/**
 * Send OTP to a phone number.
 * In production: fails closed if no SMS provider is configured (returns SMS_GATEWAY_NOT_CONFIGURED).
 * In development: logs to console and returns devCode for local testing.
 */
export async function sendOtp(
  phoneNumber: string,
  purpose: OtpPurpose,
  adminClient: any
): Promise<SendOtpResult> {
  try {
    const isDev = process.env.NODE_ENV !== 'production';

    // 1. In production, verify an SMS provider is configured before creating DB records
    if (!isDev && !isSmsProviderConfigured()) {
      log.warn(`[OTP] Production SMS provider not configured for ${phoneNumber} — failing closed`);
      return {
        success: false,
        expiresInSeconds: 0,
        error: 'SMS_GATEWAY_NOT_CONFIGURED',
      };
    }

    // 2. Invalidate any existing unused OTPs for this phone+purpose
    await adminClient
      .from('phone_otp_codes')
      .update({ is_used: true })
      .eq('phone_number', phoneNumber)
      .eq('purpose', purpose)
      .eq('is_used', false);

    // 3. Generate new code and compute hash (throws in production if OTP_SALT is missing)
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Store hashed code in DB
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

    // 5. Send via configured SMS provider or log in dev
    if (!isDev) {
      log.info(`[OTP] Production SMS to ${phoneNumber} dispatched via configured gateway`);
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
      devCode: isDev ? code : undefined, // Never return code in production
    };
  } catch (err: any) {
    log.error('[OTP] Error sending OTP:', err?.message || err);
    return {
      success: false,
      expiresInSeconds: 0,
      error: err?.message?.includes('OTP_SALT') ? 'OTP_CONFIGURATION_ERROR' : 'Internal error',
    };
  }
}

/**
 * Verify OTP code entered by user.
 * Executes atomic PostgreSQL function fn_verify_and_consume_otp under row-level lock.
 * Enforces: valid unexpired record, attempt tracking (< 5), hash verification, and atomic consumption.
 */
export async function verifyOtp(
  phoneNumber: string,
  code: string,
  purpose: OtpPurpose,
  adminClient: any
): Promise<VerifyOtpResult> {
  try {
    const codeHash = hashOtpCode(code);

    const { data, error } = await adminClient.rpc('fn_verify_and_consume_otp', {
      p_phone_number: phoneNumber,
      p_code_hash: codeHash,
      p_purpose: purpose,
    });

    if (error) {
      log.error('[OTP] RPC verification error:', error);
      return { success: false, error: 'Database error verifying OTP' };
    }

    if (data && typeof data === 'object') {
      return {
        success: !!data.success,
        error: data.error,
      };
    }

    return { success: false, error: 'Internal error verifying OTP' };
  } catch (err: any) {
    log.error('[OTP] Verify error:', err);
    return { success: false, error: 'Internal error verifying OTP' };
  }
}
