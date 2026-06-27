import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getAllVendors } from '@/lib/dal/vendors'
import NewProductClient from './NewProductClient'

export const metadata = { title: 'إضافة منتج | Add Product — Findora Staff' }

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function NewProductPage({ params }: PageProps) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canManageVendors && !perms?.isAdmin) redirect(`/${locale}/staff/dashboard`)

  // 1. Fetch active vendors for manual association
  const vendors = await getAllVendors()

  // 2. Fetch research items that haven't been imported yet
  // Query all products that have research_item_id set
  const { data: productsWithResearch } = await supabase
    .from('products')
    .select('research_item_id')
    .not('research_item_id', 'is', null)

  const importedIds = ((productsWithResearch as any) || [])
    .map((p: any) => p.research_item_id)
    .filter(Boolean) as string[]

  // Query research items not in the imported list
  let researchItemsQuery = supabase
    .from('research_items')
    .select('id, product_title, source_name, price_amount, currency_code, listing_url, product_specs_summary')

  if (importedIds.length > 0) {
    // Format UUID list for NOT IN filter
    researchItemsQuery = researchItemsQuery.not('id', 'in', `(${importedIds.join(',')})`)
  }

  const { data: researchItems } = await researchItemsQuery
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <NewProductClient
      vendors={vendors || []}
      researchItems={researchItems || []}
      locale={locale}
    />
  )
}
