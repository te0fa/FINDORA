'use client'

import React, { useState, useActionState } from 'react'
import { savePaymentGatewaySettings } from './actions'

interface Props {
  locale: string
  dict: any
}

export default function PaymentSettingsClient({ locale, dict }: Props) {
  const isRTL = locale === 'ar'
  const [activeTab, setActiveTab] = useState<'paymob' | 'fawry' | 'instapay' | 'wallet' | 'valu'>('paymob')

  const tabs = [
    { id: 'paymob', label: isRTL ? 'بطاقات الائتمان (Paymob)' : 'Credit Cards (Paymob)' },
    { id: 'fawry', label: 'Fawry' },
    { id: 'instapay', label: 'InstaPay' },
    { id: 'wallet', label: isRTL ? 'المحافظ الإلكترونية' : 'Mobile Wallets' },
    { id: 'valu', label: 'ValU' },
  ] as const

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{isRTL ? 'بوابات الدفع (Payment Gateways)' : 'Payment Gateways'}</h1>
        <p className="text-muted">
          {isRTL 
            ? 'إدارة إعدادات بوابات الدفع المتاحة في مصر، وتفعيل أو إيقاف أي وسيلة دفع.' 
            : 'Manage payment gateway settings available in Egypt, activate or deactivate any payment method.'}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-brand-gold text-black shadow-[0_0_15px_rgba(212,166,60,0.3)]' 
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -z-10" />

        {activeTab === 'paymob' && (
          <PaymentGatewayForm 
            gateway="paymob" 
            title={isRTL ? 'إعدادات Paymob' : 'Paymob Settings'} 
            locale={locale} 
            fields={[
              { name: 'apiKey', label: 'API Key', type: 'password' },
              { name: 'integrationId', label: 'Integration ID', type: 'text' },
              { name: 'iframeId', label: 'Iframe ID', type: 'text' },
              { name: 'hmacSecret', label: 'HMAC Secret', type: 'password' }
            ]} 
          />
        )}

        {activeTab === 'fawry' && (
          <PaymentGatewayForm 
            gateway="fawry" 
            title={isRTL ? 'إعدادات فوري (Fawry)' : 'Fawry Settings'} 
            locale={locale} 
            fields={[
              { name: 'merchantCode', label: 'Merchant Code', type: 'text' },
              { name: 'securityKey', label: 'Security Key', type: 'password' },
            ]} 
          />
        )}

        {activeTab === 'instapay' && (
          <PaymentGatewayForm 
            gateway="instapay" 
            title={isRTL ? 'إعدادات InstaPay (بواسطة Paymob)' : 'InstaPay Settings (via Paymob)'} 
            locale={locale} 
            fields={[
              { name: 'integrationId', label: 'InstaPay Integration ID', type: 'text' },
            ]} 
          />
        )}

        {activeTab === 'wallet' && (
          <PaymentGatewayForm 
            gateway="wallet" 
            title={isRTL ? 'المحافظ الإلكترونية (فودافون كاش، إلخ)' : 'Mobile Wallets (Vodafone Cash, etc.)'} 
            locale={locale} 
            fields={[
              { name: 'integrationId', label: 'Wallets Integration ID', type: 'text' },
            ]} 
          />
        )}

        {activeTab === 'valu' && (
          <PaymentGatewayForm 
            gateway="valu" 
            title={isRTL ? 'إعدادات ValU' : 'ValU Settings'} 
            locale={locale} 
            fields={[
              { name: 'integrationId', label: 'ValU Integration ID', type: 'text' },
            ]} 
          />
        )}

      </div>
    </div>
  )
}

function PaymentGatewayForm({ gateway, title, locale, fields }: { gateway: string, title: string, locale: string, fields: any[] }) {
  const isRTL = locale === 'ar'
  const [state, action, pending] = useActionState(savePaymentGatewaySettings, null)

  return (
    <form action={action} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <input type="hidden" name="gateway" value={gateway} />
      <input type="hidden" name="referer" value={`/${locale}/staff/settings/payments`} />

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted mt-1">
            {isRTL ? 'قم بتكوين إعدادات الربط' : 'Configure integration settings'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <label htmlFor={`isActive-${gateway}`} className="text-sm font-bold cursor-pointer">
            {isRTL ? 'تفعيل الوسيلة' : 'Enable Method'}
          </label>
          <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              name="isActive" 
              id={`isActive-${gateway}`} 
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              defaultChecked={gateway === 'paymob'}
            />
            <label 
              htmlFor={`isActive-${gateway}`} 
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"
            ></label>
          </div>
        </div>
      </div>

      {state?.success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm mb-6">
          ✓ {state.message}
        </div>
      )}

      {state?.error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm mb-6">
          ⚠ {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(f => (
          <div key={f.name} className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{f.label}</label>
            <input 
              type="text" 
              name={f.name} 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors font-mono text-sm"
              placeholder={`Enter ${f.label}`}
            />
          </div>
        ))}
      </div>

      <div className="pt-6">
        <button 
          type="submit" 
          disabled={pending}
          className="bg-brand-gold text-black font-bold px-8 py-3 rounded-xl hover:bg-[#e5b955] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
        </button>
      </div>

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
    </form>
  )
}
