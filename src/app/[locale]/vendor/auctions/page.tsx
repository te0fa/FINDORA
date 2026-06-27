import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { getDemandHeatMap } from '@/lib/dal/bidding'
import VendorAuctionsClient from './VendorAuctionsClient'

export const metadata = { title: 'مزادات وعروض التجار | Merchant Auctions — Findora Portal' }

interface SourcingRequest {
  id: string
  request_code: string
  title: string
  raw_description: string
  budget: number | null
  city: string | null
  priority: string | null
  accepts_used: boolean
  created_at: string
  customer_id: string
}

export default async function VendorAuctionsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  // 1. Fetch vendor profile linked to this user email
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, display_name, trust_score')
    .eq('portal_email', user.email ?? '')
    .maybeSingle()

  if (!vendor) {
    // If not a vendor, redirect to dashboard or registration
    redirect(`/${locale}/staff/dashboard`)
  }

  const adminClient = await createAdminClient()

  // 2. Fetch all active sourcing requests open for bidding
  const { data: requestsData } = await adminClient
    .from('requests')
    .select('id, request_code, title, raw_description, budget, city, priority, accepts_used, created_at, customer_id')
    .in('current_status', ['submitted', 'assigned'])
    .order('created_at', { ascending: false })

  // 3. Fetch buyer reliability stats
  const { data: reliabilityStats } = await adminClient
    .from('customer_reliability_stats')
    .select('*')

  const reliabilityMap: Record<string, any> = {}
  ;(reliabilityStats || []).forEach((row: any) => {
    reliabilityMap[row.customer_id] = {
      purchase_rate: row.purchase_rate,
      response_rate: row.response_rate,
      reliability_score: row.reliability_score
    }
  })

  // 4. Fetch already submitted bids by this vendor so they can see/edit them
  const { data: submittedBids } = await adminClient
    .from('vendor_bids')
    .select('*')
    .eq('vendor_id', (vendor as any).id)

  const bidsMap: Record<string, any> = {}
  ;(submittedBids || []).forEach((b: any) => {
    bidsMap[b.request_id] = b
  })

  // 5. Fetch demand heatmap intelligence data
  const demandIntel = await getDemandHeatMap()

  return (
    <VendorAuctionsClient
      vendor={vendor}
      requests={(requestsData || []) as SourcingRequest[]}
      reliabilityMap={reliabilityMap}
      existingBids={bidsMap}
      demandIntel={demandIntel}
      locale={locale}
    />
  )
}
