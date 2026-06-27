import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'

function verifyBiddingToken(snapshotId: string, token: string): boolean {
  const secret = process.env.SUPABASE_JWT_SECRET || 'findora-secret-key-2026'
  const hmac = createHmac('sha256', secret)
  hmac.update(`bid:${snapshotId}`)
  const expected = hmac.digest('hex')
  return expected === token
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: snapshotId } = await params

  try {
    const { price, token, remarks } = await request.json()

    if (!price || !token) {
      return NextResponse.json({ error: 'Price and security token are required' }, { status: 400 })
    }

    // 1. Verify Token Signature to authorize request without user login session
    const isValid = verifyBiddingToken(snapshotId, token)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired signature token' }, { status: 403 })
    }

    const db = createAdminClient()

    // 2. Fetch snapshot to make sure it exists
    const { data: snapshot, error: fetchErr } = await (db.from('report_option_snapshots') as any)
      .select('id, request_id, hidden_contact_notes')
      .eq('id', snapshotId)
      .single()

    if (fetchErr || !snapshot) {
      return NextResponse.json({ error: 'Sourcing report option not found' }, { status: 444 })
    }

    // 3. Update the option price and add remarks to notes
    const updatedNotes = remarks 
      ? `${snapshot.hidden_contact_notes || ''}\n[Vendor Update]: ${remarks}`
      : snapshot.hidden_contact_notes

    const { error: updateErr } = await (db.from('report_option_snapshots') as any)
      .update({
        display_price_amount: Number(price),
        hidden_contact_notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', snapshotId)

    if (updateErr) {
      throw new Error(`Failed to save bid details: ${updateErr.message}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bid successfully placed and updated in report snapshots.' 
    })
  } catch (err: any) {
    console.error('[VENDOR BID ERROR]', err.message)
    return NextResponse.json({ error: err.message || 'Bid placement failed' }, { status: 500 })
  }
}
