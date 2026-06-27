import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/dal/customers'
import { getContributorByAuthUserId } from '@/lib/dal/contributors'
import { getCustomerByAuthId } from '@/lib/dal/customers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, discoveredPrice, storeName, category, proofUrl } = body

    if (!productName || !discoveredPrice || !storeName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // 1. Get or create contributor profile
    let contributor = await getContributorByAuthUserId(user.id)
    if (!contributor) {
      const customer = await getCustomerByAuthId(user.id)
      const name = customer?.full_name || user.user_metadata?.full_name || 'Casual Hunter'
      const phone = customer?.phone_number_normalized || customer?.phone_number_raw || '+20000000000'
      
      const { data: newContrib, error: err } = await adminClient
        .from('contributors')
        .insert({
          auth_user_id: user.id,
          full_name: name,
          phone_number: phone,
          role: 'casual',
          status: 'active',
          referral_code: `HUNTER-${Math.floor(1000 + Math.random() * 9000)}`
        })
        .select()
        .single()

      if (err) {
        throw new Error(`Failed to initialize hunter profile: ${err.message}`)
      }
      contributor = newContrib as any
    }

    // 2. Insert into market_insights
    const { data, error } = await adminClient
      .from('market_insights')
      .insert({
        contributor_id: contributor!.id,
        product_name: productName,
        discovered_price: Number(discoveredPrice),
        store_name: storeName,
        category: category || 'General',
        location_data: { proof_url: proofUrl || '' },
        status: 'pending_review'
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, insight: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
