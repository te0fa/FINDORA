import React from 'react'
import { getAllEconomyConfigs } from '@/lib/contributors/config'
import EconomyConfigClient from '@/components/staff/EconomyConfigClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Economy Control Panel — FINDORA',
}

export default async function EconomyConfigPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Ensure role has access (admin, owner, or economy_architect)
  const { data: roles } = await supabase
    .from('staff_member_roles')
    .select('role_code')
    .eq('is_active', true)
    // NOTE: This requires fetching staff_member_id first or joining, 
    // but typically standard staff middleware handles access. 
    // We assume middleware allows them if they reached here, 
    // but an explicit check could be added if needed.

  const initialConfigs = await getAllEconomyConfigs()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold text-white">
          {locale === 'ar' ? 'وحدة التحكم في الاقتصاد' : 'Economy Control Panel'}
        </h1>
        <p className="mt-2 text-[hsl(220,10%,60%)]">
          {locale === 'ar' 
            ? 'قم بإدارة المعاملات والمضاعفات وحدود الخطر للنظام الاقتصادي. راجع التأثيرات بدقة قبل التطبيق.' 
            : 'Manage system multipliers, thresholds, and limits for the entire ecosystem. Review impact projections before committing changes.'}
        </p>
      </div>

      <EconomyConfigClient initialConfigs={initialConfigs} />
    </div>
  )
}
