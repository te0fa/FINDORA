'use client'

import React, { useState } from 'react'

export default function MarketplaceManagerClient({
  locale,
  initialVendors,
  initialDeals
}: {
  locale: string
  initialVendors: any[]
  initialDeals: any[]
}) {
  const isAr = locale === 'ar'
  const [activeTab, setActiveTab] = useState<'vendors' | 'deals'>('vendors')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('vendors')}
          className={`px-6 py-3 rounded-xl font-bold transition ${activeTab === 'vendors' ? 'bg-[hsl(258,89%,66%)] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {isAr ? 'الموردين (Vendors)' : 'Vendors'}
        </button>
        <button 
          onClick={() => setActiveTab('deals')}
          className={`px-6 py-3 rounded-xl font-bold transition ${activeTab === 'deals' ? 'bg-[hsl(43,96%,56%)] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          {isAr ? 'العروض (Deals)' : 'Active Deals'}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'vendors' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6">{isAr ? 'إضافة مورد جديد' : 'Add New Vendor'}</h2>
            <form className="space-y-4" action="/api/staff/marketplace/vendor" method="POST">
              <div>
                <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم العمل (عربي)' : 'Business Name (AR)'}</label>
                <input name="business_name_ar" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
              </div>
              <div>
                <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم العمل (إنجليزي)' : 'Business Name (EN)'}</label>
                <input name="business_name_en" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
              </div>
              <div>
                <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'رقم الهاتف' : 'Contact Phone'}</label>
                <input name="contact_phone" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
              </div>
              <button type="submit" className="w-full py-3 bg-[hsl(258,89%,66%)] text-white font-bold rounded-lg hover:bg-[hsl(258,89%,76%)] transition">
                {isAr ? 'حفظ المورد' : 'Save Vendor'}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {initialVendors.length === 0 ? (
              <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 text-[hsl(220,10%,60%)]">
                {isAr ? 'لا يوجد موردين حالياً.' : 'No vendors currently.'}
              </div>
            ) : (
              initialVendors.map(v => (
                <div key={v.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-xl">
                  <div>
                    <h3 className="text-lg font-bold text-white">{isAr ? v.business_name_ar : v.business_name_en}</h3>
                    <p className="text-sm text-[hsl(220,10%,60%)]">{v.contact_phone}</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                    {v.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-black/40 border border-[hsl(43,96%,56%,0.3)] rounded-2xl p-6 backdrop-blur-xl shadow-[0_0_30px_hsl(43,96%,56%,0.05)]">
            <h2 className="text-xl font-bold text-[hsl(43,96%,56%)] mb-6">{isAr ? 'إضافة عرض جديد' : 'Publish New Deal'}</h2>
            <form className="space-y-4" action="/api/staff/marketplace/deal" method="POST">
              <div>
                <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'المورد' : 'Vendor'}</label>
                <select name="vendor_id" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white">
                  {initialVendors.map(v => <option key={v.id} value={v.id} className="bg-black">{v.business_name_en}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم المنتج (AR)' : 'Product (AR)'}</label>
                  <input name="product_name_ar" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم المنتج (EN)' : 'Product (EN)'}</label>
                  <input name="product_name_en" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[hsl(220,10%,60%)] mb-1">{isAr ? 'السعر الأساسي للتاجر (EGP)' : 'Vendor Base Price (EGP)'}</label>
                <input name="base_price_egp" type="number" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" />
                <p className="text-xs text-[hsl(43,96%,56%)] mt-2">
                  {isAr ? '* سيقوم النظام بإضافة عمولة المنصة تلقائياً وعرض السعر النهائي للعميل.' : '* System will auto-add platform commission to final price.'}
                </p>
              </div>
              <button type="submit" className="w-full py-3 bg-[hsl(43,96%,56%)] text-black font-extrabold rounded-lg hover:bg-white transition">
                {isAr ? 'نشر العرض' : 'Publish Deal'}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {initialDeals.length === 0 ? (
              <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 text-[hsl(220,10%,60%)]">
                {isAr ? 'لا يوجد عروض نشطة.' : 'No active deals.'}
              </div>
            ) : (
              initialDeals.map(d => (
                <div key={d.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(43,96%,56%)]"></div>
                  <div className="pl-4">
                    <h3 className="text-lg font-bold text-white">{isAr ? d.deal_title_ar : d.deal_title_en}</h3>
                    <p className="text-sm text-[hsl(220,10%,60%)]">Vendor: {d.product?.vendor?.business_name_en}</p>
                  </div>
                  <div className="text-right mt-4 md:mt-0">
                    <div className="text-2xl font-extrabold text-[hsl(43,96%,56%)]">{d.final_customer_price_egp} <span className="text-sm">EGP</span></div>
                    <p className="text-xs text-[hsl(220,10%,50%)]">
                      {isAr ? `السعر الأساسي: ${d.product?.base_price_egp}` : `Base Price: ${d.product?.base_price_egp}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
