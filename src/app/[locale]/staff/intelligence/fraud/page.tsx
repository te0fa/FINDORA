import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FraudReviewClient from '@/components/admin/FraudReviewClient'

export const metadata = {
  title: 'Security & Anti-Fraud — FINDORA',
}

export default async function FraudDashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // 1. Fetch Open Fraud Alerts
  const { data: openAlerts } = await supabase
    .from('fraud_alerts')
    .select(`
      id, alert_level, alert_type, description, created_at,
      contributor_id, related_transaction_id,
      contributors (full_name, trust_score, status)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  // 2. Fetch Frozen Accounts (Status = 'frozen_under_review' or 'suspended')
  const { data: frozenAccounts } = await supabase
    .from('contributors')
    .select('id, full_name, trust_score, status, last_ip_address')
    .in('status', ['frozen_under_review', 'suspended'])
    .order('trust_score', { ascending: true })

  // 3. Fetch Transactions stuck in Delay Buffer
  const { data: delayedTransactions } = await supabase
    .from('wallet_transactions')
    .select(`
      id, tx_type, amount_egp, status, created_at,
      contributors (full_name)
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-7xl p-6 pb-20 space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(0,84%,60%,0.1)] text-[hsl(0,84%,60%)] text-xs font-bold border border-[hsl(0,84%,60%,0.2)] mb-4">
          🛡️ SYSTEM SECURITY ENFORCEMENT
        </div>
        <h1 className="text-4xl font-extrabold text-white">{locale === 'ar' ? 'مركز الحماية ومكافحة الاحتيال 🚨' : 'Anti-Fraud & Control Center 🚨'}</h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' ? 'مراجعة الأنشطة المشبوهة، الحسابات المجمدة، والموافقة على العمليات المعلقة.' : 'Review suspicious activities, frozen accounts, and approve pending delayed transactions.'}
        </p>
      </div>

      <FraudReviewClient 
        locale={locale} 
        openAlerts={openAlerts || []} 
        frozenAccounts={frozenAccounts || []} 
        delayedTransactions={delayedTransactions || []} 
      />
    </div>
  )
}
