import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, requestId, priceOfferedEgp, notes, estimatedDays } = body;

    if (!merchantId || !requestId || !priceOfferedEgp || priceOfferedEgp <= 0) {
      return NextResponse.json({ error: 'merchantId, requestId, and valid price are required' }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify request is still open
    const { data: req } = await (db.from('customer_requests') as any)
      .select('id, current_status')
      .eq('id', requestId)
      .maybeSingle();

    if (!req || req.current_status !== 'open') {
      return NextResponse.json({ error: 'Request is no longer open' }, { status: 400 });
    }

    // Verify merchant is active
    const { data: merchant } = await (db.from('merchant_profiles') as any)
      .select('id, status')
      .eq('id', merchantId)
      .maybeSingle();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }
    if (merchant.status !== 'active' && merchant.status !== 'pending') {
      return NextResponse.json({ error: 'Merchant account is not eligible to submit offers' }, { status: 403 });
    }

    // Upsert offer (prevent duplicates)
    const { data: offer, error } = await (db.from('merchant_offers') as any)
      .upsert({
        merchant_id: merchantId,
        request_id: requestId,
        price_offered_egp: priceOfferedEgp,
        notes: notes || null,
        estimated_days: estimatedDays || null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,request_id' })
      .select('id, status')
      .single();

    if (error) {
      // log.error('[MERCHANT OFFER]', error);
      return NextResponse.json({ error: 'Failed to submit offer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (err: any) {
    // log.error('[MERCHANT OFFER]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get('merchantId');
  if (!merchantId) return NextResponse.json({ error: 'merchantId required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await (db.from('merchant_offers') as any)
    .select('id, request_id, price_offered_egp, status, notes, estimated_days, created_at, accepted_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data || [] });
}
