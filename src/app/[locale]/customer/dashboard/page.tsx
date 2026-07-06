import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CustomerDashboardClient from '@/components/customer/CustomerDashboardClient'

export const metadata = {
  title: 'My Requests — FINDORA',
}

export default async function CustomerDashboardPage({
  params: { locale },
  searchParams
}: {
  params: { locale: string }
  searchParams: { requestId?: string; code?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAr = locale === 'ar'

  let customerRequests: any[] = []

  // If user is logged in, fetch their requests
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
    }
  } 
  // If guest, fetch only the request passed in URL
  else if (searchParams.requestId) {
    const { data } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('id', searchParams.requestId)
      .order('created_at', { ascending: false })
    customerRequests = data || []
  }

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold">{isAr ? 'طلباتي' : 'My Requests'}</h1>
            <p className="text-[hsl(220,10%,60%)] mt-1">
              {isAr ? 'تتبع حالة طلباتك واستعرض العروض المتاحة' : 'Track your requests and review available offers'}
            </p>
          </div>
          <Link href={`/${locale}/start-request`} className="px-6 py-2 bg-white/10 hover:bg-white/20 font-bold rounded-lg transition">
            {isAr ? '+ طلب جديد' : '+ New Request'}
          </Link>
        </div>

        {/* Success / Request Created Banner */}
        {searchParams.code && (
          <div className="p-6 rounded-2xl border border-[hsl(152,69%,51%,0.4)] bg-[hsl(152,69%,51%,0.1)] flex gap-4 items-start animate-fade-in" data-testid="request-success-banner">
            <div className="text-3xl text-[hsl(152,69%,51%)]">🎉</div>
            <div className="space-y-1">
              <h4 className="font-bold text-[hsl(152,69%,51%)] text-lg">
                {isAr ? 'تم تقديم طلبك بنجاح!' : 'Request Submitted Successfully!'}
              </h4>
              <p className="text-sm text-white/90">
                {isAr
                  ? 'تم إنشاء طلبك بنجاح. يمكنك الآن متابعته أو تعديله من لوحة التحكم هذه.'
                  : 'Your request was created successfully. You can track or manage it from this dashboard.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[hsl(152,69%,51%,0.2)]">
                <span className="text-xs text-[hsl(220,10%,60%)]">
                  {isAr ? 'كود التتبع لتتبع الطلب لاحقاً:' : 'Tracking code to track request later:'}
                </span>
                <span className="px-3 py-1 font-mono text-sm font-bold bg-black/40 text-[hsl(152,69%,51%)] border border-[hsl(152,69%,51%,0.3)] rounded-lg" data-testid="request-success-code">
                  {searchParams.code}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guest Warning */}
        {!user && customerRequests.length > 0 && (
          <div className="p-4 rounded-xl border border-[hsl(43,96%,56%,0.5)] bg-[hsl(43,96%,56%,0.1)] flex gap-4 items-start">
            <div className="text-2xl">⚠️</div>
            <div>
              <h4 className="font-bold text-[hsl(43,96%,56%)]">{isAr ? 'أنت تتصفح كزائر' : 'You are browsing as a guest'}</h4>
              <p className="text-sm text-white mt-1 mb-2">
                {isAr 
                  ? 'يرجى حفظ رابط هذه الصفحة (أو Bookmark) لتتمكن من العودة لتتبع طلبك. أو قم بإنشاء حساب لحفظ طلباتك للأبد.'
                  : 'Please save or bookmark this link to track your request. Alternatively, create an account to save your requests permanently.'}
              </p>
              <Link href={`/${locale}/auth/signup`} className="text-xs font-bold bg-[hsl(43,96%,56%)] text-black px-3 py-1 rounded-md hover:bg-white transition inline-block">
                {isAr ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              </Link>
            </div>
          </div>
        )}

        <CustomerDashboardClient locale={locale} requests={customerRequests} />

      </div>
    </div>
  )
}
