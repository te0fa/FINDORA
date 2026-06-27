import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient() as any

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. We want to return the top 10 earners and top 10 highest trust scores
  const { data: topEarners, error: e1 } = await supabase
    .from('contributors')
    .select(`
      id,
      full_name,
      trust_score,
      contributor_wallets (
        lifetime_earned_egp,
        points_balance
      )
    `)
    .eq('status', 'approved')
    .order('trust_score', { ascending: false }) // Fallback ordering, we will sort in memory for lifetime_earned
    .limit(100)

  if (e1) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  // Format and sort in memory
  const formattedEarners = (topEarners || [])
    .map((c: any) => ({
      id: c.id,
      full_name: c.full_name, // Typically we'd mask this for privacy e.g. "Ahmed M."
      trust_score: c.trust_score,
      lifetime_earned_egp: c.contributor_wallets[0]?.lifetime_earned_egp || 0,
      points_balance: c.contributor_wallets[0]?.points_balance || 0
    }))
    .sort((a: any, b: any) => b.lifetime_earned_egp - a.lifetime_earned_egp)
    .slice(0, 10)

  const formattedTrusted = [...formattedEarners]
    .sort((a, b) => b.trust_score - a.trust_score)
    .slice(0, 10)

  return NextResponse.json({ 
    top_earners: formattedEarners,
    top_trusted: formattedTrusted
  })
}
