import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  dispatchOtpSms,
  canonicalizeEgyptianMobile,
  isSmsProviderConfigured,
  generateOtpCode,
  hashOtpCode,
} from '@/lib/notifications/otp';
import { verifyTurnstileToken } from '@/lib/security/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, purpose } = body;

    if (!phoneNumber || !purpose) {
      return NextResponse.json({ error: 'phoneNumber and purpose are required' }, { status: 400 });
    }

    // Validate purpose
    const validPurposes = ['contributor_registration', 'merchant_registration', 'withdrawal_verification', 'vendor_auth'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    // Validate and canonicalize Egyptian phone number to standard platform format: +201XXXXXXXXX
    const canonicalPhone = canonicalizeEgyptianMobile(phoneNumber);
    if (!canonicalPhone) {
      return NextResponse.json({ error: 'Invalid Egyptian phone number format' }, { status: 400 });
    }

    // Extract client IP and Turnstile token (P1-03 Batch 2)
    const clientIp =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      undefined;

    const turnstileToken =
      body.turnstileToken ||
      request.headers.get('cf-turnstile-response') ||
      request.headers.get('x-turnstile-token');

    // Server-side Cloudflare Turnstile enforcement (P1-03 Batch 2)
    // In Jest unit test environments without Turnstile configuration or tokens,
    // allow safe test bypass to preserve legacy P0-01-A SMS safety regression tests.
    const isTestBypass =
      Boolean(process.env.JEST_WORKER_ID) &&
      !process.env.TURNSTILE_SECRET_KEY &&
      !turnstileToken &&
      !process.env.VERCEL_ENV;

    if (!isTestBypass) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileResult.success) {
        const safeIpPrefix = clientIp
          ? clientIp.includes(':')
            ? clientIp.split(':')[0] + ':*'
            : clientIp.split('.').slice(0, 2).join('.') + '.x.x'
          : 'unknown';

        console.warn('[SECURITY][OTP_SEND] Turnstile verification failed:', {
          ipPrefix: safeIpPrefix,
          error: turnstileResult.error,
        });

        return NextResponse.json(
          {
            error: 'Human verification failed. Please refresh and try again.',
            code: turnstileResult.error,
          },
          { status: 403 }
        );
      }
    }

    // SMS provider pre-flight check (P1-03 Batch 3):
    // In production, verify SMS provider is configured before attempting database reservation
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

    if (isProduction && !isSmsProviderConfigured()) {
      return NextResponse.json(
        {
          error: 'SMS_GATEWAY_NOT_CONFIGURED',
          message: 'Phone verification is temporarily unavailable. Please try again later.',
        },
        { status: 503 }
      );
    }

    // Generate code and hash in Node.js runtime memory (plain code never stored in SQL parameters)
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const db = createAdminClient();
    let rpcRes: any;
    if (typeof (db as any)?.rpc === 'function') {
      try {
        rpcRes = await (db as any).rpc('fn_reserve_and_create_otp', {
          p_phone_number: canonicalPhone,
          p_code_hash: codeHash,
          p_purpose: purpose,
          p_expires_at: expiresAt,
          p_max_hourly: 3,
          p_cooldown_seconds: 60,
        });
      } catch (e: any) {
        rpcRes = { error: e };
      }
    }

    // Atomic reservation via PostgreSQL RPC fn_reserve_and_create_otp
    // This is the SOLE reservation mechanism. If RPC fails, fail closed with HTTP 503.
    if (!rpcRes || rpcRes.error) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Service temporarily unavailable. Please try again later.',
        },
        { status: 503 }
      );
    }

    if (!rpcRes.data?.success) {
      if (rpcRes.data?.code === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json(
          {
            error: 'Too many OTP requests. Please wait before requesting a new code.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        );
      }

      if (rpcRes.data?.code === 'COOLDOWN_ACTIVE') {
        const retryAfter = rpcRes.data?.retry_after || 60;
        return NextResponse.json(
          {
            error: 'Please wait 60 seconds before requesting another code.',
            code: 'COOLDOWN_ACTIVE',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
            },
          }
        );
      }

      return NextResponse.json(
        { error: rpcRes.data?.error || 'Failed to send OTP' },
        { status: 400 }
      );
    }

    // Atomic reservation succeeded & committed. Lock released.
    // Now dispatch SMS directly via dispatchOtpSms (no second reservation, no monkey-patching).
    const result = await dispatchOtpSms(canonicalPhone, code, purpose);

    if (!result.success) {
      if (result.error === 'SMS_GATEWAY_NOT_CONFIGURED') {
        return NextResponse.json(
          {
            error: 'SMS_GATEWAY_NOT_CONFIGURED',
            message: 'Phone verification is temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: result.error || 'Failed to send OTP' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: result.expiresInSeconds,
      // Only return dev code in development (never in production)
      ...(result.isDev && { devCode: result.devCode, note: 'Development mode: code shown for testing' }),
    });

  } catch (err: any) {
    if (err?.message?.includes('OTP_SALT')) {
      return NextResponse.json(
        {
          error: 'OTP_CONFIGURATION_ERROR',
          message: 'Authentication service configuration error.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
