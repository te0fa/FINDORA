import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from './customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('DAL:disputes')

export interface Dispute {
  id: string
  request_id: string
  customer_id: string
  vendor_id: string
  dispute_reason: 'price_discrepancy' | 'item_mismatch' | 'execution_issue' | 'other'
  details: string
  status: 'open' | 'under_review' | 'resolved' | 'closed'
  resolution_notes: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
  customer?: {
    full_name: string
  }
  vendor?: {
    display_name: string
  }
}

export async function createDispute(input: {
  request_id: string
  customer_id: string
  vendor_id: string
  dispute_reason: 'price_discrepancy' | 'item_mismatch' | 'execution_issue' | 'other'
  details: string
}): Promise<Dispute> {
  const adminClient = await createAdminClient()

  const { data, error } = await (adminClient as any)
    .from('request_disputes')
    .insert({
      request_id: input.request_id,
      customer_id: input.customer_id,
      vendor_id: input.vendor_id,
      dispute_reason: input.dispute_reason,
      details: input.details,
      status: 'open'
    })
    .select()
    .single()

  if (error) {
    log.error('createDispute failed', { error: error.message, input })
    throw new Error(`Failed to log dispute: ${error.message}`)
  }

  log.info('Dispute logged successfully', { id: data.id, requestId: input.request_id })
  return data as Dispute
}

export async function getDisputesForCustomer(customerId: string): Promise<Dispute[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('request_disputes')
    .select(`
      *,
      vendor:vendors(display_name)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('getDisputesForCustomer failed', { customerId, error: error.message })
    return []
  }

  return (data || []).map((d: any) => ({
    ...d,
    vendor: d.vendor ? d.vendor[0] || d.vendor : undefined
  })) as Dispute[]
}

export async function getDisputesForAdmin(): Promise<Dispute[]> {
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('request_disputes')
    .select(`
      *,
      customer:customers(full_name),
      vendor:vendors(display_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    log.error('getDisputesForAdmin failed', { error: error.message })
    return []
  }

  return (data || []).map((d: any) => ({
    ...d,
    customer: d.customer ? d.customer[0] || d.customer : undefined,
    vendor: d.vendor ? d.vendor[0] || d.vendor : undefined
  })) as Dispute[]
}

export async function resolveDispute(
  disputeId: string,
  staffId: string,
  resolutionNotes: string
): Promise<boolean> {
  const adminClient = await createAdminClient()

  const { error } = await (adminClient as any)
    .from('request_disputes')
    .update({
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolved_by: staffId,
      updated_at: new Date().toISOString()
    })
    .eq('id', disputeId)

  if (error) {
    log.error('resolveDispute failed', { disputeId, error: error.message })
    return false
  }

  log.info('Dispute resolved by staff', { disputeId, staffId })
  return true
}
