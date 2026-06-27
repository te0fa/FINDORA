import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('DAL:points')

// ─── Customer Points Operations ──────────────────────────────────────────────

export async function addCustomerPoints(
  customerId: string,
  points: number,
  actionType: 'request_created' | 'review_submitted' | 'purchase_confirmed' | 'friend_referred' | 'vip_redeemed',
  referenceId?: string
): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { error } = await (adminClient as any)
    .from('customer_points_ledger')
    .insert({
      customer_id: customerId,
      points,
      action_type: actionType,
      reference_id: referenceId ?? null
    })

  if (error) {
    log.error('addCustomerPoints failed', { customerId, points, error: error.message })
    return false
  }

  log.info('Customer points transaction logged', { customerId, points, actionType })
  return true
}

export async function getCustomerPointsBalance(customerId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('customer_points_ledger')
    .select('points')
    .eq('customer_id', customerId)

  if (error) {
    log.error('getCustomerPointsBalance failed', { customerId, error: error.message })
    return 0
  }

  const balance = (data || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  return balance
}

// ─── Partner Points Operations ───────────────────────────────────────────────

export async function addPartnerPoints(
  partnerId: string,
  points: number,
  actionType: 'valid_bid_placed' | 'lead_confirmed' | 'sale_completed' | 'payout',
  referenceId?: string
): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { error } = await (adminClient as any)
    .from('partner_points_ledger')
    .insert({
      partner_id: partnerId,
      points,
      action_type: actionType,
      reference_id: referenceId ?? null
    })

  if (error) {
    log.error('addPartnerPoints failed', { partnerId, points, error: error.message })
    return false
  }

  log.info('Partner points transaction logged', { partnerId, points, actionType })
  return true
}

export async function getPartnerPointsBalance(partnerId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('partner_points_ledger')
    .select('points')
    .eq('partner_id', partnerId)

  if (error) {
    log.error('getPartnerPointsBalance failed', { partnerId, error: error.message })
    return 0
  }

  const balance = (data || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  return balance
}

// ─── Waitlist Operations ──────────────────────────────────────────────────────

export async function addToWaitlist(
  customerId: string,
  productName: string,
  category?: string
): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { error } = await (adminClient as any)
    .from('product_waitlists')
    .upsert({
      customer_id: customerId,
      product_name: productName,
      category: category ?? null
    }, { onConflict: 'customer_id,product_name' })

  if (error) {
    log.error('addToWaitlist failed', { customerId, productName, error: error.message })
    return false
  }

  log.info('Customer added to waitlist', { customerId, productName })
  return true
}

export async function getProductWaitlistCount(productName: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await (supabase as any)
    .from('product_waitlists')
    .select('*', { count: 'exact', head: true })
    .ilike('product_name', `%${productName}%`)

  if (error) {
    log.error('getProductWaitlistCount failed', { productName, error: error.message })
    return 0
  }

  return count ?? 0
}

// ─── Referrals Operations ─────────────────────────────────────────────────────

export async function addReferralLog(
  referrerId: string,
  referrerType: 'customer' | 'vendor' | 'partner',
  referredEmail: string
): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { error } = await (adminClient as any)
    .from('referral_logs')
    .insert({
      referrer_id: referrerId,
      referrer_type: referrerType,
      referred_email: referredEmail,
      status: 'pending'
    })

  if (error) {
    log.error('addReferralLog failed', { referrerId, referredEmail, error: error.message })
    return false
  }

  log.info('Referral log registered', { referrerId, referrerType, referredEmail })
  return true
}

export async function updateReferralStatus(
  referredEmail: string,
  status: 'signed_up' | 'first_transaction'
): Promise<void> {
  const adminClient = await createAdminClient()

  const { data: referral, error: fetchErr } = await (adminClient as any)
    .from('referral_logs')
    .select('*')
    .eq('referred_email', referredEmail)
    .maybeSingle()

  if (fetchErr || !referral) return

  const { error } = await (adminClient as any)
    .from('referral_logs')
    .update({ status })
    .eq('referred_email', referredEmail)

  if (error) {
    log.error('updateReferralStatus failed', { referredEmail, status, error: error.message })
    return
  }

  // Reward referrer if transaction is complete
  if (status === 'first_transaction') {
    const referrerId = referral.referrer_id
    const type = referral.referrer_type

    if (type === 'customer') {
      await addCustomerPoints(referrerId, 50, 'friend_referred', referral.id)
    } else if (type === 'partner') {
      await addPartnerPoints(referrerId, 100, 'sale_completed', referral.id)
    }
  }
}

export async function getCustomerWaitlist(customerId: string): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('product_waitlists')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('getCustomerWaitlist failed', { customerId, error: error.message })
    return []
  }

  return data || []
}

export async function getCustomerPointsLedger(customerId: string): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('customer_points_ledger')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('getCustomerPointsLedger failed', { customerId, error: error.message })
    return []
  }

  return data || []
}

export async function getAllPartnersWithBalances(): Promise<any[]> {
  const supabase = await createClient()

  const { data: staff, error: staffErr } = await (supabase as any)
    .from('staff_members')
    .select('id, display_name')

  if (staffErr || !staff) {
    log.error('getAllPartnersWithBalances failed to fetch staff', { error: staffErr?.message })
    return []
  }

  const { data: ledger, error: ledgerErr } = await (supabase as any)
    .from('partner_points_ledger')
    .select('partner_id, points')

  if (ledgerErr) {
    log.error('getAllPartnersWithBalances failed to fetch ledger', { error: ledgerErr.message })
    return staff.map((s: any) => ({ ...s, points_balance: 0 }))
  }

  const balanceMap: Record<string, number> = {}
  ;(ledger || []).forEach((tx: any) => {
    balanceMap[tx.partner_id] = (balanceMap[tx.partner_id] || 0) + tx.points
  })

  return staff.map((s: any) => ({
    ...s,
    points_balance: balanceMap[s.id] || 0
  }))
}

export async function getAllPartnerTransactions(): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('partner_points_ledger')
    .select(`
      *,
      partner:staff_members(id, display_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('getAllPartnerTransactions failed', { error: error.message })
    return []
  }

  return (data || []).map((tx: any) => ({
    ...tx,
    partner: tx.partner ? (Array.isArray(tx.partner) ? tx.partner[0] : tx.partner) : null
  }))
}



