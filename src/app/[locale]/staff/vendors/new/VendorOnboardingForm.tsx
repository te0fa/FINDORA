'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SpecializationTree } from '@/lib/dal/specializations-client'
import { flattenTreeForSelect } from '@/lib/dal/specializations-client'

// ─── i18n ─────────────────────────────────────────────────────────────────────
const t = (locale: string, en: string, ar: string) => locale === 'ar' ? ar : en

// ─── Bilingual governorates ───────────────────────────────────────────────────
const GOVERNORATES: [string, string][] = [
  ['Cairo','القاهرة'],['Giza','الجيزة'],['Alexandria','الإسكندرية'],
  ['Dakahlia','الدقهلية'],['Sharqia','الشرقية'],['Monufia','المنوفية'],
  ['Qalyubia','القليوبية'],['Gharbia','الغربية'],['Kafr El Sheikh','كفر الشيخ'],
  ['Damietta','دمياط'],['Beheira','البحيرة'],['Ismailia','الإسماعيلية'],
  ['Port Said','بورسعيد'],['Suez','السويس'],['Faiyum','الفيوم'],
  ['Beni Suef','بني سويف'],['Minya','المنيا'],['Assiut','أسيوط'],
  ['Sohag','سوهاج'],['Qena','قنا'],['Luxor','الأقصر'],['Aswan','أسوان'],
  ['Matruh','مطروح'],['New Valley','الوادي الجديد'],
  ['North Sinai','شمال سيناء'],['South Sinai','جنوب سيناء'],['Red Sea','البحر الأحمر'],
]

// ─── Shared styles ────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16, padding: '24px 28px', marginBottom: 24,
}
const lbl: React.CSSProperties = {
  display: 'block', marginBottom: 7, color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600,
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f8fafc', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
}
const sectionTitle: React.CSSProperties = {
  margin: '0 0 18px', fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc',
  display: 'flex', alignItems: 'center', gap: 8,
}

// ─── Section Header ───────────────────────────────────────────────────────────
function Section({ icon, en, ar, locale, children }: { icon: string; en: string; ar: string; locale: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h3 style={sectionTitle}><span>{icon}</span> {t(locale, en, ar)}</h3>
      {children}
    </div>
  )
}

