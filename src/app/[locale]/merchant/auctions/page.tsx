import { createAdminClient } from '@/lib/dal/customers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { findOrCreateVendorNormalized } from '@/lib/dal/merchant-dedup'
import Link from 'next/link'
import AuctionCountdownClient from './AuctionCountdownClient'

export const metadata = {
  title: 'Merchant Auctions | FINDORA',
}

export default async function MerchantAuctionsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'
  const client = await createAdminClient() as any

  // 1. Fetch active customer requests in progress
  const { data: requests, error } = await client
    .from('customer_requests')
    .select('id, title, product_name, category, raw_description, preferred_governorate, preferred_area, created_at')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })

  // 2. Fetch all current quotes to determine current lowest prices
  const { data: allQuotes } = await client
    .from('merchant_quotes')
    .select('request_id, price_amount')

  // Calculate lowest price per request
  const lowestPricesMap: Record<string, number> = {}
  if (allQuotes) {
    for (const q of allQuotes) {
      const price = Number(q.price_amount)
      if (!lowestPricesMap[q.request_id] || price < lowestPricesMap[q.request_id]) {
        lowestPricesMap[q.request_id] = price
      }
    }
  }

  // Bid submission handler
  async function handleSubmitBid(formData: FormData) {
    'use server'
    const requestId = formData.get('requestId') as string
    const merchantName = formData.get('merchantName') as string
    const phone = formData.get('phone') as string
    const bidPrice = parseFloat(formData.get('bidPrice') as string)
    const validityHours = parseInt(formData.get('validityHours') as string) || 48
    const specs = formData.get('specs') as string

    if (!requestId || !merchantName || !phone || isNaN(bidPrice)) {
      throw new Error('Missing required fields')
    }

    const admin = await createAdminClient() as any

    // Fetch request to get details
    const { data: req } = await admin
      .from('customer_requests')
      .select('title')
      .eq('id', requestId)
      .single()

    // 1. Normalized anti-duplication merchant lookup/registration
    const vendor = await findOrCreateVendorNormalized(merchantName, phone)

    // Calculate valid until timestamp
    const validUntil = new Date(Date.now() + validityHours * 3600 * 1000).toISOString()

    // 2. Insert bid into merchant_quotes
    const { error: bidErr } = await admin
      .from('merchant_quotes')
      .insert({
        request_id: requestId,
        merchant_id: vendor.id,
        source_channel: 'merchant', // Matches check constraint
        product_title: req?.title || 'Auction Bid Product',
        product_specs_summary: specs || 'Merchant bidding item specs',
        price_amount: bidPrice,
        quote_valid_until: validUntil,
        availability_status: 'in_stock',
        contact_notes: `Auction bid. Tel: ${phone}. Specs: ${specs || 'N/A'}`
      })

    if (bidErr) {
      console.error('Failed to submit auction bid:', bidErr.message)
      throw new Error(bidErr.message)
    }

    revalidatePath(`/${locale}/merchant/auctions`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans antialiased bg-radial-gradient">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>🔨</span>
              <span>{isAr ? 'مزاد عروض التجار FINDORA' : 'FINDORA Merchant Bidding Auctions'}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              {isAr 
                ? 'شاهد طلبات العملاء المفتوحة، وعرض عروض أسعار منافسة للحصول على أفضل مركز ترشيح.' 
                : 'View open customer requests, and bid lower prices to secure recommendations.'}
            </p>
          </div>
          <Link href={`/${locale}/dashboard`}>
            <button className="bg-white/5 border border-white/10 text-white rounded-xl px-5 py-2.5 hover:bg-white/10 transition text-xs font-bold">
              {isAr ? 'الرئيسية' : 'Main Hub'}
            </button>
          </Link>
        </div>

        {/* Auctions List */}
        <div className="space-y-6">
          {(!requests || requests.length === 0) ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
              <span className="text-4xl mb-4 block">🔨</span>
              <p className="text-slate-400 font-medium">
                {isAr ? 'لا توجد مزادات عروض نشطة حالياً.' : 'No active merchant auctions at this time.'}
              </p>
            </div>
          ) : (
            requests.map((req: any) => {
              const lowestPrice = lowestPricesMap[req.id]
              const targetBidSuggestion = lowestPrice ? lowestPrice - 300 : null

              return (
                <div 
                  key={req.id} 
                  className="bg-[hsl(220,20%,8%)] border border-white/10 rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 hover:border-amber-500/20 transition-all duration-300 shadow-xl relative overflow-hidden"
                >
                  
                  {/* Left & Middle: Request Detail & Countdown */}
                  <div className="lg:col-span-2 space-y-5">
                    
                    {/* Time Remaining Timer (48 Hours from request creation) */}
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-500/20">
                        {req.category || (isAr ? 'مستلزمات' : 'Sourcing')}
                      </span>
                      
                      {/* Interactive Client Countdown Component */}
                      <AuctionCountdownClient 
                        createdAtIso={req.created_at} 
                        isRTL={isAr} 
                      />
                    </div>

                    <h2 className="text-2xl font-black text-white capitalize">{req.product_name || req.title}</h2>
                    
                    <p className="text-sm text-slate-400 leading-relaxed font-sans select-text">
                      {req.raw_description || (isAr ? 'لا توجد مواصفات إضافية.' : 'No extra specifications provided.')}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2 text-xs">
                        <span className="text-slate-500 mr-2">{isAr ? 'المنطقة المفضلة:' : 'Target Area:'}</span>
                        <span className="font-bold text-white">
                          {req.preferred_governorate ? `${req.preferred_governorate}, ${req.preferred_area || ''}` : (isAr ? 'أي مكان' : 'Anywhere')}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Bidding Target Hint */}
                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                      {lowestPrice ? (
                        <>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                            <span>💡</span>
                            <span>{isAr ? 'مؤشر السعر المستهدف' : 'Dynamic Bidding Target'}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {isAr 
                              ? `أقل سعر معروض حالياً هو ${lowestPrice.toLocaleString()} ج.م. قدم عرضاً بقيمة ${targetBidSuggestion?.toLocaleString()} ج.م أو أقل (خصم 300 ج.م على الأقل) لتكون صاحب العرض الأقوى للعميل!`
                              : `The current lowest offer is EGP ${lowestPrice.toLocaleString()}. Bid EGP ${targetBidSuggestion?.toLocaleString()} or less (at least EGP 300 lower) to secure the top recommended slot!`
                            }
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                            <span>✨</span>
                            <span>{isAr ? 'كن أول من يشارك!' : 'Be the First Bidder!'}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {isAr
                              ? 'لا توجد عروض أسعار مسجلة لهذا الطلب بعد. قدم عرضاً مناسباً الآن لتحصل على أولوية الظهور للعميل.'
                              : 'No merchant quotes have been submitted for this request yet. Submit a competitive bid now to lock in priority exposure.'
                            }
                          </p>
                        </>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 select-none pt-2">
                      <span>🔒</span>
                      <span>
                        {isAr 
                          ? 'تنويه الخصوصية: تم إخفاء الملفات الصوتية لحماية خصوصية العميل.' 
                          : 'Privacy Notice: Customer audio files have been filtered out to protect customer privacy.'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Place Bid Form */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>🔨</span>
                      <span>{isAr ? 'تقديم مزايدة سعرية' : 'Place Auction Bid'}</span>
                    </h3>

                    <form action={handleSubmitBid} className="space-y-4">
                      <input type="hidden" name="requestId" value={req.id} />

                      <div>
                        <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'اسم المحل / الشركة' : 'Merchant Name'}</label>
                        <input 
                          type="text" 
                          name="merchantName" 
                          required 
                          placeholder={isAr ? 'مثال: تريد لاين' : 'e.g. Tradeline'} 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'رقم هاتف التواصل' : 'Phone Number'}</label>
                        <input 
                          type="tel" 
                          name="phone" 
                          required 
                          placeholder="01xxxxxxxxx" 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'عرض سعر المزايدة' : 'Bid Price (EGP)'}</label>
                          <input 
                            type="number" 
                            name="bidPrice" 
                            required 
                            placeholder="EGP" 
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none font-bold text-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'صلاحية العرض' : 'Validity Duration'}</label>
                          <select 
                            name="validityHours" 
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                          >
                            <option value="24">{isAr ? '24 ساعة' : '24 Hours'}</option>
                            <option value="48" selected>{isAr ? '48 ساعة' : '48 Hours'}</option>
                            <option value="72">{isAr ? '72 ساعة' : '72 Hours'}</option>
                            <option value="168">{isAr ? 'أسبوع كامل' : '1 Week'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1 font-bold">{isAr ? 'تفاصيل وملاحظات إضافية' : 'Specs / Notes'}</label>
                        <textarea 
                          name="specs" 
                          rows={3}
                          placeholder={isAr ? 'اللون، الضمان، حالة المنتج، سرعة التوصيل...' : 'Warranty status, color options, shipping speed...'} 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
                        ></textarea>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-3 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        {isAr ? 'تقديم المزايدة السعرية' : 'Submit Auction Bid'}
                      </button>

                    </form>
                  </div>

                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
