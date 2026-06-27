import React from 'react'
import OnboardingWizardClient from '@/components/contributors/OnboardingWizardClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Apply to Work With Us — FINDORA',
}

export default async function ContributorApplyPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/contributors/apply`)
  }

  // Check if they are already an active contributor
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('status')
    .eq('auth_user_id', user.id)
    .single()

  if (contributor && contributor.status === 'active') {
    redirect(`/${locale}/contributors/dashboard`)
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,12%)] py-20 px-4">
      <OnboardingWizardClient locale={locale} />
    </div>
  )
}