// ─── Specialization Multi-Select ──────────────────────────────────────────────
function SpecializationPicker({
  locale, tree, selected, onChange
}: {
  locale: string
  tree: SpecializationTree[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const flat = flattenTreeForSelect(tree)

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {flat.map(item => {
        const isSelected = selected.includes(item.id)
        const indent = item.level > 0
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            style={{
              padding: indent ? '4px 12px' : '6px 14px',
              borderRadius: 999,
              fontSize: indent ? '0.72rem' : '0.78rem',
              fontWeight: isSelected ? 700 : 500,
              cursor: 'pointer',
              border: `1px solid ${isSelected ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`,
              background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              color: isSelected ? '#818cf8' : '#94a3b8',
              transition: 'all 0.15s',
              marginLeft: indent ? 12 : 0,
            }}
          >
            {indent ? '↳ ' : ''}{locale === 'ar' ? item.name_ar : item.name_en}
          </button>
        )
      })}
      {flat.length === 0 && (
        <p style={{ color: '#475569', fontSize: '0.8rem', margin: 0 }}>
          {t(locale, 'No specializations found — add from Settings.', 'لا توجد تخصصات — أضف من الإعدادات.')}
        </p>
      )}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function VendorOnboardingForm({
  locale,
  specializationsTree,
}: {
  locale: string
  specializationsTree: SpecializationTree[]
}) {
  const router = useRouter()
  const [isPending, startT] = useTransition()

  // Basic Info
  const [displayName, setDisplayName]         = useState('')
  const [commercialReg, setCommercialReg]     = useState('')
  const [taxCard, setTaxCard]                 = useState('')
  const [governorate, setGovernorate]         = useState('')
  const [area, setArea]                       = useState('')
  const [notes, setNotes]                     = useState('')

  // Specializations
  const [selectedSpecs, setSelectedSpecs]     = useState<string[]>([])

  // Automation / Portal
  const [whatsappNumber, setWhatsappNumber]   = useState('')
  const [portalEnabled, setPortalEnabled]     = useState(false)
  const [portalEmail, setPortalEmail]         = useState('')

  // Similar name warning
  const [similar, setSimilar]                 = useState<Array<{id:string;display_name:string}>>([])
  const [nameChecked, setNameChecked]         = useState(false)

  // Form state
  const [error, setError]                     = useState<string | null>(null)
  const [fieldErrors, setFieldErrors]         = useState<Record<string, string>>({})

  // Check for duplicate name on blur
  const handleNameBlur = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) return
    const res = await fetch(`/api/vendors/check-duplicate?name=${encodeURIComponent(displayName.trim())}`)
    const data = await res.json()
    setSimilar(data.similar || [])
    setNameChecked(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!displayName.trim()) errs.displayName = t(locale, 'Vendor name is required', 'اسم المورد مطلوب')
    if (selectedSpecs.length === 0) errs.specs = t(locale, 'Select at least one specialization', 'اختر تخصصاً واحداً على الأقل')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setError(null)

    startT(async () => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:           displayName.trim(),
          commercial_reg_number:  commercialReg || undefined,
          tax_card_number:        taxCard || undefined,
          whatsapp_number:        whatsappNumber || undefined,
          governorate:            governorate || undefined,
          area:                   area || undefined,
          notes:                  notes || undefined,
          portal_enabled:         portalEnabled,
          portal_email:           portalEmail || undefined,
          specialization_ids:     selectedSpecs,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || t(locale, 'Failed to save vendor', 'فشل في حفظ المورد')); return }
      router.push(`/${locale}/staff/vendors/${json.id}`)
    })
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div style={{ direction: dir, maxWidth: 720, margin: '0 auto' }}>
      {/* Back link */}
      <Link href={`/${locale}/staff/vendors`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.8rem', textDecoration: 'none', marginBottom: 24 }}>
        ← {t(locale, 'Back to Vendors', 'العودة إلى قائمة الموردين')}
      </Link>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
          {t(locale, 'Register New Vendor', 'تسجيل مورد جديد')}
        </h1>
        <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.82rem' }}>
          {t(locale,
            'Vendor is saved as "Pending Verification" until manually activated.',
            'يُحفظ المورد بحالة "قيد المراجعة" حتى يتم تفعيله يدوياً.'
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Section 1: Basic Info ── */}
        <Section icon="🏢" en="Basic Information" ar="البيانات الأساسية" locale={locale}>
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>{t(locale, 'Vendor / Store Name *', 'اسم المورد / المتجر *')}</label>
            <input
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setNameChecked(false); setSimilar([]) }}
              onBlur={handleNameBlur}
              style={{ ...inp, borderColor: fieldErrors.displayName ? 'rgba(239,68,68,0.5)' : undefined }}
              placeholder={t(locale, 'e.g. Al Nour Electronics', 'مثال: شركة النور للإلكترونيات')}
            />
            {fieldErrors.displayName && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '4px 0 0' }}>{fieldErrors.displayName}</p>}

            {/* Duplicate warning */}
            {nameChecked && similar.length > 0 && (
              <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p style={{ margin: '0 0 8px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700 }}>
                  ⚠️ {t(locale, 'Similar vendor names already registered:', 'أسماء مشابهة مسجلة بالفعل:')}
                </p>
                {similar.map(v => (
                  <div key={v.id} style={{ color: '#fbbf24', fontSize: '0.8rem', marginBottom: 4 }}>
                    → <Link href={`/${locale}/staff/vendors/${v.id}`} style={{ color: '#fbbf24' }}>{v.display_name}</Link>
                  </div>
                ))}
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                  {t(locale, 'Please verify this is a different vendor before continuing.', 'تأكد أن هذا مورد مختلف قبل المتابعة.')}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>{t(locale, 'Commercial Reg. No.', 'رقم السجل التجاري')}</label>
              <input value={commercialReg} onChange={e => setCommercialReg(e.target.value)} style={inp}
                placeholder={t(locale, 'Optional', 'اختياري')} />
            </div>
            <div>
              <label style={lbl}>{t(locale, 'Tax Card No.', 'رقم البطاقة الضريبية')}</label>
              <input value={taxCard} onChange={e => setTaxCard(e.target.value)} style={inp}
                placeholder={t(locale, 'Optional', 'اختياري')} />
            </div>
          </div>
        </Section>

        {/* ── Section 2: Location ── */}
        <Section icon="📍" en="Location" ar="الموقع الجغرافي" locale={locale}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>{t(locale, 'Governorate', 'المحافظة')}</label>
              <select value={governorate} onChange={e => setGovernorate(e.target.value)}
                style={{ ...inp, cursor: 'pointer' }}>
                <option value="">{t(locale, '— Select —', '— اختر —')}</option>
                {GOVERNORATES.map(([en, ar]) => (
                  <option key={en} value={en}>{t(locale, en, ar)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>{t(locale, 'Area / District', 'المنطقة / الحي')}</label>
              <input value={area} onChange={e => setArea(e.target.value)} style={inp}
                placeholder={t(locale, 'e.g. Nasr City', 'مثال: مدينة نصر')} />
            </div>
          </div>
        </Section>

        {/* ── Section 3: Specializations ── */}
        <Section icon="🏷️" en="Specializations" ar="التخصصات" locale={locale}>
          <p style={{ color: '#475569', fontSize: '0.78rem', margin: '0 0 14px' }}>
            {t(locale,
              'Select all product/service categories this vendor supplies.',
              'اختر جميع الفئات التي يتعامل بها هذا المورد.'
            )}
          </p>
          <SpecializationPicker
            locale={locale}
            tree={specializationsTree}
            selected={selectedSpecs}
            onChange={setSelectedSpecs}
          />
          {fieldErrors.specs && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '8px 0 0' }}>{fieldErrors.specs}</p>}
          {selectedSpecs.length > 0 && (
            <p style={{ color: '#475569', fontSize: '0.73rem', marginTop: 10 }}>
              {t(locale, `${selectedSpecs.length} specialization(s) selected`, `${selectedSpecs.length} تخصص محدد`)}
            </p>
          )}
        </Section>

        {/* ── Section 4: Automation & Portal ── */}
        <Section icon="⚡" en="Automation & Vendor Portal" ar="الأتمتة وبوابة المورد" locale={locale}>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>{t(locale, 'WhatsApp Automation Number', 'رقم واتساب للنظام الآلي')}</label>
            <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} style={inp}
              placeholder="+201012345678"
              dir="ltr" />
            <p style={{ color: '#334155', fontSize: '0.72rem', margin: '5px 0 0' }}>
              {t(locale,
                'Used for automated order notifications and the WhatsApp integration.',
                'يُستخدم لإرسال إشعارات الطلبات التلقائية عبر واتساب.'
              )}
            </p>
          </div>

          {/* Portal toggle */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: portalEnabled ? 16 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t(locale, '🖥️ Vendor Portal Dashboard', '🖥️ لوحة تحكم المورد')}
                </div>
                <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: 4 }}>
                  {t(locale,
                    'Give this vendor their own portal to receive orders, register responses, and manage products. Foundation for the future vendor app.',
                    'أعط المورد لوحة تحكم خاصة به لاستقبال الطلبات وتسجيل الردود وإدارة المنتجات. أساس لتطبيق الموردين المستقبلي.'
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setPortalEnabled(!portalEnabled)}
                style={{
                  width: 48, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: portalEnabled ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', top: 3,
                  left: portalEnabled ? 24 : 4,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {portalEnabled && (
              <div style={{ marginTop: 14 }}>
                <label style={lbl}>{t(locale, 'Portal Login Email', 'البريد الإلكتروني للدخول للبوابة')}</label>
                <input type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} style={inp}
                  placeholder={t(locale, 'vendor@example.com', 'vendor@example.com')} />
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 5: Notes ── */}
        <Section icon="📝" en="Internal Notes" ar="ملاحظات داخلية" locale={locale}>
          <label style={lbl}>{t(locale, 'Notes (internal — not visible to vendor)', 'ملاحظات (داخلية — غير مرئية للمورد)')}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={inp} rows={3}
            placeholder={t(locale, 'e.g. Referred by field agent, has warehouse in Nasr City...', 'مثال: أحاله أحد الأعوان الميدانيين، لديه مستودع في مدينة نصر...')} />
        </Section>

        {/* ── Submit ── */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.83rem', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href={`/${locale}/staff/vendors`} style={{
            padding: '10px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center'
          }}>
            {t(locale, 'Cancel', 'إلغاء')}
          </Link>
          <button type="submit" disabled={isPending} style={{
            padding: '10px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            transition: 'all 0.2s', opacity: isPending ? 0.7 : 1,
          }}>
            {isPending ? t(locale, 'Saving...', 'جاري الحفظ...') : t(locale, '✓ Register Vendor', '✓ تسجيل المورد')}
          </button>
        </div>
      </form>
    </div>
  )
}
