import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Secure Checkout — FINDORA',
}

export default async function SimulatedCheckoutPage({
  params: { locale },
  searchParams
}: {
  params: { locale: string }
  searchParams: { sessionId?: string, amount?: string, offerId?: string, action?: string, dealId?: string }
}) {
  const isAr = locale === 'ar'
  const supabase = await createClient() as any

  const { sessionId, amount, offerId, action } = searchParams

  if (!sessionId || !amount || (!offerId && !searchParams.dealId)) {
    redirect(`/${locale}/customer/dashboard`)
  }

  // If the user clicked "Simulate Payment Success"
  if (action === 'pay') {
    if (offerId) {
      // --- DEMAND-PULL FLOW (Offers) ---
      // 1. Fetch the Offer to find the contributor and request
      const { data: offer } = await supabase
        .from('contributor_submissions')
        .select('*, customer_requests(id)')
        .eq('id', offerId)
        .single()

      if (offer) {
        // 2. Mark the Request as fulfilled
        await supabase
          .from('customer_requests')
          .update({ status: 'completed' })
          .eq('id', offer.product_id)

        // 3. Mark the Offer as accepted
        await supabase
          .from('contributor_submissions')
          .update({ status: 'verified' }) // Assume verified means accepted for now
          .eq('id', offer.id)

        // 4. Trigger the Wallet Engine to reward the contributor!
        await supabase.from('wallet_transactions').insert({
          contributor_id: offer.contributor_id,
          wallet_id: (await supabase.from('contributor_wallets').select('id').eq('contributor_id', offer.contributor_id).single()).data?.id,
          tx_type: 'task_reward',
          amount_egp: offer.price_reported,
          reference_type: 'task',
          reference_id: offer.id,
          status: 'completed'
        })
      }
    } else if (searchParams.dealId) {
      // --- SUPPLY-PUSH FLOW (Deals) ---
      // For now, just simulate success. In a real app, we'd create an "Order" record.
      console.log('Deal purchased successfully:', searchParams.dealId)
    }

    return (
      <div className="min-h-screen bg-[hsl(220,25%,8%)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/60 border border-[hsl(152,69%,51%,0.5)] rounded-3xl p-8 text-center shadow-[0_0_50px_hsl(152,69%,51%,0.2)] backdrop-blur-xl">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">{isAr ? 'تم الدفع بنجاح!' : 'Payment Successful!'}</h1>
          <p className="text-[hsl(220,10%,60%)] mb-8">
            {isAr 
              ? 'تم تأكيد طلبك وتحويل الأموال للمندوب. سيتم التواصل معك قريباً لتسليم المنتج.'
              : 'Your order is confirmed and the scout has been rewarded. You will be contacted shortly for delivery.'}
          </p>
          <Link href={`/${locale}/customer/dashboard`} className="block w-full py-3 bg-[hsl(152,69%,51%)] text-black font-bold rounded-xl hover:bg-[hsl(152,69%,61%)] transition">
            {isAr ? 'العودة للطلبات' : 'Back to Requests'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Gateway Header */}
        <div className="text-center mb-8 border-b border-white/10 pb-6">
          <div className="text-sm font-bold tracking-widest text-[hsl(220,10%,60%)] uppercase mb-2">Secure Checkout</div>
          <div className="text-4xl font-extrabold text-white">{amount} <span className="text-xl text-[hsl(220,10%,60%)]">EGP</span></div>
        </div>

        {/* Dummy Card Form */}
        <div className="space-y-4 mb-8 opacity-50 pointer-events-none grayscale">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Card Number</label>
            <input disabled value="**** **** **** 4242" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Expiry</label>
              <input disabled value="12/25" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">CVC</label>
              <input disabled value="***" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
            </div>
          </div>
        </div>

        {/* Simulator Button */}
        <div className="bg-[hsl(43,96%,56%,0.1)] border border-[hsl(43,96%,56%,0.5)] p-4 rounded-xl text-center mb-6">
          <p className="text-xs text-[hsl(43,96%,56%)] font-bold mb-3">
            {isAr ? 'بيئة الاختبار التجريبية (Sandbox)' : 'Sandbox Environment'}
          </p>
          <form>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="amount" value={amount} />
            {offerId && <input type="hidden" name="offerId" value={offerId} />}
            {searchParams.dealId && <input type="hidden" name="dealId" value={searchParams.dealId} />}
            <input type="hidden" name="action" value="pay" />
            <button type="submit" className="w-full py-3 bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-lg hover:bg-white transition shadow-[0_0_20px_hsl(43,96%,56%,0.3)]">
              {isAr ? 'محاكاة دفع ناجح 💳' : 'Simulate Successful Payment 💳'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[hsl(220,10%,40%)]">
          Protected by AES-256 Encryption. FINDORA acts as an escrow service.
        </p>

      </div>
    </div>
  )
}
