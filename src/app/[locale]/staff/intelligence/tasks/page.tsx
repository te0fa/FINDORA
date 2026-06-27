import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskManagementClient from '@/components/contributors/TaskManagementClient'
import TaskReviewClient from '@/components/contributors/TaskReviewClient'
import GrowthEngineSimulator from '@/components/admin/GrowthEngineSimulator'

export const metadata = {
  title: 'Mission Control — Staff',
}

export default async function StaffTasksPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Authorize
  const { data: staffData } = await (supabase
    .from('staff_members') as any)
    .select('id, staff_role')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffData || (staffData.staff_role !== 'admin' && staffData.staff_role !== 'owner' && staffData.staff_role !== 'reviewer')) {
    redirect(`/${locale}/staff/hub`)
  }

  // Fetch Open Tasks
  const { data: openTasks } = await supabase
    .from('platform_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch Claims awaiting review
  const { data: pendingClaims } = await supabase
    .from('task_claims')
    .select('*, platform_tasks(*), contributors(id, full_name, trust_score)')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })

  return (
    <div className="mx-auto max-w-7xl p-6 pb-20 space-y-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[hsl(258,89%,66%)]">{locale === 'ar' ? 'مركز التحكم في المهام 🎯' : 'Mission Control Center 🎯'}</h1>
        <p className="mt-1 text-[hsl(220,10%,60%)]">
          {locale === 'ar' ? 'أدر الفرص المتاحة وقم بمراجعة تسليمات المندوبين.' : 'Manage open opportunities and review contributor submissions.'}
        </p>
      </div>

      {/* 1. Review Panel */}
      <TaskReviewClient locale={locale} initialClaims={pendingClaims || []} />

      <hr className="border-white/10" />

      {/* 2. Task Creator & Manager */}
      <TaskManagementClient locale={locale} initialTasks={openTasks || []} />

      <hr className="border-white/10" />

      {/* 3. The Growth Engine Simulator */}
      <GrowthEngineSimulator locale={locale} />
    </div>
  )
}
