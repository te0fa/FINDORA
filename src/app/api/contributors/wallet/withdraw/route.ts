import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getContributorByAuthUserId } from '@/lib/dal/contributors'
import { requestWithdrawal } from '@/lib/contributors/wallet'

/**
 * POST /api/contributors/wallet/withdraw
 * Body: { amountEgp: number, paymentMethod: 'instapay'|'vodafone_cash'|'bank_transfer', paymentDetails: object }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contributor = await getContributorByAuthUserId(user.id)
  if (!contributor) {
    return NextResponse.json({ error: 'Contributor not found' }, { status: 404 })
  }

  // Must have 3 active referrals to withdraw (Access System requirement)
  if (contributor.active_referral_count < 3) {
    return NextResponse.json({ error: 'Withdrawal locked. Requires 3 active referrals.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { amountEgp, paymentMethod, paymentDetails } = body

    if (!amountEgp || amountEgp <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!paymentMethod || !paymentDetails) {
      return NextResponse.json({ error: 'Payment method and details are required' }, { status: 400 })
    }

    // Process through Risk Engine & Wallet Enforcement layer
    const result = await requestWithdrawal({
      contributorId: contributor.id,
      amountEgp,
      paymentMethod,
      paymentDetails
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error, 
        gateResult: result.gateResult 
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, withdrawalId: result.withdrawalId, gateResult: result.gateResult })
  } catch (error: any) {
    // log.error('[API] Withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
