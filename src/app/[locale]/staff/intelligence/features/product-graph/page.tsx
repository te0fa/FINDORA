import { redirect } from 'next/navigation';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/dal/customers';
import ProductGraphClient from './ProductGraphClient';

export const metadata = {
  title: 'Universal Product Graph | قاعدة معرفة المنتجات — Findora Staff'
};

export default async function ProductGraphPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  const staffMember = await getStaffMemberByAuthUserId(user.id);
  if (!staffMember || !staffMember.is_active) redirect(`/${locale}/auth/login`);

  const permissions = getStaffUiPermissions(staffMember);
  if (!permissions.isAdmin) redirect(`/${locale}/staff/dashboard`);

  const client = await createAdminClient() as any;

  // Query products, price history count, and unique categories count
  const [productsRes, historyCountRes, categoriesRes] = await Promise.all([
    client.from('products').select('*').order('created_at', { ascending: false }),
    client.from('price_history').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    client.from('products').select('category').catch(() => ({ data: [] }))
  ]);

  const products = productsRes?.data || [];
  const recordedPricesCount = historyCountRes?.count || 0;

  // Calculate unique categories
  const categoriesList = (categoriesRes?.data || []).map((p: any) => p.category);
  const uniqueCategoriesCount = new Set(categoriesList).size;

  return (
    <ProductGraphClient
      locale={locale}
      initialProducts={products}
      metrics={{
        productsCount: products.length,
        recordedPricesCount,
        categoriesCount: uniqueCategoriesCount
      }}
      currentUserId={user.id}
    />
  );
}
