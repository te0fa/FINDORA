/**
 * src/app/[locale]/admin/link-domains/page.tsx
 * Server Component — guarded by /admin/layout.tsx (canManageAI || isAdmin).
 * Fetches all allowed_link_domains rows and renders the management UI.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import LinkDomainsClient, { type DomainRow } from './LinkDomainsClient'

export const metadata = {
  title: 'إدارة دومينات الروابط | Findora Admin',
  description: 'إضافة وتعديل الدومينات المسموح للعملاء بلصق روابط منتجات منها',
}

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ prefill?: string }>
}

export default async function LinkDomainsPage({ params, searchParams }: PageProps) {
  const { locale }  = await params
  const { prefill } = await searchParams

  const admin = createAdminClient()
  const { data: rawDomains, error } = await admin
    .from('allowed_link_domains')
    .select('id, domain, label, enabled, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: '40px', color: '#ef4444' }}>
        <h1>خطأ في تحميل الدومينات</h1>
        <p>{error.message}</p>
      </div>
    )
  }

  const domains = (rawDomains ?? []) as DomainRow[]

  return (
    <LinkDomainsClient
      initialDomains={domains}
      locale={locale}
      prefill={prefill ?? ''}
    />
  )
}
