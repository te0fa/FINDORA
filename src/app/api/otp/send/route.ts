import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOtp } from '@/lib/notifications/otp';

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

    // Validate phone format (basic Egypt phone validation)
    const phoneRegex = /^(\+20|0020|0)?1[0-2|5]\d{8}$/;
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid Egyptian phone number format' }, { status: 400 });
    }

    const db = createAdminClient();

    // Rate limit: max 3 OTP sends per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOtps } = await (db as any).from('phone_otp_codes')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('purpose', purpose)
      .gte('created_at', oneHourAgo);

    if (recentOtps && recentOtps.length >= 3) {
      return NextResponse.json({
        error: 'Too many OTP requests. Please wait before requesting a new code.',
      }, { status: 429 });
    }

    const result = await sendOtp(normalizedPhone, purpose, db);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
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
