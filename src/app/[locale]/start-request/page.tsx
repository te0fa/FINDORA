import React from 'react'
import RequestWizardClient from './RequestWizardClient'
import HeaderLogo from "@/components/HeaderLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Locale } from "@/lib/i18n/config";
import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId } from '@/lib/dal/customers'

export const metadata = {
  title: 'Start Your Request — FINDORA',
}

export default async function StartRequestPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  
  // Fetch logged in customer on the server to prevent client-side hydration delays and race conditions
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let initialCustomer = null
  if (user) {
    initialCustomer = await getCustomerByAuthId(user.id)
  }

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white flex flex-col">
      <header className="w-full py-4 px-6 md:px-8 flex justify-between items-center border-b border-white/10" style={{ background: 'rgba(2, 6, 23, 0.8)' }} dir="ltr">
        <HeaderLogo locale={locale} href={`/${locale}`} />
        <div className="flex items-center gap-4" dir="ltr">
          <LanguageSwitcher currentLocale={locale as Locale} />
        </div>
      </header>
      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full">
          <RequestWizardClient locale={locale} initialCustomer={initialCustomer} />
        </div>
      </div>
    </div>
  )
}