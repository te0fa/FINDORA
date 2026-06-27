import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { listProducts, getDistinctCategories, getDistinctBrands } from '@/lib/dal/products'
import ProductsDashboardClient from './ProductsDashboardClient'

export const metadata = { title: 'إدارة المنتجات | Products Catalog — Findora Staff' }

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    page?: string
    q?: string
    category?: string
    brand?: string
    min?: string
    max?: string
  }>
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  
  // We can let any staff member with access to the dashboard view products
  if (!perms?.canAccessDashboard) redirect(`/${locale}/staff/dashboard`)

  // Parse filters
  const page = Math.max(1, Number(sp.page || 1))
  const search = sp.q || undefined
  const category = sp.category || undefined
  const brand = sp.brand || undefined
  const min_price = sp.min ? Number(sp.min) : undefined
  const max_price = sp.max ? Number(sp.max) : undefined

  const limit = 15
  const offset = (page - 1) * limit

  const [productsData, categories, brands] = await Promise.all([
    listProducts({
      search,
      category,
      brand,
      min_price,
      max_price,
      limit,
      offset,
      is_active: true
    }),
    getDistinctCategories(),
    getDistinctBrands(category)
  ])

  return (
    <ProductsDashboardClient
      products={productsData.products}
      totalCount={productsData.total}
      categories={categories}
      brands={brands}
      currentPage={page}
      limit={limit}
      locale={locale}
      isAdmin={perms?.isAdmin || perms?.canManageVendors}
    />
  )
}
