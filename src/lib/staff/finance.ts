'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function fetchWalletsAndWithdrawals() {
  const supabase = await createClient()

  // Fetch all wallets with their contributor profiles
  const { data: wallets, error: walletsError } = await supabase
    .from('contributor_wallets')
    .select(`
      *,
      contributors (
        id,
        auth_user_id,
        role,
        points,
        reputation_score
      )
    `)
    .order('balance_egp', { ascending: false })

  if (walletsError) {
    console.error('Error fetching wallets:', walletsError)
    throw new Error('Failed to fetch wallets.')
  }

  // Fetch all pending withdrawals
  const { data: pendingWithdrawals, error: withdrawalsError } = await supabase
    .from('contributor_withdrawals')
    .select(`
      *,
      contributors (
        id,
        auth_user_id,
        role
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('Error fetching withdrawals:', withdrawalsError)
    throw new Error('Failed to fetch pending withdrawals.')
  }

  return { wallets, pendingWithdrawals }
}

export async function approveWithdrawal(withdrawalId: string, receiptUrl: string, staffReviewerId: string) {
  if (!receiptUrl || receiptUrl.trim() === '') {
    return { success: false, error: 'A transfer receipt URL is strictly required.' }
  }

  const supabase = await createClient()

  // 1. Get the withdrawal record
  const { data: withdrawal, error: fetchError } = await supabase
    .from('contributor_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single()

  if (fetchError || !withdrawal) {
    return { success: false, error: 'Withdrawal not found.' }
  }

  const w = withdrawal as any
  if (w.status !== 'pending') {
    return { success: false, error: 'Withdrawal is not pending.' }
  }

  // 2. Update the withdrawal status and inject the receipt into payment_details
  const newPaymentDetails = {
    ...w.payment_details,
    receipt_url: receiptUrl
  }

  const { error: updateError } = await (supabase
    .from('contributor_withdrawals') as any)
    .update({
      status: 'completed',
      payment_details: newPaymentDetails,
      staff_reviewer_id: staffReviewerId,
      processed_at: new Date().toISOString()
    } as any)
    .eq('id', withdrawalId)

  if (updateError) {
    console.error('Error updating withdrawal:', updateError)
    return { success: false, error: 'Failed to update withdrawal status.' }
  }

  // 3. Complete the withdrawal using the RPC (which handles row locking, pending checks, and updates pending/lifetime)
  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: w.contributor_id,
    p_wallet_id: w.wallet_id,
    p_tx_type: 'withdrawal',
    p_amount_egp: -w.amount_egp, // negative amount to deduct from pending
    p_amount_points: 0,
    p_reference_type: 'withdrawal_request',
    p_reference_id: w.id,
    p_description_en: 'Approved Withdrawal Payout',
    p_description_ar: 'تم صرف طلب السحب',
    p_metadata: { receipt_url: receiptUrl },
    p_idempotency_key: null
  })

  const resultObj = rpcResult as any
  if (rpcError || !resultObj || !resultObj.success) {
    console.error('Error in approveWithdrawal RPC:', rpcError || resultObj?.error)
    return { success: false, error: rpcError?.message || resultObj?.error || 'Failed to process withdrawal completion.' }
  }

  revalidatePath('/[locale]/staff/contributors/wallets')
  return { success: true }
}

export async function adjustWalletBalance(
  walletId: string,
  amountEgp: number,
  amountPoints: number,
  txType: 'manual_adjustment' | 'fraud_clawback',
  descriptionEn: string,
  descriptionAr: string,
  staffReviewerId: string
) {
  const supabase = await createClient()

  // 1. Get the wallet
  const { data: wallet, error: fetchError } = await supabase
    .from('contributor_wallets')
    .select('*')
    .eq('id', walletId)
    .single()

  if (fetchError || !wallet) {
    return { success: false, error: 'Wallet not found.' }
  }

  const wal = wallet as any

  // Call the RPC that handles row-level locking, checks, and wallet update via trigger
  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('fn_lock_and_insert_transaction', {
    p_contributor_id: wal.contributor_id,
    p_wallet_id: walletId,
    p_tx_type: txType,
    p_amount_egp: amountEgp,
    p_amount_points: amountPoints,
    p_reference_type: 'admin_adjustment',
    p_reference_id: null,
    p_description_en: descriptionEn,
    p_description_ar: descriptionAr,
    p_metadata: { staff_reviewer_id: staffReviewerId },
    p_idempotency_key: null
  })

  const resultObj = rpcResult as any
  if (rpcError || !resultObj || !resultObj.success) {
    console.error('Error in adjustWalletBalance RPC:', rpcError || resultObj?.error)
    return { success: false, error: rpcError?.message || resultObj?.error || 'Failed to adjust wallet balance.' }
  }

  revalidatePath('/[locale]/staff/contributors/wallets')
  return { success: true }
}

