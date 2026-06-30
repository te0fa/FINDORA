import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_name_ar, business_name_en, business_category,
      phone_number, phone_verified, governorate, address_details, national_id,
    } = body;

    if (!business_name_ar || !business_category || !phone_number) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (!phone_verified) {
      return NextResponse.json({ error: 'Phone must be verified' }, { status: 400 });
    }

    const db = createAdminClient();

    // Check duplicate phone
    const { data: existing } = await (db as any).from('merchant_profiles')
      .select('id')
      .eq('phone_number', phone_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This phone number is already registered as a merchant' }, { status: 409 });
    }

    const { data: merchant, error } = await (db as any).from('merchant_profiles')
      .insert({
        business_name_ar,
        business_name_en: business_name_en || business_name_ar,
        business_category,
        phone_number,
        phone_verified: true,
        governorate: governorate || null,
        address_details: address_details || null,
        national_id: national_id || null,
        status: 'pending',
        trust_score: 50,
      })
      .select('id, status')
      .single();

    if (error) {
      // log.error('[MERCHANT REGISTER]', error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, merchantId: merchant.id, status: merchant.status });
  } catch (err: any) {
    // log.error('[MERCHANT REGISTER]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
