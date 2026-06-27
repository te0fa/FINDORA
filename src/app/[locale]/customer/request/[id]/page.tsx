import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OfferRoomClient from '@/components/customer/OfferRoomClient'

export const metadata = {
  title: 'Request Details — FINDORA',
}

export default async function OfferRoomPage({
  params: { locale, id },
}: {
  params: { locale: string, id: string }
}) {
  const supabase = await createClient() as any
  const isAr = locale === 'ar'

  // Fetch the Request
  const { data: request } = await supabase
    .from('customer_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!request) {
    redirect(`/${locale}/customer/dashboard`)
  }

  // Fetch Offers (simulating that the contributor_submissions table holds the offers)
  const { data: offers } = await supabase
    .from('contributor_submissions')
    .select('id, price_reported, details, created_at, contributors(trust_score)')
    .eq('product_id', id) // Assuming product_id maps to customer_request_id for this phase
    .eq('status', 'verified')
    .order('price_reported', { ascending: true })

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <Link href={`/${locale}/customer/dashboard${!request.auth_user_id ? `?requestId=${id}` : ''}`} className="text-sm text-[hsl(220,10%,60%)] hover:text-white">
            {isAr ? '← العودة للطلبات' : '← Back to Requests'}
          </Link>
        </div>

        {/* Request Details Card */}
        <div className="p-6 rounded-2xl border border-white/10 bg-black/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(258,89%,66%)] opacity-10 blur-[50px]"></div>
          
          <h1 className="text-3xl font-extrabold text-white mb-2">{request.product_name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-[hsl(220,10%,60%)]">
            <span>📍 {request.target_location}</span>
            {request.max_price && <span>💰 Max: {request.max_price} EGP</span>}
            <span className="font-mono">📅 {new Date(request.created_at).toLocaleDateString()}</span>
          </div>
          {request.notes && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 text-sm italic border border-white/5">
              "{request.notes}"
            </div>
          )}
        </div>

        {/* The Offer Room Client */}
        <OfferRoomClient locale={locale} request={request} offers={offers || []} />

      </div>
    </div>
  )
}
