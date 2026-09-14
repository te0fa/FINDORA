import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CustomerDashboardClient from '@/components/customer/CustomerDashboardClient'
import RequestSuccessCelebration from '@/components/customer/RequestSuccessCelebration'
import styles from '@/components/customer/CustomerDashboard.module.css'

export const metadata = {
  title: 'My Requests — FINDORA',
}

export default async function CustomerDashboardPage({
  params,
  searchParams: searchParamsPromise
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ requestId?: string; code?: string; returning?: string }>
}) {
  const { locale } = await params
  const searchParams = await searchParamsPromise
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAr = locale === 'ar'

  let customerRequests: any[] = []
  let featuredRequest: any = null

  // 1. If user is logged in, fetch their requests
  if (user) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (customer) {
      const { data } = await supabase
        .from('customer_requests')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
      customerRequests = data || []

      if (customerRequests.length > 0) {
        const reqIds = customerRequests.map(r => r.id)
        const { data: requestRows } = await supabase
          .from('requests')
          .select('id, request_code')
          .in('id', reqIds)

        if (requestRows) {
          const codeMap = new Map(requestRows.map(r => [r.id, r.request_code]))
          customerRequests = customerRequests.map(r => ({
            ...r,
            request_code: codeMap.get(r.id) || null
          }))
        }
      }
    }
  }
  // 2. If guest, fetch the request passed in URL
  else if (searchParams.requestId) {
    if (searchParams.code) {
      // Capability-based verification: verify request_code matches in canonical requests table
      const { createAdminClient } = await import('@/lib/dal/customers')
      const adminClient = await createAdminClient()

      const { data: requestRow } = await adminClient
        .from('requests')
        .select('*')
        .eq('id', searchParams.requestId)
        .eq('request_code', searchParams.code)
        .maybeSingle()

      if (requestRow) {
        const { data: crRow } = await adminClient
          .from('customer_requests')
          .select('*')
          .eq('id', searchParams.requestId)
          .maybeSingle()

        if (crRow) {
          const merged = {
            ...crRow,
            request_code: requestRow.request_code,
            metadata: requestRow.metadata,
          }
          customerRequests = [merged]
          featuredRequest = merged
        }
      }
    } else {
      const { data } = await supabase
        .from('customer_requests')
        .select('*')
        .eq('id', searchParams.requestId)
        .order('created_at', { ascending: false })
      customerRequests = data || []
    }
  }

  // If featuredRequest not yet set from guest block but searchParams.requestId is present
  if (!featuredRequest && searchParams.requestId) {
    featuredRequest = customerRequests.find(r => r.id === searchParams.requestId) || null

    if (!featuredRequest && searchParams.code) {
      const { createAdminClient } = await import('@/lib/dal/customers')
      const adminClient = await createAdminClient()
      const { data: requestRow } = await adminClient
        .from('requests')
        .select('*')
        .eq('id', searchParams.requestId)
        .eq('request_code', searchParams.code)
        .maybeSingle()
      if (requestRow) {
        const { data: crRow } = await adminClient
          .from('customer_requests')
          .select('*')
          .eq('id', searchParams.requestId)
          .maybeSingle()
        if (crRow) {
          featuredRequest = {
            ...crRow,
            request_code: requestRow.request_code,
            metadata: requestRow.metadata,
          }
        }
      }
    }
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.maxWrapper}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{isAr ? 'طلباتي' : 'My Requests'}</h1>
            <p className={styles.pageSubtitle}>
              {isAr ? 'تتبع حالة طلباتك واستعرض العروض المتاحة' : 'Track your requests and review available offers'}
            </p>
          </div>
          <Link href={`/${locale}/start-request`} className={styles.newRequestBtn}>
            {isAr ? '+ طلب جديد' : '+ New Request'}
          </Link>
        </div>

        {/* Modern Celebration Card when request is created / code is present */}
        {searchParams.code ? (
          <RequestSuccessCelebration
            locale={locale}
            requestCode={searchParams.code}
            requestId={searchParams.requestId}
            isReturning={searchParams.returning === 'true'}
            request={featuredRequest}
          />
        ) : null}

        {/* Guest Warning (only shown when NO code celebration is visible and user is guest with existing requests) */}
        {!user && !searchParams.code && customerRequests.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'rgba(245, 158, 11, 0.08)',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '24px' }}>⚠️</div>
            <div>
              <h4 style={{ fontWeight: 800, color: '#fbbf24', margin: '0 0 4px 0' }}>
                {isAr ? 'أنت تتصفح كزائر' : 'You are browsing as a guest'}
              </h4>
              <p style={{ fontSize: '13px', color: '#ffffff', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                {isAr
                  ? 'يرجى حفظ رابط هذه الصفحة (أو Bookmark) لتتمكن من العودة لتتبع طلبك. أو قم بإنشاء حساب لحفظ طلباتك للأبد.'
                  : 'Please save or bookmark this link to track your request. Alternatively, create an account to save your requests permanently.'}
              </p>
              <Link
                href={`/${locale}/auth/signup`}
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  background: '#fbbf24',
                  color: '#000000',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                {isAr ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              </Link>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div>
          {customerRequests.length > 0 && (
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                {isAr ? 'قائمة الطلبات المسجلة' : 'Registered Requests'}
              </h3>
              <span className={styles.sectionCount}>
                {customerRequests.length} {customerRequests.length === 1 ? (isAr ? 'طلب' : 'request') : (isAr ? 'طلبات' : 'requests')}
              </span>
            </div>
          )}
          <CustomerDashboardClient locale={locale} requests={customerRequests} />
        </div>

      </div>
    </div>
  )
}
