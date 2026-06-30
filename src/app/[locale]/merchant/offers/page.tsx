import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Browse Requests | استعراض الطلبات — FINDORA Merchant',
};

export default async function MerchantOffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Merchant profiles auth is deprecated and being unified to vendors
  redirect(`/${locale}/auth/login`);
}
