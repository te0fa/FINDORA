import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  try {
    // ── Protection Check ──────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    
    const CRON_SECRET = process.env.CRON_SECRET;

    const isAuthorized = 
      (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) ||
      (CRON_SECRET && querySecret === CRON_SECRET);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Trigger Sentry Test Errors with Sensitive Data ────────────────────────
    
    // 1. Test via custom Logger.error
    logger.error('Sentry test error via Logger.error', {
      phone: '01001234567',
      password: 'logger-password-1234',
      metadata: {
        api_key: 'sk_live_logger_secret_api_key',
        card: '4111-2222-3333-4444'
      }
    });

    // 2. Test directly via Sentry.captureException
    Sentry.captureException(new Error('Sentry test error via Sentry.captureException'), {
      extra: {
        phoneNumber: '01234567890',
        secret_token: 'direct-sentry-secret-token-xyz',
        otp: '123456',
        test_sensitive_card_field: 'card-9876-5432'
      },
      tags: {
        test_type: 'direct_sentry_capture'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test errors triggered successfully. Sensitive values should be masked or omitted in Sentry.',
      details: {
        expected_masked_phones: ['0100***4567', '0123***7890'],
        expected_removed_keys: ['password', 'api_key', 'card', 'secret_token', 'otp', 'test_sensitive_card_field']
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
