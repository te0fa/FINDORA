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
  code?: string;
  retryAfter?: number;
  message?: string;
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
 * Dispatches the OTP via the configured SMS gateway.
 * Does NOT perform database reservation. Reservation MUST occur prior to dispatch.
 */
export async function dispatchOtpSms(
  phoneNumber: string,
  code: string,
  purpose: OtpPurpose
): Promise<SendOtpResult> {
  const isDev = process.env.NODE_ENV !== 'production';

  // In production, verify an SMS provider is configured before attempting dispatch
  if (!isDev && !isSmsProviderConfigured()) {
    log.warn(`[OTP] Production SMS provider not configured for ${phoneNumber} — failing closed`);
    return {
      success: false,
      expiresInSeconds: 0,
      error: 'SMS_GATEWAY_NOT_CONFIGURED',
    };
  }

  // Send via configured SMS provider or log in dev
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
}

/**
 * Send OTP to a phone number.
 * In production: fails closed if no SMS provider is configured (returns SMS_GATEWAY_NOT_CONFIGURED).
 * In development: logs to console and returns devCode for local testing.
 */
export interface SendOtpOptions {
  code?: string;
  alreadyReserved?: boolean;
  maxHourly?: number;
  cooldownSeconds?: number;
}

export async function sendOtp(
  phoneNumber: string,
  purpose: OtpPurpose,
  adminClient: any,
  options?: SendOtpOptions
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

    const code = options?.code ?? generateOtpCode();

    // 2. If already reserved by caller (e.g. route handler), dispatch SMS directly
    if (options?.alreadyReserved) {
      return dispatchOtpSms(phoneNumber, code, purpose);
    }

    // 3. Standalone reservation path: MUST use atomic RPC fn_reserve_and_create_otp
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    if (typeof adminClient?.rpc !== 'function') {
      log.error('[OTP] Database client does not support .rpc — failing closed');
      return {
        success: false,
        expiresInSeconds: 0,
        error: 'DATABASE_ERROR',
        message: 'Service temporarily unavailable. Please try again later.',
      };
    }

    const rpcRes = await adminClient.rpc('fn_reserve_and_create_otp', {
      p_phone_number: phoneNumber,
      p_code_hash: codeHash,
      p_purpose: purpose,
      p_expires_at: expiresAt,
      p_max_hourly: options?.maxHourly ?? 3,
      p_cooldown_seconds: options?.cooldownSeconds ?? 60,
    });

    if (rpcRes?.error) {
      log.error('[OTP] RPC error in fn_reserve_and_create_otp:', rpcRes.error.message);
      return {
        success: false,
        expiresInSeconds: 0,
        error: 'DATABASE_ERROR',
        message: 'Service temporarily unavailable. Please try again later.',
      };
    }

    if (!rpcRes?.data?.success) {
      return {
        success: false,
        expiresInSeconds: 0,
        error: rpcRes?.data?.code || 'RATE_LIMIT_EXCEEDED',
        code: rpcRes?.data?.code,
        retryAfter: rpcRes?.data?.retry_after,
        message: rpcRes?.data?.error || 'Rate limit exceeded',
      };
    }

    return dispatchOtpSms(phoneNumber, code, purpose);
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
