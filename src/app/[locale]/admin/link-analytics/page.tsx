/**
 * src/app/[locale]/admin/link-analytics/page.tsx
 * Server Component — guarded by /admin/layout.tsx (canManageAI || isAdmin).
 */

import { getLinkAttemptSummary, getTopRejectedDomains, getRecentAttempts } from '@/lib/dal/link-attempts'
import LinkAnalyticsClient from './LinkAnalyticsClient'

export const metadata = {
  title: 'تحليل روابط المنتجات | Findora Admin',
  description: 'إحصائيات محاولات لصق روابط المنتجات من قِبل العملاء',
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function LinkAnalyticsPage({ params }: PageProps) {
  const { locale } = await params

  // Default view: last 7 days
  const [summary, topRejected, recent] = await Promise.all([
    getLinkAttemptSummary(7),
    getTopRejectedDomains(7, 20),
    getRecentAttempts(50),
  ])

  return (
    <LinkAnalyticsClient
      locale={locale}
      initialSummary={summary}
      initialTopRejected={topRejected}
      initialRecent={recent}
    />
  )
}
