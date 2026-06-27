import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getProductById } from '@/lib/dal/products'
import { getPriceHistory, getPriceEvents } from '@/lib/products/price-engine'
import { findAlternatives } from '@/lib/products/recommendation-engine'
import { explainAlternatives } from '@/lib/products/explanation-engine'
import ProductDetailsClient from './ProductDetailsClient'

export const metadata = { title: 'تفاصيل المنتج | Product Details — Findora Staff' }

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale, id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canAccessDashboard) redirect(`/${locale}/staff/dashboard`)

  // 1. Fetch product (with trend data)
  const product = await getProductById(id, true)
  if (!product) notFound()

  // 2. Fetch price history (last 365 days)
  const priceHistory = await getPriceHistory(id, 365)

  // 3. Fetch price change events
  const priceEvents = await getPriceEvents(id, 15)

  // 4. Fetch alternative recommendations
  const alternatives = await findAlternatives(id, { limit: 5 })

  // 5. Generate explanations for recommendations
  const explanations = explainAlternatives(
    product,
    alternatives.map(a => ({ product: a.product, total_score: a.total_score }))
  )

  return (
    <ProductDetailsClient
      product={product}
      priceHistory={priceHistory}
      priceEvents={priceEvents}
      alternatives={alternatives}
      explanations={explanations}
      locale={locale}
      isAdmin={perms?.isAdmin || perms?.canManageVendors}
    />
  )
}
