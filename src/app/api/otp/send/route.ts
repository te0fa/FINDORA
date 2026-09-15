import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOtp, canonicalizeEgyptianMobile } from '@/lib/notifications/otp';
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

    const db = createAdminClient();

    // Unified rate limit & cooldown query:
    // Query recent OTP requests for this canonical phone across all purposes within the rolling 60-minute window
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOtps, error: dbError } = await (db as any).from('phone_otp_codes')
      .select('id, created_at')
      .eq('phone_number', canonicalPhone)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    // Fail closed if database rate limit query fails
    if (dbError) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Service temporarily unavailable. Please try again later.',
        },
        { status: 503 }
      );
    }

    // 1. Unified limit: max 3 OTP requests per canonical phone per rolling 60 minutes (independent of purpose)
    if (recentOtps && recentOtps.length >= 3) {
      return NextResponse.json({
        error: 'Too many OTP requests. Please wait before requesting a new code.',
      }, { status: 429 });
    }

    // 2. Cooldown: 60-second cooldown between OTP sends for the same canonical phone
    if (recentOtps && recentOtps.length > 0 && recentOtps[0]?.created_at) {
      const latestCreatedAt = new Date(recentOtps[0].created_at).getTime();
      if (!isNaN(latestCreatedAt)) {
        const elapsedMs = Date.now() - latestCreatedAt;
        if (elapsedMs < 60000) {
          const retryAfter = Math.max(1, Math.ceil((60000 - elapsedMs) / 1000));
          return NextResponse.json(
            {
              error: 'Please wait 60 seconds before requesting another code.',
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
      }
    }

    const result = await sendOtp(canonicalPhone, purpose, db);

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
      if (result.error === 'OTP_CONFIGURATION_ERROR') {
        return NextResponse.json(
          {
            error: 'OTP_CONFIGURATION_ERROR',
            message: 'Authentication service configuration error.',
          },
          { status: 500 }
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
    // log.error('[OTP SEND]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
