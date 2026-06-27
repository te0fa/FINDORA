'use client'

import React, { useState } from 'react'

interface GamificationSettingsClientProps {
  locale: string
  initialConfig: any
  initialRoleMultipliers: any
  initialRevenueSplit: any
}

export default function GamificationSettingsClient({ locale, initialConfig, initialRoleMultipliers, initialRevenueSplit }: GamificationSettingsClientProps) {
  const isAr = locale === 'ar'
  const [config, setConfig] = useState(initialConfig || {})
  const [roleMultipliers, setRoleMultipliers] = useState(initialRoleMultipliers || {})
  const [revenueSplit, setRevenueSplit] = useState(initialRevenueSplit || {})
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/staff/gamification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_settings: config,
          role_multipliers: roleMultipliers,
          revenue_split: revenueSplit
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      setMessage(isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(error)
      setMessage(isAr ? 'حدث خطأ أثناء الحفظ' : 'Error saving changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">{isAr ? 'إعدادات النمو الفيروسي' : 'Viral Growth Engine Settings'}</h1>
        <p className="mt-1 text-[hsl(220,10%,60%)]">
          {isAr ? 'تحكم في المكافآت، توزيع الأرباح، ومعاملات الأدوار.' : 'Control rewards, revenue distribution, and role multipliers.'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white border-b border-white/10 pb-4">
          {isAr ? 'توزيع الأرباح (نسبة المنصة والمندوبين)' : 'Revenue Split (Platform vs Contributors)'}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'حصة المندوبين (%)' : 'Contributor Pool (%)'}
            </label>
            <input 
              type="number" 
              step="0.01"
              value={revenueSplit.contributor_pool_pct * 100 || 70}
              onChange={(e) => setRevenueSplit({ ...revenueSplit, contributor_pool_pct: Number(e.target.value) / 100 })}
              className="w-full rounded-lg bg-[hsl(152,69%,51%,0.1)] p-3 text-[hsl(152,69%,51%)] font-bold border border-white/10 focus:border-[hsl(152,69%,51%)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'حصة المنصة (%)' : 'Platform Cut (%)'}
            </label>
            <input 
              type="number" 
              step="0.01"
              value={revenueSplit.platform_pct * 100 || 20}
              onChange={(e) => setRevenueSplit({ ...revenueSplit, platform_pct: Number(e.target.value) / 100 })}
              className="w-full rounded-lg bg-[hsl(258,89%,66%,0.1)] p-3 text-[hsl(258,89%,66%)] font-bold border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'حصة الاحتياطي / المكافآت (%)' : 'Reserve & Bonuses (%)'}
            </label>
            <input 
              type="number" 
              step="0.01"
              value={revenueSplit.reserve_pct * 100 || 10}
              onChange={(e) => setRevenueSplit({ ...revenueSplit, reserve_pct: Number(e.target.value) / 100 })}
              className="w-full rounded-lg bg-[hsl(43,96%,56%,0.1)] p-3 text-[hsl(43,96%,56%)] font-bold border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white border-b border-white/10 pb-4">
          {isAr ? 'مضاعفات الأدوار الأساسية' : 'Base Role Multipliers'}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'Field Scout (عمل ميداني)' : 'Field Scout'}
            </label>
            <input 
              type="number" 
              step="0.1"
              value={roleMultipliers.field_scout || 1.2}
              onChange={(e) => setRoleMultipliers({ ...roleMultipliers, field_scout: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'Store Insider (داخل المتجر)' : 'Store Insider'}
            </label>
            <input 
              type="number" 
              step="0.1"
              value={roleMultipliers.store_insider || 1.0}
              onChange={(e) => setRoleMultipliers({ ...roleMultipliers, store_insider: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'Casual (عابر)' : 'Casual'}
            </label>
            <input 
              type="number" 
              step="0.1"
              value={roleMultipliers.casual || 0.8}
              onChange={(e) => setRoleMultipliers({ ...roleMultipliers, casual: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white border-b border-white/10 pb-4">
          {isAr ? 'مكافآت الإحالة (المراحل)' : 'Referral Stage Rewards'}
        </h2>
        
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'مكافأة إكمال أول مهمة (جنيه)' : 'First Task Completion Reward (EGP)'}
            </label>
            <input 
              type="number" 
              value={config.task_completion_egp || 25}
              onChange={(e) => setConfig({ ...config, task_completion_egp: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'مكافأة التسجيل والموافقة (نقاط)' : 'Signup & Approval Reward (Points)'}
            </label>
            <input 
              type="number" 
              value={config.approval_points || 50}
              onChange={(e) => setConfig({ ...config, approval_points: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white border-b border-white/10 pb-4">
          {isAr ? 'إعدادات شبكة (L2)' : 'Level 2 Network Settings'}
        </h2>
        
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'نسبة الأرباح السلبية (L2 %)' : 'Passive Income Percentage (L2 %)'}
            </label>
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                value={config.l2_passive_percentage || 0.05}
                onChange={(e) => setConfig({ ...config, l2_passive_percentage: Number(e.target.value) })}
                className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(43,96%,56%)] focus:outline-none"
              />
              <span className="absolute right-4 top-3 text-[hsl(220,10%,60%)]">%</span>
            </div>
            <p className="mt-2 text-xs text-[hsl(220,10%,60%)]">
              {isAr ? 'النسبة المئوية التي يحصل عليها العضو (مستوى أسطورة) من أرباح دعواته.' : 'The percentage a Legend user earns from their referrals\' task earnings.'}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <label className="mb-2 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'نافذة النشاط (بالأيام)' : 'Activity Window (Days)'}
            </label>
            <input 
              type="number" 
              value={config.activity_window_days || 7}
              onChange={(e) => setConfig({ ...config, activity_window_days: Number(e.target.value) })}
              className="w-full rounded-lg bg-black/50 p-3 text-white border border-white/10 focus:border-[hsl(258,89%,66%)] focus:outline-none"
            />
            <p className="mt-2 text-xs text-[hsl(220,10%,60%)]">
              {isAr ? 'عدد الأيام التي يعتبر بعدها العضو "غير نشط" إذا لم يكمل مهمة.' : 'Days after which a user is considered "inactive" if no tasks are completed.'}
            </p>
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <label className="mb-4 block text-sm font-bold text-[hsl(220,10%,80%)]">
              {isAr ? 'إشعارات النجاة الذكية' : 'Smart Survival Alerts'}
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.notifications?.in_app_enabled ?? true}
                  onChange={(e) => setConfig({ ...config, notifications: { ...config.notifications, in_app_enabled: e.target.checked } })}
                  className="w-5 h-5 accent-[hsl(258,89%,66%)]"
                />
                <span className="text-white text-sm">{isAr ? 'إشعارات داخل التطبيق (مفعل حالياً)' : 'In-App Notifications (Active)'}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer opacity-50">
                <input 
                  type="checkbox" 
                  checked={config.notifications?.email_enabled ?? false}
                  onChange={(e) => setConfig({ ...config, notifications: { ...config.notifications, email_enabled: e.target.checked } })}
                  className="w-5 h-5 accent-[hsl(258,89%,66%)]"
                />
                <span className="text-white text-sm">{isAr ? 'تنبيهات البريد الإلكتروني (قريباً)' : 'Email Alerts (Coming Soon)'}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer opacity-50">
                <input 
                  type="checkbox" 
                  checked={config.notifications?.whatsapp_enabled ?? false}
                  onChange={(e) => setConfig({ ...config, notifications: { ...config.notifications, whatsapp_enabled: e.target.checked } })}
                  className="w-5 h-5 accent-[hsl(258,89%,66%)]"
                />
                <span className="text-white text-sm">{isAr ? 'تنبيهات واتساب (قريباً)' : 'WhatsApp Alerts (Coming Soon)'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-[hsl(258,89%,66%)] px-8 py-3 font-bold text-white shadow-lg transition hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
        >
          {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Settings')}
        </button>
        {message && (
          <span className={`font-bold ${message.includes('خطأ') || message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
