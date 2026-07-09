'use client'

import React, { useState, useEffect } from 'react'
import { SiteContactSettings, updateSiteContactSettingsAction } from './actions'

interface Props {
  locale: string
  initialSettings: SiteContactSettings
}

export default function SiteSettingsClient({ locale, initialSettings }: Props) {
  const isRTL = locale === 'ar'
  const [settings, setSettings] = useState<SiteContactSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(null)
    setError(null)

    try {
      const res = await updateSiteContactSettingsAction(settings)
      if (res.success) {
        setSuccess(isRTL ? '✓ تم حفظ الإعدادات بنجاح!' : '✓ Settings updated successfully!')
      } else {
        setError(res.error || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'An error occurred during saving'))
      }
    } catch (err: any) {
      setError(err.message || (isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'))
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof SiteContactSettings, val: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val,
    }))
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isRTL ? '⚙️ إعدادات معلومات التواصل والروابط' : '⚙️ Site Contact & Social Settings'}
        </h1>
        <p className="text-muted">
          {isRTL
            ? 'التحكم في البريد الإلكتروني وروابط التواصل الاجتماعي وتفعيلها أو إخفائها من فوتر الموقع.'
            : 'Manage contact details, social links, and toggle their visibility in the website footer.'}
        </p>
      </header>

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm">
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Support Contact Section */}
        <div className="glass-card p-6 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -z-10" />
          <h2 className="text-xl font-bold border-b border-white/5 pb-3">
            {isRTL ? '✉️ البريد الإلكتروني للدعم الفني' : '✉️ Support Contact'}
          </h2>

          <div className="space-y-2 max-w-lg">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'البريد الإلكتروني المكتوب' : 'Support Email Address'}
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
              placeholder="e.g. info@findora.app"
              required
            />
          </div>
        </div>

        {/* WhatsApp Section */}
        <div className="glass-card p-6 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -z-10" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold">
              {isRTL ? '💬 تواصل الواتساب' : '💬 WhatsApp Chat'}
            </h2>
            
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <label htmlFor="whatsapp_enabled" className="text-sm font-bold cursor-pointer">
                {isRTL ? 'تفعيل الواتس آب' : 'Enable WhatsApp'}
              </label>
              <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  id="whatsapp_enabled"
                  checked={settings.whatsapp_enabled}
                  onChange={(e) => handleChange('whatsapp_enabled', e.target.checked)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="whatsapp_enabled"
                  className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"
                ></label>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {isRTL ? 'رقم الواتساب (مع رمز الدولة وبدون فواصل)' : 'WhatsApp Phone Number (with country code, e.g. 201000000000)'}
            </label>
            <input
              type="text"
              value={settings.whatsapp_number}
              onChange={(e) => handleChange('whatsapp_number', e.target.value)}
              disabled={!settings.whatsapp_enabled}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm disabled:opacity-40"
              placeholder="e.g. 201000000000"
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="glass-card p-6 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -z-10" />
          <h2 className="text-xl font-bold border-b border-white/5 pb-3">
            {isRTL ? '🔗 روابط الشبكات الاجتماعية' : '🔗 Social Media Channels'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Facebook */}
            <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-blue-400">Facebook</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isRTL ? 'عرض' : 'Show'}</span>
                  <input
                    type="checkbox"
                    checked={settings.facebook_enabled}
                    onChange={(e) => handleChange('facebook_enabled', e.target.checked)}
                  />
                </div>
              </div>
              <input
                type="url"
                value={settings.facebook_url}
                onChange={(e) => handleChange('facebook_url', e.target.value)}
                disabled={!settings.facebook_enabled}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs disabled:opacity-40"
                placeholder="https://facebook.com/..."
              />
            </div>

            {/* Twitter/X */}
            <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-400">Twitter / X</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isRTL ? 'عرض' : 'Show'}</span>
                  <input
                    type="checkbox"
                    checked={settings.twitter_enabled}
                    onChange={(e) => handleChange('twitter_enabled', e.target.checked)}
                  />
                </div>
              </div>
              <input
                type="url"
                value={settings.twitter_url}
                onChange={(e) => handleChange('twitter_url', e.target.value)}
                disabled={!settings.twitter_enabled}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs disabled:opacity-40"
                placeholder="https://twitter.com/..."
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-indigo-400">LinkedIn</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isRTL ? 'عرض' : 'Show'}</span>
                  <input
                    type="checkbox"
                    checked={settings.linkedin_enabled}
                    onChange={(e) => handleChange('linkedin_enabled', e.target.checked)}
                  />
                </div>
              </div>
              <input
                type="url"
                value={settings.linkedin_url}
                onChange={(e) => handleChange('linkedin_url', e.target.value)}
                disabled={!settings.linkedin_enabled}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs disabled:opacity-40"
                placeholder="https://linkedin.com/company/..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-gold text-black font-bold px-8 py-3 rounded-xl hover:bg-[#e5b955] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
        </div>
      </form>

      <style>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #d4a63c;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #d4a63c;
        }
        .toggle-checkbox {
          right: 0;
          z-index: 1;
          border-color: #4b5563;
          transition: all 0.3s;
        }
        [dir="ltr"] .toggle-checkbox:checked {
          right: auto;
          left: calc(100% - 1.5rem);
        }
        [dir="ltr"] .toggle-checkbox {
          left: 0;
          right: auto;
        }
      `}</style>
    </div>
  )
}
