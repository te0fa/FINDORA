'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VendorWithCategories, SystemMessage, VendorAuditEntry, AccountTier, SystemStatus } from '@/lib/dal/vendors'

const CATEGORY_LABELS: Record<string, string> = {
  home_appliances: 'أجهزة منزلية',
  screens: 'شاشات',
  smart_electronics: 'إلكترونيات ذكية',
}

function TrustMeter({ score }: { score: number }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>رصيد الثقة</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{score}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999, width: `${score}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${color}66`
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>0</span>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>50</span>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>100</span>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: `${color}0d`, border: `1px solid ${color}22`,
      borderRadius: 12, padding: '16px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function VendorDetailClient({
  vendor, messages, auditLog, locale
}: {
  vendor: VendorWithCategories
  messages: SystemMessage[]
  auditLog: VendorAuditEntry[]
  locale: string
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [activeTab, setActiveTab]     = useState<'overview' | 'messages' | 'audit' | 'automation'>('overview')
  const [newMessage, setNewMessage]   = useState('')
  const [delta, setDelta]             = useState(0)
  const [reason, setReason]           = useState('')
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [localVendor, setLocalVendor] = useState(vendor)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const tierColor: Record<AccountTier, string> = { Gold: '#f7d46b', Silver: '#94a3b8', Bronze: '#cd7f32' }
  const statusColor: Record<SystemStatus, string> = {
    'Active': '#22c55e', 'Suspended': '#ef4444', 'Pending Verification': '#8b5cf6'
  }
  const statusLabel: Record<SystemStatus, string> = {
    'Active': 'نشط', 'Suspended': 'موقوف', 'Pending Verification': 'قيد المراجعة'
  }

  const doAction = async (url: string, method: string, body?: object) => {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'حدث خطأ')
    return json
  }

  const handleSuspend = () => start(async () => {
    try {
      await doAction(`/api/vendors/${vendor.id}/suspend`, 'POST', { reason })
      setLocalVendor(v => ({ ...v, system_status: 'Suspended' }))
      showToast('تم إيقاف المورد ✓')
      start(() => router.refresh())
    } catch (e: any) { showToast(e.message, false) }
  })

  const handleActivate = () => start(async () => {
    try {
      await doAction(`/api/vendors/${vendor.id}/activate`, 'POST')
      setLocalVendor(v => ({ ...v, system_status: 'Active' }))
      showToast('تم تفعيل المورد ✓')
      start(() => router.refresh())
    } catch (e: any) { showToast(e.message, false) }
  })

  const handleTrustAdjust = () => start(async () => {
    try {
      await doAction(`/api/vendors/${vendor.id}/trust-score`, 'PATCH', { delta, reason })
      const newScore = Math.max(0, Math.min(100, localVendor.trust_score + delta))
      const newTier: AccountTier = newScore >= 90 ? 'Gold' : newScore >= 70 ? 'Silver' : 'Bronze'
      setLocalVendor(v => ({ ...v, trust_score: newScore, account_tier: newTier }))
      setDelta(0); setReason('')
      showToast(`تم تعديل الرصيد: ${newScore}% ✓`)
      start(() => router.refresh())
    } catch (e: any) { showToast(e.message, false) }
  })

  const handleSendMessage = () => start(async () => {
    if (!newMessage.trim()) return
    try {
      await doAction(`/api/vendors/${vendor.id}/message`, 'POST', { message: newMessage.trim() })
      setNewMessage('')
      showToast('تم إرسال الرسالة ✓')
      start(() => router.refresh())
    } catch (e: any) { showToast(e.message, false) }
  })

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700,
    cursor: 'pointer', border: 'none', transition: 'all 0.15s', fontFamily: 'inherit',
    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: active ? '#818cf8' : '#64748b',
  })

  return (
    <div style={{ direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#22c55e' : '#ef4444',
          padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem',
          backdropFilter: 'blur(12px)'
        }}>{toast.msg}</div>
      )}

      {/* Back + Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href={`/${locale}/staff/vendors`} style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', gap: 6, marginBottom: 16 }}>
          ← العودة للموردين
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc' }}>
              🏪 {localVendor.display_name}
            </h1>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                color: statusColor[localVendor.system_status as SystemStatus],
                background: `${statusColor[localVendor.system_status as SystemStatus]}15`,
                border: `1px solid ${statusColor[localVendor.system_status as SystemStatus]}30`
              }}>
                {statusLabel[localVendor.system_status as SystemStatus]}
              </span>
              <span style={{
                padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                color: tierColor[localVendor.account_tier as AccountTier],
                background: `${tierColor[localVendor.account_tier as AccountTier]}15`,
                border: `1px solid ${tierColor[localVendor.account_tier as AccountTier]}30`
              }}>
                {localVendor.account_tier === 'Gold' ? '🥇' : localVendor.account_tier === 'Silver' ? '🥈' : '🥉'} {localVendor.account_tier}
              </span>
              {localVendor.governorate && (
                <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.06)' }}>
                  📍 {localVendor.governorate}{localVendor.area ? ` / ${localVendor.area}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard icon="⭐" label="رصيد الثقة" value={`${localVendor.trust_score}%`} color="#f7d46b" />
        <StatCard icon="✅" label="صفقات ناجحة" value={localVendor.total_successful_deals} color="#22c55e" />
        <StatCard icon="⚠️" label="بلاغات مسجلة" value={localVendor.reported_issues} color="#ef4444" />
      </div>

      {/* Trust Meter */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
        <TrustMeter score={localVendor.trust_score} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['overview', 'messages', 'audit', 'automation'] as const).map(tab => (
          <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? '📋 البيانات' : tab === 'messages' ? `💬 الرسائل (${messages.length})` : tab === 'audit' ? `📜 السجل (${auditLog.length})` : '🤖 الأتمتة'}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={panelStyle}>
            <h3 style={panelTitle}>البيانات الأساسية</h3>
            <InfoRow label="اسم المعرض"      value={localVendor.display_name} />
            <InfoRow label="السجل التجاري"  value={localVendor.commercial_reg_number || '—'} />
            <InfoRow label="البطاقة الضريبية" value={localVendor.tax_card_number || '—'} />
            <InfoRow label="المحافظة"        value={localVendor.governorate || '—'} />
            <InfoRow label="المنطقة"         value={localVendor.area || '—'} />
            <InfoRow label="التخصصات"        value={localVendor.categories.map(c => CATEGORY_LABELS[c]).join('، ') || '—'} />
            {localVendor.notes && <InfoRow label="ملاحظات" value={localVendor.notes} />}
            {localVendor.profile_details && (
              <>
                <h3 style={{ ...panelTitle, marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>البيانات التفصيلية</h3>
                <InfoRow label="الاسم بالإنجليزية" value={localVendor.profile_details.business_name_en || '—'} />
                <InfoRow label="نوع التاجر"       value={localVendor.profile_details.merchant_type || '—'} />
                <InfoRow label="التصنيف الأساسي"   value={localVendor.profile_details.category || '—'} />
                <InfoRow label="البريد الإلكتروني"  value={localVendor.profile_details.email || '—'} />
                <InfoRow label="الهاتف الثانوي"   value={localVendor.profile_details.secondary_phone || '—'} />
                <InfoRow label="الموقع الإلكتروني"  value={localVendor.profile_details.website || '—'} />
                <InfoRow label="المدينة"          value={localVendor.profile_details.city || '—'} />
                <InfoRow label="العنوان بالتفصيل"   value={localVendor.profile_details.address || '—'} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Automation Status */}
            <div style={panelStyle}>
              <h3 style={panelTitle}>بيانات الأتمتة</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                <span style={{ fontSize: '1.5rem' }}>{localVendor.whatsapp_number ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: localVendor.whatsapp_number ? '#22c55e' : '#f59e0b' }}>
                    {localVendor.whatsapp_number ? 'واتساب مرتبط' : 'لا يوجد واتساب مرتبط'}
                  </div>
                  {localVendor.whatsapp_number && (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                      {localVendor.whatsapp_number}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={panelStyle}>
              <h3 style={panelTitle}>إجراءات سريعة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {localVendor.system_status !== 'Suspended' ? (
                  <button onClick={handleSuspend} style={actionBtnStyle('#ef4444')}>🚫 إيقاف المورد</button>
                ) : (
                  <button onClick={handleActivate} style={actionBtnStyle('#22c55e')}>✅ تفعيل المورد</button>
                )}
              </div>
            </div>

            {/* Trust Adjustment */}
            <div style={panelStyle}>
              <h3 style={panelTitle}>تعديل رصيد الثقة يدوياً</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="number" min={-100} max={100} value={delta}
                  onChange={e => setDelta(Number(e.target.value))}
                  placeholder="التغيير (+10 أو -5)"
                  style={miniInput} />
                <input type="text" value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="سبب التعديل"
                  style={miniInput} />
                <button onClick={handleTrustAdjust} style={actionBtnStyle('#f7d46b')}>
                  ⭐ تطبيق التعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Messages */}
      {activeTab === 'messages' && (
        <div style={panelStyle}>
          <h3 style={panelTitle}>رسائل النظام</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
              placeholder="اكتب رسالة نظام للمورد..."
              style={{ ...miniInput, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'rgba(99,102,241,0.2)', color: '#818cf8',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
            }}>إرسال</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>لا توجد رسائل بعد</p>
            ) : messages.map(m => (
              <div key={m.id} style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 6 }}>{m.message}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                  {m.staff_name || 'نظام'} · {new Date(m.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div style={panelStyle}>
          <h3 style={panelTitle}>سجل الأحداث</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLog.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '24px 0' }}>لا توجد أحداث مسجلة</p>
            ) : auditLog.map(e => (
              <div key={e.id} style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {e.event_name}
                  </div>
                  {e.new_value && Object.keys(e.new_value).length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 4 }}>
                      {JSON.stringify(e.new_value)}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 4 }}>
                    {e.actor_name || 'نظام'}
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#374151', whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Automation */}
      {activeTab === 'automation' && (
        <div style={panelStyle}>
          <h3 style={panelTitle}>🤖 إعدادات الأتمتة المستقبلية</h3>
          <div style={{
            padding: '24px', borderRadius: 12, marginBottom: 20,
            background: localVendor.whatsapp_number ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${localVendor.whatsapp_number ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '2rem' }}>{localVendor.whatsapp_number ? '✅' : '⚠️'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: localVendor.whatsapp_number ? '#22c55e' : '#f59e0b' }}>
                  {localVendor.whatsapp_number ? 'المورد جاهز للأتمتة' : 'يحتاج ربط واتساب'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                  {localVendor.whatsapp_number
                    ? `رقم الواتساب: ${localVendor.whatsapp_number}`
                    : 'أضف رقم واتساب لتفعيل إرسال الطلبات آلياً'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>🔗 نقاط الاتصال (API Endpoints)</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><span style={{ color: '#22c55e' }}>POST</span> /api/webhooks/vendors/inbound</div>
                <div><span style={{ color: '#60a5fa' }}>POST</span> /api/webhooks/vendors/outbound</div>
                <div><span style={{ color: '#f7d46b' }}>POST</span> /api/vendors/{vendor.id}/message</div>
                <div><span style={{ color: '#f59e0b' }}>PATCH</span> /api/vendors/{vendor.id}/trust-score</div>
              </div>
            </div>
            <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>📌 الحالة: المرحلة الأولى</div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
                جميع نقاط الاتصال مُعدة ومُختبرة. في المرحلة الثانية سيتم ربطها ببوابة واتساب الفعلية
                لإرسال واستقبال طلبات العملاء آلياً دون تدخل بشري.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: 12 }}>
      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: '#e2e8f0', textAlign: 'left' }}>{value}</span>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14, padding: '20px 24px'
}
const panelTitle: React.CSSProperties = {
  margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0'
}
const actionBtnStyle = (color: string): React.CSSProperties => ({
  width: '100%', padding: '10px 16px', borderRadius: 10, border: `1px solid ${color}30`,
  background: `${color}12`, color, fontWeight: 700, fontSize: '0.82rem',
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'center'
})
const miniInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, padding: '10px 14px', color: '#f8fafc', fontSize: '0.82rem',
  fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box'
}
