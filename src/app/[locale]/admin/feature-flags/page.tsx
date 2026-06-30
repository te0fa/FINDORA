/**
 * src/app/[locale]/admin/feature-flags/page.tsx
 * Server Component — fetches initial flag data and passes to client component.
 * Auth is handled by the parent layout.tsx.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FeatureFlagsClient, { type FeatureFlag } from './FeatureFlagsClient'

export const metadata = {
  title: 'لوحة تحكم الميزات | Findora Admin',
  description: 'إدارة وتشغيل/إيقاف ميزات المنصة في الوقت الفعلي',
}

export default async function FeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Fetch current user (for passing userId to client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all feature flags ordered by category, then by created_at
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawFlags, error } = await (admin as any)
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('created_at', { ascending: true })

  const flags = (rawFlags ?? []) as FeatureFlag[]

  if (error) {
    return (
      <div style={{ padding: '40px', color: '#ef4444' }}>
        <h1>خطأ في تحميل الميزات</h1>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <FeatureFlagsClient
      initialFlags={flags ?? []}
      userId={user?.id ?? ''}
      locale={locale}
    />
  )
}
