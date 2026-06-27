'use client'

import React, { useState } from 'react'
import { saveVerificationSettings } from './actions'

export default function VerificationSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await saveVerificationSettings(null, formData)
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'تم حفظ الإعدادات بنجاح' })
      } else {
        setMessage({ type: 'error', text: res.error || 'حدث خطأ أثناء الحفظ' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
          <span>📱</span> إعدادات تفعيل الهاتف
        </h1>
        <p className="text-white/60">
          تحكم في مزود خدمة الـ SMS وإعدادات إرسال رسائل التحقق (OTP) للعملاء
        </p>
      </div>

      <div className="glass-card p-8 rounded-3xl border border-white/10">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">تفعيل نظام التحقق عبر الهاتف</h3>
              <p className="text-sm text-white/50">عند التفعيل، سيُطلب من العملاء تأكيد رقمهم للاستفادة من الطلب المجاني</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="isEnabled" value="on" className="sr-only peer" defaultChecked />
              <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-gold"></div>
            </label>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80">مزود الخدمة (Provider)</label>
              <select 
                name="provider" 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                defaultValue="twilio"
              >
                <option value="twilio">Twilio</option>
                <option value="messagebird">MessageBird</option>
                <option value="aws_sns">AWS SNS</option>
                <option value="infobip">Infobip</option>
                <option value="mock">وضع الاختبار (Mock - للبيئة التجريبية)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80">اسم المرسل (Sender ID)</label>
              <input 
                type="text" 
                name="senderId" 
                placeholder="Findora"
                defaultValue="FINDORA"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold placeholder:text-white/20" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-white/80">مفتاح الربط (API Key)</label>
              <input 
                type="password" 
                name="apiKey" 
                placeholder="أدخل مفتاح الـ API..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold placeholder:text-white/20 font-mono" 
              />
              <p className="text-xs text-white/40 mt-1">يُحفظ هذا المفتاح بشكل آمن ومشفر</p>
            </div>

          </div>

          {message && (
            <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-brand-gold hover:bg-brand-gold/90 text-slate-950 font-black px-8 py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
