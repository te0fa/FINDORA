import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staffRaw } = await supabase
    .from('staff_members')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const staff = staffRaw as { id: string; role: string } | null

  if (!staff || !['admin', 'owner'].includes(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse request
  const body = await request.json()
  const { rules, customerPhases, vendorPhases, advanceCustomerTo, advanceVendorTo } = body

  // A. Update base service rules
  if (rules && Array.isArray(rules)) {
    for (const rule of rules) {
      const { error } = await supabase
        .from('pricing_rules')
        .update({
          base_price_egp: rule.base_price_egp,
          min_price_egp: rule.min_price_egp,
          max_price_egp: rule.max_price_egp,
          active_offer_percentage: rule.active_offer_percentage,
          override_by_admin: rule.override_by_admin,
          updated_at: new Date().toISOString(),
          updated_by_staff_id: staff.id
        })
        .eq('id', rule.id)

      if (error) {
        return NextResponse.json({ error: `Failed to update pricing rule: ${error.message}` }, { status: 500 })
      }
    }
  }

  // B. Update customer fee phases
  if (customerPhases && Array.isArray(customerPhases)) {
    for (const phase of customerPhases) {
      const { error } = await supabase
        .from('customer_fee_phases')
        .update({
          fee_amount_egp: Number(phase.fee_amount_egp),
          first_request_free_with_verified_phone: !!phase.first_request_free_with_verified_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', phase.id)

      if (error) {
        return NextResponse.json({ error: `Failed to update customer fee phase: ${error.message}` }, { status: 500 })
      }
    }
  }

  // C. Update vendor fee phases
  if (vendorPhases && Array.isArray(vendorPhases)) {
    for (const phase of vendorPhases) {
      const commRate = phase.commission_rate === null || phase.commission_rate === '' ? null : Number(phase.commission_rate)
      const minFee = phase.min_fee_egp === null || phase.min_fee_egp === '' ? null : Number(phase.min_fee_egp)
      const subFee = phase.subscription_monthly_egp === null || phase.subscription_monthly_egp === '' ? null : Number(phase.subscription_monthly_egp)

      const { error } = await supabase
        .from('vendor_fee_phases')
        .update({
          commission_rate: commRate,
          min_fee_egp: minFee,
          subscription_monthly_egp: subFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', phase.id)

      if (error) {
        return NextResponse.json({ error: `Failed to update vendor fee phase: ${error.message}` }, { status: 500 })
      }
    }
  }

  // D. Advance Customer Fee Phase
  if (advanceCustomerTo) {
    // 1. Deactivate current active customer phase
    const { error: deacErr } = await supabase
      .from('customer_fee_phases')
      .update({ is_current_phase: false })
      .eq('is_current_phase', true)

    if (deacErr) return NextResponse.json({ error: `Customer phase deactivation failed: ${deacErr.message}` }, { status: 500 })

    // 2. Activate target customer phase
    const { error: acErr } = await supabase
      .from('customer_fee_phases')
      .update({ is_current_phase: true })
      .eq('phase_name', advanceCustomerTo)

    if (acErr) return NextResponse.json({ error: `Customer phase activation failed: ${acErr.message}` }, { status: 500 })
  }

  // E. Advance Vendor Fee Phase
  if (advanceVendorTo) {
    // 1. Deactivate current active vendor phase
    const { error: deacErr } = await supabase
      .from('vendor_fee_phases')
      .update({ is_current_phase: false })
      .eq('is_current_phase', true)

    if (deacErr) return NextResponse.json({ error: `Vendor phase deactivation failed: ${deacErr.message}` }, { status: 500 })

    // 2. Activate target vendor phase
    const { error: acErr } = await supabase
      .from('vendor_fee_phases')
      .update({ is_current_phase: true })
      .eq('phase_name', advanceVendorTo)

    if (acErr) return NextResponse.json({ error: `Vendor phase activation failed: ${acErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
