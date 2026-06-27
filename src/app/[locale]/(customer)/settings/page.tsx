import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const customer = await getCustomerByAuthId(user.id)
  if (!customer) {
    redirect(`/${locale}/auth/login`)
  }

  return (
    <div className="animate-in max-w-5xl mx-auto py-4">
      <div className="mb-8" style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          {locale === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
        </h1>
        <p className="text-white/40 text-sm">
          {locale === 'ar' 
            ? 'قم بإدارة تفاصيل ملفك الشخصي وتحديث إعدادات الأمان الخاصة بك' 
            : 'Manage your profile details and update your security credentials.'}
        </p>
      </div>
      
      <SettingsClient 
        customer={{
          id: customer.id,
          full_name: customer.full_name,
          email: customer.email,
          phone_number_raw: customer.phone_number_raw
        }} 
        locale={locale} 
      />
    </div>
  )
}
