'use client'

import React, { useState } from 'react'
import { 
  updateRecruitmentSettings, 
  updateEconomyConfig, 
  updateContributorLevelsAction 
} from '@/app/[locale]/staff/contributors/economy/actions'

interface LevelData {
  level_number: number
  name_ar: string
  name_en: string
  required_active_referrals: number
  cash_multiplier: number
  monthly_cap_egp: number | null
  badge_icon: string
  badge_color: string
}

interface RecruitmentSettingsClientProps {
  initialLimit: {
    max_slots: number
    taken_slots: number
    closes_at: string
    is_active: boolean
  } | null
  initialConfigs: any[]
  initialLevels: LevelData[]
  locale: string
}

export default function RecruitmentSettingsClient({ 
  initialLimit, 
  initialConfigs, 
  initialLevels, 
  locale 
}: RecruitmentSettingsClientProps) {
  const isAr = locale === 'ar'
  
  // Scarcity Limits Campaign State
  const [maxSlots, setMaxSlots] = useState(initialLimit?.max_slots ?? 50)
  const [takenSlots, setTakenSlots] = useState(initialLimit?.taken_slots ?? 0)
  const [closesAt, setClosesAt] = useState(
    initialLimit?.closes_at 
      ? new Date(initialLimit.closes_at).toISOString().slice(0, 16) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [isActive, setIsActive] = useState(initialLimit?.is_active ?? true)
  
  // Economy Config State
  const recruitmentTargetsCfg = initialConfigs.find(c => c.config_key === 'recruitment_targets')
  const roleMultipliersCfg = initialConfigs.find(c => c.config_key === 'role_multipliers')
  const referralSettingsCfg = initialConfigs.find(c => c.config_key === 'referral_settings')

  const [fieldScoutTarget, setFieldScoutTarget] = useState(recruitmentTargetsCfg?.value?.field_scout ?? 15)
  const [storeInsiderTarget, setStoreInsiderTarget] = useState(recruitmentTargetsCfg?.value?.store_insider ?? 5)
  const [casualTarget, setCasualTarget] = useState(recruitmentTargetsCfg?.value?.casual ?? 20)

  const [scoutMultiplier, setScoutMultiplier] = useState(roleMultipliersCfg?.value?.field_scout ?? 1.2)
  const [insiderMultiplier, setInsiderMultiplier] = useState(roleMultipliersCfg?.value?.store_insider ?? 1.0)
  const [casualMultiplier, setCasualMultiplier] = useState(roleMultipliersCfg?.value?.casual ?? 0.8)

  const [l2Percentage, setL2Percentage] = useState(
    referralSettingsCfg?.value?.l2_passive_percentage ? (referralSettingsCfg.value.l2_passive_percentage * 100) : 7
  )

  // Levels State
  const [levels, setLevels] = useState<LevelData[]>(initialLevels || [])

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleLevelChange = (levelNum: number, field: keyof LevelData, val: any) => {
    setLevels(prev => prev.map(l => {
      if (l.level_number === levelNum) {
        return { ...l, [field]: val }
      }
      return l
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')
    try {
      // 1. Update Campaign Limits
      const resLimit = await updateRecruitmentSettings({
        maxSlots: Number(maxSlots),
        takenSlots: Number(takenSlots),
        closesAt: new Date(closesAt).toISOString(),
        isActive
      })

      if (!resLimit.success) {
        throw new Error(resLimit.error)
      }

      // 2. Update Economy configurations
      const updatedConfigs = [
        {
          config_key: 'recruitment_targets',
          value: {
            field_scout: Number(fieldScoutTarget),
            store_insider: Number(storeInsiderTarget),
            casual: Number(casualTarget)
          }
        },
        {
          config_key: 'role_multipliers',
          value: {
            field_scout: Number(scoutMultiplier),
            store_insider: Number(insiderMultiplier),
            casual: Number(casualMultiplier)
          }
        },
        {
          config_key: 'referral_settings',
          value: {
            ...(referralSettingsCfg?.value ?? {}),
            l2_passive_percentage: Number(l2Percentage) / 100
          }
        }
      ]

      const resConfig = await updateEconomyConfig(updatedConfigs)
      if (!resConfig.success) {
        throw new Error(resConfig.error)
      }

      // 3. Update Capability Levels
      const resLevels = await updateContributorLevelsAction(levels)
      if (!resLevels.success) {
        throw new Error(resLevels.error)
      }

      setMessage(isAr ? '✅ تم حفظ جميع الإعدادات وتحديث المنظومة والمستويات بنجاح!' : '✅ All campaign, levels & economy settings saved successfully!')
    } catch (err: any) {
      setMessage(isAr ? `❌ فشل الحفظ: ${err.message}` : `❌ Failed: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '20px',
    marginBottom: '20px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'hsl(220,10%,70%)',
    marginBottom: '6px',
    fontWeight: 600,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const tableInputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: '6px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box'
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    marginTop: '12px',
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: 20,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: 30,
      backdropFilter: 'blur(20px)',
      marginBottom: 30,
    }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
        {isAr ? '⚙️ وحدة التحكم في المنظومة والتسجيل والمستويات' : '⚙️ System & Registration Control Hub'}
      </h2>
      <p style={{ fontSize: 13, color: 'hsl(220,10%,60%)', marginBottom: 24 }}>
        {isAr 
          ? 'من هنا يمكنك التحكم الكامل في تفعيل التسجيل، تعديل مستويات الترقيات للشركاء، وضبط مستهدفات الأعداد وقيم العمولات.'
          : 'From here you can fully control registration state, levels progression criteria, department targets, and rewards multipliers.'}
      </p>

      <form onSubmit={handleSave}>
        
        {/* SECTION 1: MASTER RECRUITMENT CAMPAIGN STATE */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(258,89%,75%)', marginBottom: 12, textTransform: 'uppercase' }}>
            {isAr ? '1️⃣ حالة التسجيل والحدود العامة' : '1️⃣ General Registration Campaign'}
          </h3>
          
          {/* Active Switch Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              <input 
                type="checkbox" 
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'hsl(258,89%,66%)' }}
              />
              {isAr ? 'تفعيل حملة التسجيل المباشر (نشط الآن)' : 'Enable Direct Registration Campaign (Active Now)'}
            </label>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 999,
              background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: isActive ? '#22c55e' : '#ef4444',
              marginLeft: 'auto'
            }}>
              {isActive 
                ? (isAr ? '🟢 نشط ومتاح للتسجيل' : '🟢 Active & Accepting') 
                : (isAr ? '🔴 مغلق / تسجيل اهتمام فقط (Waitlist)' : '🔴 Closed / Waitlist Only')}
            </span>
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{isAr ? 'العدد الكلي للفرص المتاحة' : 'Total Slots Limit (Max)'}</label>
              <input 
                type="number" 
                value={maxSlots} 
                onChange={e => setMaxSlots(Number(e.target.value))} 
                style={inputStyle}
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'المسجلين الفعليين بالفعل' : 'Registered Already (Taken)'}</label>
              <input 
                type="number" 
                value={takenSlots} 
                onChange={e => setTakenSlots(Number(e.target.value))} 
                style={inputStyle}
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'تاريخ غلق باب التقديم' : 'Closing Deadline'}</label>
              <input 
                type="datetime-local" 
                value={closesAt} 
                onChange={e => setClosesAt(e.target.value)} 
                style={inputStyle}
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: INITIAL DIVISION TARGET SLOTS */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(43,96%,75%)', marginBottom: 12, textTransform: 'uppercase' }}>
            {isAr ? '2️⃣ الأعداد المستهدفة لكل قسم عند الافتتاح' : '2️⃣ Division Targets (Scarcity Metrics)'}
          </h3>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{isAr ? 'مستهدف مندوب ميداني (Field Scout)' : 'Field Scout Target Slots'}</label>
              <input 
                type="number" 
                value={fieldScoutTarget} 
                onChange={e => setFieldScoutTarget(Number(e.target.value))} 
                style={inputStyle}
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'مستهدف موظف معرض (Store Insider)' : 'Store Insider Target Slots'}</label>
              <input 
                type="number" 
                value={storeInsiderTarget} 
                onChange={e => setStoreInsiderTarget(Number(e.target.value))} 
                style={inputStyle}
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'مستهدف مساهم عادي (Casual User)' : 'Casual User Target Slots'}</label>
              <input 
                type="number" 
                value={casualTarget} 
                onChange={e => setCasualTarget(Number(e.target.value))} 
                style={inputStyle}
                min={0}
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PARTNERS ECONOMY & COMMISSION SETTINGS */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(152,69%,75%)', marginBottom: 12, textTransform: 'uppercase' }}>
            {isAr ? '3️⃣ إعدادات أرباح الشركاء والعمولات' : '3️⃣ Partners Economy & Commission Settings'}
          </h3>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{isAr ? 'مضاعف عمولة المندوب الميداني' : 'Field Scout Payout Multiplier'}</label>
              <input 
                type="number" 
                value={scoutMultiplier} 
                onChange={e => setScoutMultiplier(Number(e.target.value))} 
                style={inputStyle}
                step="0.05"
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'مضاعف عمولة موظف المعرض' : 'Store Insider Payout Multiplier'}</label>
              <input 
                type="number" 
                value={insiderMultiplier} 
                onChange={e => setInsiderMultiplier(Number(e.target.value))} 
                style={inputStyle}
                step="0.05"
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'مضاعف أرباح المساهم العادي' : 'Casual User Payout Multiplier'}</label>
              <input 
                type="number" 
                value={casualMultiplier} 
                onChange={e => setCasualMultiplier(Number(e.target.value))} 
                style={inputStyle}
                step="0.05"
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{isAr ? 'عمولة الإحالة مدى الحياة (L2 %)' : 'Referral L2 Commission (%)'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input 
                  type="number" 
                  value={l2Percentage} 
                  onChange={e => setL2Percentage(Number(e.target.value))} 
                  style={inputStyle}
                  min={0}
                  max={100}
                  required
                />
                <span style={{ fontSize: 14, fontWeight: 700 }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: EDITABLE CAPABILITY LEVELS */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'hsl(190,90%,70%)', marginBottom: 12, textTransform: 'uppercase' }}>
            {isAr ? '4️⃣ إدارة مستويات ترقيات الشركاء (Access Levels)' : '4️⃣ Manage Access & Capability Levels'}
          </h3>
          <p style={{ fontSize: '11px', color: 'hsl(220,10%,55%)', marginTop: -8, marginBottom: 16 }}>
            {isAr
              ? 'تعديل الشروط اللازمة للارتقاء لكل ليفل، بالإضافة إلى مضاعف الدخل المالي الممنوح والحد الأقصى للسحب الشهري.'
              : 'Modify criteria to scale up levels, cash multiplier payout bonus, and maximum withdrawal limits.'}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'hsl(220,10%,50%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Level</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Icon</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>{isAr ? 'الإحالات المطلوبة' : 'Req. Referrals'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>{isAr ? 'مضاعف الدخل كاش' : 'Cash Multiplier'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>{isAr ? 'الحد الأقصى (EGP)' : 'Monthly Cap'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px' }}>Color</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((lvl) => (
                  <tr key={lvl.level_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>#{lvl.level_number}</td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="text" 
                        value={lvl.badge_icon} 
                        onChange={e => handleLevelChange(lvl.level_number, 'badge_icon', e.target.value)} 
                        style={{ ...tableInputStyle, width: '45px', textAlign: 'center' }} 
                        required
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="text" 
                        value={lvl.name_ar} 
                        onChange={e => handleLevelChange(lvl.level_number, 'name_ar', e.target.value)} 
                        style={tableInputStyle} 
                        required
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="text" 
                        value={lvl.name_en} 
                        onChange={e => handleLevelChange(lvl.level_number, 'name_en', e.target.value)} 
                        style={tableInputStyle} 
                        required
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="number" 
                        value={lvl.required_active_referrals} 
                        onChange={e => handleLevelChange(lvl.level_number, 'required_active_referrals', Number(e.target.value))} 
                        style={{ ...tableInputStyle, width: '70px' }} 
                        min={0}
                        required
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="number" 
                        value={lvl.cash_multiplier} 
                        onChange={e => handleLevelChange(lvl.level_number, 'cash_multiplier', Number(e.target.value))} 
                        style={{ ...tableInputStyle, width: '80px' }} 
                        step="0.05"
                        min={0.1}
                        required
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="number" 
                        value={lvl.monthly_cap_egp === null ? '' : lvl.monthly_cap_egp} 
                        onChange={e => handleLevelChange(lvl.level_number, 'monthly_cap_egp', e.target.value === '' ? null : Number(e.target.value))} 
                        placeholder="Unlimited"
                        style={{ ...tableInputStyle, width: '90px' }} 
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <input 
                        type="text" 
                        value={lvl.badge_color} 
                        onChange={e => handleLevelChange(lvl.level_number, 'badge_color', e.target.value)} 
                        style={{ ...tableInputStyle, width: '80px', fontFamily: 'monospace' }} 
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action button & Response messages */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              background: 'hsl(258,89%,66%)', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'hsl(258,89%,70%)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'hsl(258,89%,66%)'}
          >
            {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving Settings...') : (isAr ? 'حفظ إعدادات المنظومة والمستويات الكلية' : 'Save All Settings')}
          </button>

          {message && <div style={{ fontSize: 14, fontWeight: 700 }}>{message}</div>}
        </div>

      </form>
    </div>
  )
}
