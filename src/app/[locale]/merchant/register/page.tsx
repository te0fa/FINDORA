import MerchantRegisterClient from './MerchantRegisterClient';

export const metadata = {
  title: 'Register as Merchant | سجّل كتاجر — FINDORA',
  description: 'Join FINDORA as a merchant and start receiving sourcing requests from thousands of customers.',
};

export default async function MerchantRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MerchantRegisterClient locale={locale} />;
}
