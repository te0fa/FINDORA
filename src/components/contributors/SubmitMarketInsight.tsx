'use client'

import React, { useState } from 'react'

export default function SubmitMarketInsight({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    productName: '',
    category: 'electronics',
    discoveredPrice: '',
    storeName: '',
    zone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // For the UI simulation, we just fake the API call or hit a stub
    // In production, this hits an API that inserts into `market_insights`
    setTimeout(() => {
      alert(isAr ? 'تم رفع بيانات السوق بنجاح! سيتم مراجعتها وتحويلها إلى أرباح.' : 'Market insight submitted successfully! It will be reviewed for rewards.')
      setFormData({ productName: '', category: 'electronics', discoveredPrice: '', storeName: '', zone: '' })
      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <div className="rounded-2xl border border-[hsl(258,89%,66%,0.5)] bg-gradient-to-br from-[hsl(220,20%,12%)] to-black p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[hsl(258,89%,66%)] opacity-20 blur-3xl rounded-full"></div>
      
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-white mb-1">
          {isAr ? 'رفع بيانات من السوق 🕵️‍♂️' : 'Submit Market Insight 🕵️‍♂️'}
        </h2>
        <p className="text-sm text-[hsl(220,10%,60%)]">
          {isAr ? 'لقيت عرض ممتاز أو سعر جديد؟ ارفعه هنا وحوله لأرباح.' : 'Found a great deal or new price? Submit it here and turn it into earnings.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم المنتج' : 'Product Name'}</label>
            <input required value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" placeholder="e.g. iPhone 15 Pro 256GB" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[hsl(220,10%,60%)] mb-1">{isAr ? 'القسم' : 'Category'}</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none">
              <option value="electronics">Electronics</option>
              <option value="appliances">Appliances</option>
              <option value="furniture">Furniture</option>
              <option value="vehicles">Vehicles</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-[hsl(152,69%,51%)] mb-1">{isAr ? 'السعر المكتشف (EGP)' : 'Discovered Price'}</label>
            <input required type="number" value={formData.discoveredPrice} onChange={e => setFormData({...formData, discoveredPrice: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(152,69%,51%)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[hsl(220,10%,60%)] mb-1">{isAr ? 'اسم المحل/المتجر' : 'Store Name'}</label>
            <input required value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[hsl(220,10%,60%)] mb-1">{isAr ? 'المنطقة' : 'Zone / Location'}</label>
            <input required value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none" />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-white/10 py-3 font-bold text-white border border-white/20 transition hover:bg-white/20 disabled:opacity-50 mt-2"
        >
          {isSubmitting ? (isAr ? 'جاري الرفع...' : 'Submitting...') : (isAr ? 'رفع البيانات' : 'Submit Insight')}
        </button>
      </form>
    </div>
  )
}
