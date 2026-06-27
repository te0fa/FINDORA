import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOtp } from '@/lib/notifications/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, code, purpose } = body;

    if (!phoneNumber || !code || !purpose) {
      return NextResponse.json({ error: 'phoneNumber, code, and purpose are required' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be exactly 6 digits' }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await verifyOtp(phoneNumber, code, purpose, db);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (err: any) {
    // log.error('[OTP VERIFY]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
