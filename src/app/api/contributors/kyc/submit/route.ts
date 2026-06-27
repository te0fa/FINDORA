import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contributorId, frontPath, backPath, selfiePath } = body;

    if (!contributorId || !frontPath || !backPath || !selfiePath) {
      return NextResponse.json({ error: 'All three document paths required' }, { status: 400 });
    }

    const db = createAdminClient();

    // Upsert verification request
    const { data, error } = await (db.from('contributor_verification_requests') as any)
      .upsert({
        contributor_id: contributorId,
        id_front_url: frontPath,
        id_back_url: backPath,
        selfie_url: selfiePath,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewer_notes: null,
      }, { onConflict: 'contributor_id' })
      .select('id')
      .single();

    if (error) {
      // log.error('[KYC SUBMIT]', error);
      return NextResponse.json({ error: 'Failed to submit KYC request' }, { status: 500 });
    }

    // Update contributor status to 'kyc_pending'
    await (db.from('contributors') as any)
      .update({ kyc_status: 'pending' })
      .eq('id', contributorId)
      .catch(() => {}); // Non-fatal if column doesn't exist yet

    return NextResponse.json({ success: true, verificationId: data.id });
  } catch (err: any) {
    // log.error('[KYC SUBMIT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
