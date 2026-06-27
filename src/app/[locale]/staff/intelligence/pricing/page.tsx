import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PricingSettingsClient from './PricingSettingsClient'

export const metadata = {
  title: 'Pricing Engine | FINDORA OS',
}

export default async function PricingEnginePage({ params }: { params: { locale: string } }) {
  const supabase = await createClient() as any

  // 1. Check Auth & Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${params.locale}/auth/login`)

  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  // Only admin and owners can modify pricing
  if (!staff || !['admin', 'owner'].includes(staff.role)) {
    redirect(`/${params.locale}/staff/dashboard`)
  }

  // 2. Fetch Pricing Rules
  const { data: rules } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('service_type', { ascending: true })

  // 3. Fetch Customer Fee Phases
  const { data: customerPhases } = await supabase
    .from('customer_fee_phases')
    .select('*')
    .order('phase_order', { ascending: true })

  // 4. Fetch Vendor Fee Phases
  const { data: vendorPhases } = await supabase
    .from('vendor_fee_phases')
    .select('*')
    .order('phase_order', { ascending: true })

  return (
    <div className="mx-auto max-w-5xl p-6 pb-20">
      <PricingSettingsClient 
        locale={params.locale}
        initialRules={rules || []}
        initialCustomerPhases={customerPhases || []}
        initialVendorPhases={vendorPhases || []}
      />
    </div>
  )
}
