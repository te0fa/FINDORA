import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createClient } from '@/lib/supabase/server'
import { getFinancialCategories, getFinancialTransactions, getFinancialSummary } from '@/lib/dal/finance'
import { FinanceClientPage } from './FinanceClientPage'

export default async function FinanceTransactionsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`)

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.canManageFinancials && !permissions.isAdmin) {
    redirect(`/${locale}/staff/dashboard`)
  }

  // Fetch real data
  const [categories, transactions, summary] = await Promise.all([
    getFinancialCategories(),
    getFinancialTransactions(200),
    getFinancialSummary()
  ])

  return (
    <FinanceClientPage 
      locale={locale} 
      dict={dict} 
      categories={categories} 
      transactions={transactions} 
      summary={summary} 
    />
  )
}
