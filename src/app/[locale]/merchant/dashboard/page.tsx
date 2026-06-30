import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Merchant Dashboard | لوحة التاجر — FINDORA',
};

export default async function MerchantDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Merchant profiles auth is deprecated and being unified to vendors
  redirect(`/${locale}/auth/login`);
}
