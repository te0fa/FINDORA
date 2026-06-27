'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OfferRoomClient({ locale, request, offers }: { locale: string, request: any, offers: any[] }) {
  const isAr = locale === 'ar'
  const router = useRouter()
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)

  const handleCheckout = () => {
    if (!selectedOffer) return
    router.push(`/${locale}/customer/checkout/${selectedOffer}`)
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-20 bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden">
        {/* Animated Radar Effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[400px] h-[400px] rounded-full border border-[hsl(258,89%,66%)] animate-[ping_3s_ease-in-out_infinite]"></div>
          <div className="w-[200px] h-[200px] rounded-full border border-[hsl(258,89%,66%)] animate-[ping_2s_ease-in-out_infinite] absolute"></div>
        </div>

        <div className="text-6xl mb-6 animate-pulse">📡</div>
        <h3 className="text-2xl font-bold text-white mb-2">{isAr ? 'جاري مسح السوق...' : 'Scanning the Market...'}</h3>
        <p className="text-[hsl(220,10%,60%)] max-w-md mx-auto">
          {isAr 
            ? 'شبكتنا من المناديب يبحثون الآن عن أفضل الأسعار والتوافر لطلبك. سنقوم بإبلاغك فور وصول العروض.' 
            : 'Our network of scouts are currently hunting for the best prices and availability. We will notify you as soon as offers arrive.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        {isAr ? 'عروض السوق المتاحة' : 'Available Market Offers'}
        <span className="bg-[hsl(152,69%,51%,0.2)] text-[hsl(152,69%,51%)] text-sm px-3 py-1 rounded-full font-bold border border-[hsl(152,69%,51%,0.5)]">
          {offers.length} {isAr ? 'عروض' : 'Offers'}
        </span>
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((offer, idx) => {
          const isSelected = selectedOffer === offer.id
          // Extract notes or specifics from JSON details
          const specifics = offer.details?.notes || (isAr ? 'مطابق تماماً لطلبك' : 'Exact match to your request')
          const storeName = offer.details?.store_name || (isAr ? 'مورد معتمد' : 'Verified Supplier')

          return (
            <div 
              key={offer.id} 
              onClick={() => setSelectedOffer(offer.id)}
              className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'bg-[hsl(258,89%,66%,0.1)] border-[hsl(258,89%,66%)] shadow-[0_0_20px_hsl(258,89%,66%,0.2)] scale-[1.02]' 
                  : 'bg-black/40 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-[hsl(220,10%,60%)] font-bold mb-1">
                    🏬 {storeName}
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {offer.price_reported} <span className="text-lg text-[hsl(220,10%,60%)]">EGP</span>
                  </div>
                </div>
                {idx === 0 && (
                  <div className="bg-[hsl(43,96%,56%,0.2)] text-[hsl(43,96%,56%)] text-xs font-bold px-2 py-1 rounded border border-[hsl(43,96%,56%,0.5)]">
                    {isAr ? 'أفضل سعر 🏆' : 'Best Price 🏆'}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-[hsl(220,10%,80%)] bg-black/50 p-3 rounded-xl border border-white/5 mb-4">
                "{specifics}"
              </div>

              <div className="flex justify-between items-center text-xs text-[hsl(220,10%,60%)]">
                <span className="flex items-center gap-1">
                  🛡️ Scout Trust: <span className="text-[hsl(0,84%,60%)] font-bold">{offer.contributors?.trust_score || 85}</span>
                </span>
                <span>⏱️ {new Date(offer.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Checkout Action */}
      <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 transform transition-transform duration-300 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'تم تحديد عرض بقيمة:' : 'Selected offer value:'}</p>
            <p className="text-xl font-bold text-white">
              {selectedOffer ? offers.find(o => o.id === selectedOffer)?.price_reported + ' EGP' : '---'}
            </p>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={!selectedOffer}
            className="px-8 py-3 rounded-xl bg-[hsl(152,69%,51%)] text-black font-extrabold hover:bg-[hsl(152,69%,61%)] transition shadow-[0_0_20px_hsl(152,69%,51%,0.4)] disabled:opacity-50 disabled:shadow-none"
          >
            {isAr ? 'قبول العرض ومتابعة الدفع 💳' : 'Accept & Proceed to Checkout 💳'}
          </button>
        </div>
      </div>
      
      {/* Pad bottom so fixed bar doesn't overlap content */}
      <div className="h-24"></div>
    </div>
  )
}
