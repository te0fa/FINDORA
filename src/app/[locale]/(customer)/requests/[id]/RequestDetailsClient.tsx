"use client";

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { sendCustomerMessage, updateRequestDetails, requestReviewerAction, submitDisputeAction, toggleAutoReorderAction, submitPriceGuaranteeAction, startSmartNegotiationAction } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  request: any
  initialMessages: any[]
  notifications: any[]
  locale: string
  dict: any
  customerId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { en: 'Request Submitted',    ar: 'تم تقديم الطلب',          enDesc: 'Intake & initial confirmation',                  arDesc: 'استلام الطلب والتحقق الأولي',                   pct: 10 },
  { en: 'Technical Review',     ar: 'المراجعة الفنية',          enDesc: 'Analyzing specs & preparing search plan',        arDesc: 'تحليل المواصفات وتجهيز خطة البحث',              pct: 35 },
  { en: 'Active Sourcing',      ar: 'جاري التواصل مع الموردين', enDesc: 'Negotiating with suppliers & gathering quotes',   arDesc: 'التفاوض مع الموردين وجمع عروض الأسعار',          pct: 70 },
  { en: 'Report Ready',         ar: 'التقرير جاهز',             enDesc: 'Sourcing complete — report finalized',           arDesc: 'اكتمل البحث وتجهيز التقرير النهائي',             pct: 100 },
]

const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', normal: '#d4a63c', low: '#94a3b8',
}

function getStageInfo(status: string, isReleased: boolean, locale: string) {
  const ar = locale === 'ar'
  if (isReleased) return {
    title: ar ? '🎉 التقرير جاهز!' : '🎉 Sourcing Report Complete!',
    desc: ar ? 'تم إيجاد الموردين المثاليين. يمكنك الآن فك القفل للاطلاع على التفاصيل الكاملة.' : 'Our team has finalised your request. Unlock to view full supplier data.',
  }
  const map: Record<string, { title: string; desc: string }> = {
    submitted: { title: ar ? '🔍 مراجعة المتطلبات' : '🔍 Requirements Review', desc: ar ? 'طلبك مع محلل المشتريات لمراجعة المواصفات قبل التواصل مع الموردين.' : 'Your request is with a sourcing analyst to verify specifications before supplier outreach.' },
    open:      { title: ar ? '🔍 مراجعة المتطلبات' : '🔍 Requirements Review', desc: ar ? 'طلبك مع محلل المشتريات لمراجعة المواصفات قبل التواصل مع الموردين.' : 'Your request is with a sourcing analyst to verify specifications before supplier outreach.' },
    in_progress:{ title: ar ? '⚡ جاري البحث النشط' : '⚡ Active Market Sourcing', desc: ar ? 'نتفاوض مع الموردين المعتمدين للحصول على أفضل سعر وجودة.' : 'We\'re reaching out to verified suppliers to secure best pricing & delivery terms.' },
    research:  { title: ar ? '⚡ جاري البحث النشط' : '⚡ Active Market Sourcing', desc: ar ? 'نتفاوض مع الموردين المعتمدين للحصول على أفضل سعر وجودة.' : 'We\'re reaching out to verified suppliers to secure best pricing & delivery terms.' },
    reporting: { title: ar ? '✍️ إعداد التقرير النهائي' : '✍️ Compiling Final Report', desc: ar ? 'جاري مقارنة عروض الأسعار وإعداد ملخص التقرير النهائي لمساعدتك في اتخاذ القرار.' : 'Formatting quote comparisons & drafting the final sourcing summary for your review.' },
  }
  return map[status] || { title: ar ? '⚙️ جاري المعالجة' : '⚙️ In Progress', desc: ar ? 'طلبك قيد المعالجة النشطة.' : 'Your request is being actively processed.' }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RequestDetailsClient({ request, initialMessages, notifications, locale, dict, customerId }: Props) {
  const ar = locale === 'ar'
  const dir = ar ? 'rtl' : 'ltr'

  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'quotes' | 'report' | 'qa'>('timeline')
  const [messages, setMessages] = useState(initialMessages || [])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatNotConfigured, setChatNotConfigured] = useState(false)

  // Disputes State
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState<'price_discrepancy' | 'item_mismatch' | 'execution_issue' | 'other'>('price_discrepancy')
  const [disputeDetails, setDisputeDetails] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeSuccess, setDisputeSuccess] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')

  // Price Guarantee State
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false)
  const [lowerPrice, setLowerPrice] = useState<number>(0)
  const [proofDetails, setProofDetails] = useState('')
  const [guaranteeLoading, setGuaranteeLoading] = useState(false)
  const [guaranteeSuccess, setGuaranteeSuccess] = useState(false)

  // Auto Reorder State
  const [isRecurring, setIsRecurring] = useState(request.is_recurring || false)
  const [reorderInterval, setReorderInterval] = useState(request.reorder_interval_months || 3)
  const [reorderLoading, setReorderLoading] = useState(false)

  // Smart Negotiation State
  const [negotiationLoading, setNegotiationLoading] = useState(false)
  const [negotiationSuccess, setNegotiationSuccess] = useState(false)
  const [negotiatedCount, setNegotiatedCount] = useState(0)

  // Q&A Community State
  const [newQuestion, setNewQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaSuccess, setQaSuccess] = useState(false)
  const [qaList, setQaList] = useState<any[]>([])

  useEffect(() => {
    async function loadQA() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('buyer_qa')
        .select('*')
        .eq('product_name', request.title)
        .eq('status', 'answered')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setQaList(data)
      }
    }
    if (activeTab === 'qa') {
      loadQA()
    }
  }, [activeTab, request.title])

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(request.title || '')
  const [editDescription, setEditDescription] = useState(request.raw_description || '')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [showModModal, setShowModModal] = useState(false)
  const [modText, setModText] = useState('')
  const [modLoading, setModLoading] = useState(false)
  const [modSuccess, setModSuccess] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const isReleased = !!request.client_released_at
  const canEditDirectly = ['submitted', 'open'].includes(request.current_status)
  const status = request.customer_visible_status || request.current_status
  const pct = request.pipeline_completion_pct ?? 0
  const stageInfo = getStageInfo(status, isReleased, locale)

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return
    setIsSending(true)
    const text = newMessage
    setNewMessage('')
    const tempId = Date.now().toString()
    const optimistic = { id: tempId, request_id: request.request_id, sender_type: 'customer', sender_id: customerId, message: text, created_at: new Date().toISOString() }
    setMessages((p: any) => [...p, optimistic])
    try {
      const res = await sendCustomerMessage(request.request_id, text)
      if (!res.success) {
        setMessages((p: any) => p.filter((m: any) => m.id !== tempId))
        if (res.error === 'CHAT_NOT_CONFIGURED') setChatNotConfigured(true)
      } else {
        setMessages((p: any) => p.map((m: any) => m.id === tempId ? res.message : m))
      }
    } finally { setIsSending(false) }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await updateRequestDetails(request.request_id, editDescription, editTitle)
      if (res.success) setIsEditing(false)
      else setEditError(res.error || (ar ? 'فشل التعديل' : 'Update failed'))
    } catch (err: any) { setEditError(err.message) }
    finally { setEditLoading(false) }
  }

  const handleMod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modText.trim() || modLoading) return
    setModLoading(true)
    try {
      const res = await requestReviewerAction(request.request_id, modText)
      if (res.success) {
        setModSuccess(true)
        setModText('')
        setMessages((p: any) => [...p, res.message])
        setTimeout(() => { setShowModModal(false); setModSuccess(false) }, 2000)
      }
    } finally { setModLoading(false) }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: '2rem',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const btnPrimary: React.CSSProperties = {
    background: '#d4a63c',
    color: '#000',
    border: 'none',
    borderRadius: 10,
    padding: '0.65rem 1.5rem',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  }

  const btnGhost: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '0.65rem 1.5rem',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  }

  const TABS = [
    { key: 'timeline', icon: '📋', en: 'Timeline & Specs', ar: 'الحالة والمواصفات' },
    { key: 'messages', icon: '💬', en: 'Chat with Reviewer', ar: 'محادثة المراجع', count: messages.filter((m: any) => m.sender_type !== 'system').length },
    { key: 'quotes',   icon: '💵', en: 'Price Quotes', ar: 'عروض الأسعار' },
    { key: 'report',   icon: '📄', en: 'Report & Pay', ar: 'التقرير والدفع', locked: !isReleased },
    { key: 'qa',       icon: '❓', en: 'Q&A Community', ar: 'اسأل المشترين' },
  ]

  return (
    <div style={{ direction: dir }}>

      {/* ── Header Banner ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '2rem 2.5rem', marginBottom: '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, background: 'rgba(212,166,60,0.06)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 12px', borderRadius: 20, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>
                {request.request_code}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                {new Date(request.request_created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 style={{ margin: '0 0 0.6rem 0', fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {request.title}
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 560 }}>
              {stageInfo.desc}
            </p>
          </div>

          <div style={{ textAlign: ar ? 'left' : 'right', flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 30, padding: '6px 16px', marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isReleased ? '#4ade80' : '#d4a63c', boxShadow: `0 0 8px ${isReleased ? '#4ade80' : '#d4a63c'}`, display: 'block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{stageInfo.title.replace(/[\u2700-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '').trim()}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              {ar ? 'التقدم الكلي:' : 'Overall progress:'}{' '}
              <strong style={{ color: '#d4a63c' }}>{pct}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Sidebar + Content ──────────────────────────────────── */}
      <div className="request-details-grid">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="request-details-sidebar scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const isLocked = tab.locked
            return (
              <button
                key={tab.key}
                disabled={isLocked}
                onClick={() => !isLocked && setActiveTab(tab.key as any)}
                style={{
                  flexShrink: 0,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.9rem 1.1rem',
                  borderRadius: 14,
                  border: isActive ? '1px solid rgba(212,166,60,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  background: isActive ? 'rgba(212,166,60,0.1)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#d4a63c' : isLocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.83rem',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  textAlign: ar ? 'right' : 'left',
                  transition: 'all 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{tab.icon}</span>
                  <span>{ar ? tab.ar : tab.en}</span>
                </span>
                {tab.count !== undefined && (
                  <span style={{ background: isActive ? '#d4a63c' : 'rgba(255,255,255,0.1)', color: isActive ? '#000' : 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700, minWidth: 22, textAlign: 'center' }}>
                    {tab.count}
                  </span>
                )}
                {isLocked && <span style={{ fontSize: '0.7rem' }}>🔒</span>}
              </button>
            )
          })}

          {/* Support Box */}
          <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, margin: '0 auto 0.75rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>{ar ? 'دعم سريع' : 'Quick Support'}</p>
            <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>19488</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>info@findora.net</p>
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        <div>

          {/* ══ TIMELINE TAB ═══════════════════════════════════════════════ */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Specifications */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#d4a63c' }}>📋</span>
                    {ar ? 'المواصفات والتفاصيل' : 'Specifications & Details'}
                  </h2>
                  {canEditDirectly ? (
                    <button onClick={() => setIsEditing(!isEditing)} style={{ ...btnGhost, padding: '0.4rem 1rem', fontSize: '0.78rem' }}>
                      {isEditing ? (ar ? 'إلغاء' : 'Cancel') : (ar ? 'تعديل' : 'Edit')}
                    </button>
                  ) : (
                    <button onClick={() => setShowModModal(true)} style={{ ...btnGhost, padding: '0.4rem 1rem', fontSize: '0.78rem', borderColor: 'rgba(212,166,60,0.3)', color: '#d4a63c' }}>
                      {ar ? 'طلب تعديل' : 'Request Edit'}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {editError && <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: '0.85rem' }}>{editError}</div>}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'العنوان' : 'Title'}</label>
                      <input style={inputStyle} value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'التفاصيل والمواصفات' : 'Description & Specs'}</label>
                      <textarea style={{ ...inputStyle, minHeight: 130, resize: 'vertical' }} value={editDescription} onChange={e => setEditDescription(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" onClick={() => setIsEditing(false)} style={btnGhost}>{ar ? 'إلغاء' : 'Cancel'}</button>
                      <button type="submit" disabled={editLoading} style={btnPrimary}>{editLoading ? '...' : (ar ? 'حفظ' : 'Save')}</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '1.25rem' }}>
                      <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>{ar ? 'الوصف' : 'Description'}</p>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {request.raw_description || (ar ? 'لا يوجد وصف.' : 'No description provided.')}
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { label: ar ? 'الميزانية' : 'Budget', value: request.budget_min || request.budget_max ? `${request.budget_min || '0'} – ${request.budget_max || '∞'} EGP` : (ar ? 'غير محددة' : 'Not specified') },
                        { label: ar ? 'منطقة البحث' : 'Preferred Region', value: request.preferred_governorate ? `${request.preferred_governorate}${request.preferred_area ? ' – ' + request.preferred_area : ''}` : (ar ? 'كل مصر' : 'All Egypt') },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '1rem 1.25rem' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>{m.label}</p>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', fontWeight: 500 }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Milestone Progress */}
              <div style={card}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#d4a63c' }}>📈</span>
                  {ar ? 'مراحل معالجة طلبك' : 'Sourcing Milestones'}
                </h2>

                <div style={{ position: 'relative', paddingInlineStart: '2rem' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', insetInlineStart: '7px', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {STEPS.map((s, idx) => {
                      const done = pct >= s.pct || isReleased
                      const current = !isReleased && pct < s.pct && (idx === 0 || pct >= STEPS[idx - 1].pct)
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          {/* Dot */}
                          <div style={{
                            position: 'absolute',
                            insetInlineStart: '-2rem',
                            top: 2,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: `3px solid ${done ? '#d4a63c' : current ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                            background: done ? '#d4a63c' : current ? 'rgba(255,255,255,0.2)' : 'transparent',
                            boxShadow: done ? '0 0 10px rgba(212,166,60,0.5)' : 'none',
                          }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4, flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: done || current ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                {ar ? s.ar : s.en}
                              </h3>
                              {current && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  {ar ? 'الحالية' : 'Current'}
                                </span>
                              )}
                              {done && !current && (
                                <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>✓</span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: done || current ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
                              {ar ? s.arDesc : s.enDesc}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Findora Trust & Business Center */}
              <div style={card}>
                <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#d4a63c' }}>🛡️</span>
                  {ar ? 'أدوات الحماية والتحكم الذكي' : 'Protection & Smart Controls'}
                </h2>

                {/* Findora Business B2B Display */}
                {request.is_business && (
                  <div style={{ background: 'rgba(212,166,60,0.08)', border: '1px solid rgba(212,166,60,0.2)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>💼</span>
                      <strong style={{ color: '#d4a63c', fontSize: '0.9rem' }}>{ar ? 'طلب شركات معتمد (B2B)' : 'Verified Business Request (B2B)'}</strong>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      {ar ? `الشركة: ${request.business_metadata?.company_name || 'غير محدد'}` : `Company: ${request.business_metadata?.company_name || 'N/A'}`}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                      <div>{ar ? `السجل التجاري: ${request.business_metadata?.cr_number || 'N/A'}` : `CR Number: ${request.business_metadata?.cr_number || 'N/A'}`}</div>
                      <div>{ar ? `الرقم الضريبي: ${request.business_metadata?.tax_number || 'N/A'}` : `Tax Number: ${request.business_metadata?.tax_number || 'N/A'}`}</div>
                    </div>
                    {request.rfq_document && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#fff', marginBottom: 4 }}>{ar ? '📄 مستند طلب العروض (RFQ) المولد بالذكاء الاصطناعي:' : '📄 Generated AI RFQ Document:'}</strong>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {request.rfq_document}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Reorder Control */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#fff', fontSize: '0.88rem', marginBottom: 4 }}>{ar ? '🔁 إعادة الطلب التلقائي' : '🔁 Auto Reorder'}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                        {ar ? 'طلب السلعة تلقائياً قبل نفادها أو موعد تجديدها.' : 'Automatically reorder before depletion or renewal.'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isRecurring && (
                        <select
                          value={reorderInterval}
                          disabled={reorderLoading}
                          onChange={async (e) => {
                            const val = parseInt(e.target.value)
                            setReorderInterval(val)
                            setReorderLoading(true)
                            await toggleAutoReorderAction(request.request_id, true, val)
                            setReorderLoading(false)
                          }}
                          style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          <option value={1}>{ar ? 'كل شهر' : 'Every 1 Month'}</option>
                          <option value={3}>{ar ? 'كل ٣ أشهر' : 'Every 3 Months'}</option>
                          <option value={6}>{ar ? 'كل ٦ أشهر' : 'Every 6 Months'}</option>
                        </select>
                      )}
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        disabled={reorderLoading}
                        style={{ width: 20, height: 20, cursor: 'pointer' }}
                        onChange={async (e) => {
                          const val = e.target.checked
                          setIsRecurring(val)
                          setReorderLoading(true)
                          await toggleAutoReorderAction(request.request_id, val, reorderInterval)
                          setReorderLoading(false)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sourcing Negotiation & Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Smart Negotiation */}
                  {!['submitted', 'open', 'cancelled', 'expired'].includes(request.current_status) && (
                    <button
                      onClick={async () => {
                        setNegotiationLoading(true)
                        setNegotiationSuccess(false)
                        const res = await startSmartNegotiationAction(request.request_id)
                        setNegotiationLoading(false)
                        if (res.success) {
                          setNegotiatedCount(res.notifiedCount || 0)
                          setNegotiationSuccess(true)
                        } else {
                          alert(res.error || 'Failed to start negotiation')
                        }
                      }}
                      disabled={negotiationLoading}
                      style={{ ...btnGhost, borderColor: '#d4a63c', color: '#d4a63c', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {negotiationLoading ? '...' : (ar ? '💬 فاوض نيابة عني' : '💬 Negotiate For Me')}
                    </button>
                  )}

                  {/* Price Guarantee */}
                  <button
                    onClick={() => setShowGuaranteeModal(true)}
                    style={{ ...btnGhost, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    🛡️ {ar ? 'ضمان أقل سعر' : 'Price Guarantee'}
                  </button>

                  {/* Buyer Protection / Dispute */}
                  <button
                    onClick={() => {
                      setShowDisputeModal(true)
                    }}
                    style={{ ...btnGhost, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                  >
                    ⚖️ {ar ? 'حماية المشتري / نزاع' : 'Buyer Protection'}
                  </button>
                </div>

                {negotiationSuccess && (
                  <div style={{ marginTop: 12, padding: '0.75rem', background: 'rgba(212,166,60,0.1)', border: '1px solid rgba(212,166,60,0.2)', borderRadius: 10, color: '#d4a63c', fontSize: '0.8rem', textAlign: 'center' }}>
                    {ar
                      ? `✓ تم تفعيل التفاوض الذكي! تم تنبيه ${negotiatedCount} تاجر عبر واتساب لتخفيض أسعارهم.`
                      : `✓ Smart Negotiation active! Sent alerts to ${negotiatedCount} merchants to lower quotes.`}
                  </div>
                )}
              </div>

              {/* ── Status & Email Notifications ──────────────────────────── */}
              <div style={card}>
                <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#d4a63c' }}>📬</span>
                  {ar ? 'رسائل الحالة والإشعارات' : 'Status Messages & Notifications'}
                </h2>

                {/* Current status banner */}
                <div style={{ background: 'rgba(212,166,60,0.06)', border: '1px solid rgba(212,166,60,0.2)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4a63c', marginTop: 6, flexShrink: 0, boxShadow: '0 0 8px rgba(212,166,60,0.6)' }} />
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d4a63c' }}>
                      {ar ? 'حالة طلبك الآن' : 'Current Request Status'}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {stageInfo.title.replace(/[\u2700-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '').trim()} — {stageInfo.desc}
                    </p>
                  </div>
                </div>

                {/* Email notifications log */}
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
                    <p style={{ margin: 0, fontSize: '0.83rem' }}>
                      {ar ? 'لا توجد إشعارات مُرسلة بعد.' : 'No email notifications sent yet.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.map((notif: any) => {
                      const isSent = notif.status === 'sent'
                      const isDraft = notif.status === 'draft' || notif.status === 'queued'
                      const dotColor = isSent ? '#4ade80' : isDraft ? '#d4a63c' : '#ef4444'
                      const label = isSent
                        ? (ar ? 'تم الإرسال' : 'Sent')
                        : isDraft
                          ? (ar ? 'في الانتظار' : 'Queued')
                          : (ar ? 'فشل الإرسال' : 'Failed')
                      return (
                        <div key={notif.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: 8, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'block', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                                {notif.rendered_subject || notif.template_code?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${dotColor}18`, color: dotColor, border: `1px solid ${dotColor}30` }}>
                                {label}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                                {new Date(notif.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          {notif.rendered_body && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                              {notif.rendered_body.replace(/<[^>]+>/g, '').trim()}
                            </p>
                          )}
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {notif.channel === 'email' ? (ar ? 'بريد إلكتروني' : 'Email') : notif.channel}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ MESSAGES TAB ══════════════════════════════════════════════ */}
          {activeTab === 'messages' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: chatNotConfigured ? 'auto' : 620 }}>

              {/* Chat not configured banner */}
              {chatNotConfigured ? (
                <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
                    {ar ? 'خدمة المحادثة قيد الإعداد' : 'Chat Feature — Setup Required'}
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.7, maxWidth: 400, marginInline: 'auto' }}>
                    {ar
                      ? 'جدول الرسائل غير موجود في قاعدة البيانات بعد. يرجى التواصل مع الدعم الفني لتفعيل هذه الخاصية.'
                      : 'The chat database table is not yet set up. Please contact the technical team to run the migration and enable this feature.'}
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1rem 1.25rem', maxWidth: 420, marginInline: 'auto', textAlign: ar ? 'right' : 'left' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
                      {ar ? 'في الوقت الحالي، تواصل معنا عبر:' : 'In the meantime, reach us via:'}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📞 19488</p>
                    <p style={{ margin: 0, fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)' }}>✉️ info@findora.net</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{ar ? 'المحادثة المباشرة' : 'Direct Procurement Chat'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'block' }} />
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ar ? 'متوسط الرد: ساعتان' : 'Avg. reply: 2 hrs'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.length === 0 ? (
                      <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{ar ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, maxWidth: 280, marginInline: 'auto' }}>
                          {ar ? 'أرسل استفساراتك للمراجع المختص مباشرة.' : 'Send your inquiries to your assigned sourcing reviewer.'}
                        </p>
                      </div>
                    ) : messages.map((msg: any) => {
                      const isSys = msg.sender_type === 'system' || msg.message?.startsWith('[SYSTEM]')
                      const isCust = msg.sender_type === 'customer'
                      const isMod = msg.message?.startsWith('[CLIENT EDIT REQUEST]')
                      const text = msg.message?.replace(/^\[(SYSTEM|CLIENT EDIT REQUEST)\]\s*/g, '').trim()

                      if (isSys) return (
                        <div key={msg.id} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {text}
                        </div>
                      )

                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isCust ? 'flex-end' : 'flex-start', maxWidth: '75%', gap: 4, alignItems: isCust ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isCust ? (ar ? 'أنت' : 'You') : (ar ? 'مراجع فايندورا' : 'Findora Reviewer')} · {new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMod ? (
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '0.75rem 1rem', color: '#fbbf24', fontSize: '0.83rem', lineHeight: 1.5 }}>
                              <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.7 }}>⚠️ {ar ? 'طلب تعديل' : 'Modification Request'}</span>
                              {text}
                            </div>
                          ) : (
                            <div style={{
                              padding: '0.75rem 1rem',
                              borderRadius: 16,
                              borderTopRightRadius: isCust ? 4 : 16,
                              borderTopLeftRadius: isCust ? 16 : 4,
                              fontSize: '0.88rem',
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                              ...(isCust
                                ? { background: '#d4a63c', color: '#000', fontWeight: 600 }
                                : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' })
                            }}>
                              {text}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat input */}
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <input
                        style={{ ...inputStyle, flex: 1, width: 'auto', minWidth: 0, margin: 0 }}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={ar ? 'اكتب رسالتك للمراجع...' : 'Type your message to the reviewer...'}
                        required
                      />
                      <button
                        type="submit"
                        disabled={isSending || !newMessage.trim()}
                        style={{
                          width: 44, height: 44, flexShrink: 0,
                          borderRadius: 12, border: 'none',
                          background: isSending || !newMessage.trim() ? 'rgba(212,166,60,0.3)' : '#d4a63c',
                          color: '#000', cursor: isSending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.2s',
                        }}
                      >
                        {isSending ? (
                          <span style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: ar ? 'scaleX(-1)' : 'none' }}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ QUOTES TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'quotes' && (
            <div style={card}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#d4a63c' }}>💵</span>
                {ar ? 'عروض الأسعار ورسوم الخدمة' : 'Service Pricing & Quotes'}
              </h2>

              {['submitted', 'open'].includes(request.current_status) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a63c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.05rem' }}>{ar ? 'جاري إعداد العروض' : 'Preparing Quotes'}</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 340, marginInline: 'auto' }}>
                    {ar ? 'بعد مراجعة المتطلبات، ستظهر هنا عروض الأسعار وتفاصيل الخدمة.' : 'After reviewing your requirements, service pricing and supplier quotes will appear here.'}
                  </p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#22c55e', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '4px 12px', borderBottomLeftRadius: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ar ? 'عرض نشط' : 'Active Offer'}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.05rem' }}>{ar ? 'خدمة البحث عن الموردين' : 'Supplier Sourcing Service'}</h3>
                  <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {ar ? 'بحث وتفاوض مع الموردين وجمع 3–5 عروض أسعار موثقة.' : 'Research, negotiation, and collection of 3–5 verified supplier quotes.'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#d4a63c' }}>{ar ? 'مجاناً' : 'Free'}</span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>{ar ? '٥٠٠ ج.م' : '500 EGP'}</span>
                  </div>
                  <button disabled style={{ ...btnGhost, opacity: 0.6, cursor: 'not-allowed' }}>
                    {ar ? 'تم قبول العرض تلقائياً' : 'Promo auto-applied'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ REPORT TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'report' && (
            <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              {!isReleased && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, backdropFilter: 'blur(12px)', background: 'rgba(2,6,23,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{ar ? 'التقرير مقفل حالياً' : 'Report Not Yet Ready'}</h3>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 360, marginInline: 'auto' }}>
                      {ar ? 'سيُفتح هذا القسم تلقائياً بمجرد انتهاء خبير المشتريات من إعداد التقرير النهائي.' : 'This section unlocks automatically once your sourcing analyst finalises the comparative report.'}
                    </p>
                  </div>
                </div>
              )}

              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#d4a63c' }}>📄</span>
                {ar ? 'تقرير الموردين النهائي' : 'Final Sourcing Report'}
              </h2>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                      {request.snapshot_count || 3} {ar ? 'موردين معتمدين' : 'Verified Suppliers'}
                    </h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                      ✓ {ar ? 'توفير متوقع 15%' : 'Est. 15% savings'}
                    </span>
                  </div>
                  <div style={{ textAlign: ar ? 'left' : 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{ar ? 'رسوم فك القفل' : 'Unlock Fee'}</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                      <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginInlineEnd: 4 }}>EGP</span>
                      {request.service_fee_amount || '1,000'}
                    </p>
                  </div>
                </div>

                {/* Blurred supplier previews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', filter: 'blur(4px)', opacity: 0.4, userSelect: 'none', pointerEvents: 'none' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 6, width: '35%' }} />
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, width: '55%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link href={`/${locale}/reports/${request.request_id}`} style={{ display: 'block' }}>
                <button style={{ width: '100%', padding: '1rem', borderRadius: 14, background: '#fff', color: '#000', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 0 30px rgba(255,255,255,0.12)', transition: 'transform 0.2s' }}>
                  {ar ? 'الدفع وعرض تفاصيل الموردين كاملاً' : 'Pay & Unlock Full Supplier Report'}
                </button>
              </Link>
            </div>
          )}

          {/* ══ Q&A COMMUNITY TAB ═════════════════════════════════════════ */}
          {activeTab === 'qa' && (
            <div style={card}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#d4a63c' }}>❓</span>
                {ar ? 'اسأل مشترين سابقين لهذا المنتج' : 'Ask Previous Buyers of this Product'}
              </h2>

              {/* Ask Question Form */}
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!newQuestion.trim() || qaLoading) return
                setQaLoading(true)
                try {
                  const { createClient } = await import('@/lib/supabase/client')
                  const supabase = createClient() as any
                  const { error } = await supabase.from('buyer_qa').insert({
                    product_name: request.title,
                    question: newQuestion,
                    asker_id: customerId,
                    status: 'pending'
                  })
                  if (!error) {
                    setQaSuccess(true)
                    setNewQuestion('')
                    setTimeout(() => setQaSuccess(false), 3000)
                  }
                } finally { setQaLoading(false) }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {qaSuccess && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, color: '#4ade80', fontSize: '0.85rem' }}>
                    {ar ? '✓ تم إرسال سؤالك بنجاح! سيتم عرضه هنا فور إجابة مشترٍ سابق عليه.' : '✓ Question submitted! It will appear here once answered by a previous buyer.'}
                  </div>
                )}
                <div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder={ar ? 'اسأل المشترين السابقين عن رأيهم وتجربتهم الواقعية مع هذا المنتج...' : 'Ask previous buyers about their real experience with this product...'}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={qaLoading} style={btnPrimary}>
                    {qaLoading ? '...' : (ar ? 'اطرح السؤال مجهول الهوية' : 'Ask Anonymously')}
                  </button>
                </div>
              </form>

              {/* QA List */}
              {qaList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    {ar ? 'لا توجد أسئلة مجابة بعد لهذا المنتج. كن أول من يسأل!' : 'No answered questions yet for this product. Be the first to ask!'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {qaList.map((qa: any) => (
                    <div key={qa.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#d4a63c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                          {ar ? 'سؤال مجهول' : 'Anonymous Question'}
                        </span>
                        <p style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                          {qa.question}
                        </p>
                      </div>
                      <div style={{ paddingInlineStart: '1rem', borderInlineStart: '2px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                          {ar ? 'إجابة مشتري سابق 🛡️' : 'Answer from Previous Buyer 🛡️'}
                        </span>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                          {qa.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modification Modal ───────────────────────────────────────────────── */}
      {showModModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>{ar ? 'طلب تعديل المواصفات' : 'Request Spec Update'}</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.6 }}>
              {ar ? 'طلبك قيد البحث النشط. أي تعديل جوهري يتطلب موافقة المراجع المختص.' : 'Your request is in active sourcing. Significant changes require reviewer approval to avoid conflicts.'}
            </p>
            <form onSubmit={handleMod} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modSuccess ? (
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, color: '#4ade80', textAlign: 'center', fontWeight: 600 }}>
                  ✓ {ar ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully'}
                </div>
              ) : (
                <>
                  <textarea
                    style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
                    value={modText}
                    onChange={e => setModText(e.target.value)}
                    placeholder={ar ? 'اكتب التعديل أو المواصفة الجديدة...' : 'Describe the changes or new requirements...'}
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowModModal(false)} style={btnGhost}>{ar ? 'إلغاء' : 'Cancel'}</button>
                    <button type="submit" disabled={modLoading} style={btnPrimary}>{modLoading ? '...' : (ar ? 'إرسال للمراجع' : 'Send to Reviewer')}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>{ar ? 'رفع شكوى / نزاع حماية المشتري' : 'Buyer Protection Dispute'}</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.6 }}>
              {ar ? 'إذا واجهت أي مشكلة مع المورد، فريق فايندورا سيتدخل لحل الخلاف وضمان حقوقك بالكامل.' : 'If you face any issue, Findora team will mediate to resolve it and protect your purchase.'}
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setDisputeLoading(true)
              setDisputeSuccess(false)
              let finalVendorId = selectedVendorId
              if (!finalVendorId) {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient() as any
                const { data } = await supabase.from('vendor_bids').select('vendor_id').eq('request_id', request.request_id).limit(1).maybeSingle()
                if (data) finalVendorId = data.vendor_id
              }
              if (!finalVendorId) {
                alert(ar ? 'لم يتم تحديد مورد بعد لرفع الشكوى ضده.' : 'No vendor identified for this request yet.')
                setDisputeLoading(false)
                return
              }
              const res = await submitDisputeAction(request.request_id, customerId, finalVendorId, disputeReason, disputeDetails)
              setDisputeLoading(false)
              if (res.success) {
                setDisputeSuccess(true)
                setDisputeDetails('')
                setTimeout(() => { setShowDisputeModal(false); setDisputeSuccess(false) }, 2000)
              } else {
                alert(res.error || 'Failed to submit dispute')
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disputeSuccess ? (
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, color: '#4ade80', textAlign: 'center', fontWeight: 600 }}>
                  ✓ {ar ? 'تم تسجيل الشكوى بنجاح وجاري المراجعة' : 'Dispute filed successfully'}
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'سبب الشكوى' : 'Dispute Reason'}</label>
                    <select
                      value={disputeReason}
                      onChange={e => setDisputeReason(e.target.value as any)}
                      style={inputStyle}
                    >
                      <option value="price_discrepancy">{ar ? 'خلاف في السعر' : 'Price Discrepancy'}</option>
                      <option value="item_mismatch">{ar ? 'اختلاف في المواصفات' : 'Item Mismatch'}</option>
                      <option value="execution_issue">{ar ? 'مشكلة في التنفيذ / الموعد' : 'Execution/Delivery Issue'}</option>
                      <option value="other">{ar ? 'أخرى' : 'Other'}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'تفاصيل الشكوى' : 'Dispute Details'}</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
                      value={disputeDetails}
                      onChange={e => setDisputeDetails(e.target.value)}
                      placeholder={ar ? 'اشرح بالتفصيل المشكلة أو الخلاف...' : 'Explain the issue or discrepancy in detail...'}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowDisputeModal(false)} style={btnGhost}>{ar ? 'إلغاء' : 'Cancel'}</button>
                    <button type="submit" disabled={disputeLoading} style={btnPrimary}>{disputeLoading ? '...' : (ar ? 'رفع الشكوى' : 'Submit Dispute')}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Price Guarantee Modal */}
      {showGuaranteeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>{ar ? 'بلاغ ضمان أقل سعر' : 'Price Guarantee Claim'}</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.6 }}>
              {ar ? 'إذا وجدت نفس السلعة بسعر أقل في مكان آخر، أرسل لنا وسنعوضك بنقاط VIP مكافأة!' : 'If you find the same item at a lower price elsewhere, send us proof and earn VIP points!'}
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setGuaranteeLoading(true)
              setGuaranteeSuccess(false)
              const res = await submitPriceGuaranteeAction(request.request_id, customerId, request.title, lowerPrice, proofDetails)
              setGuaranteeLoading(false)
              if (res.success) {
                setGuaranteeSuccess(true)
                setProofDetails('')
                setLowerPrice(0)
                setTimeout(() => { setShowGuaranteeModal(false); setGuaranteeSuccess(false) }, 2000)
              } else {
                alert(res.error || 'Failed to submit guarantee claim')
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {guaranteeSuccess ? (
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, color: '#4ade80', textAlign: 'center', fontWeight: 600 }}>
                  ✓ {ar ? 'تم تسجيل البلاغ بنجاح وجاري التحقق' : 'Guarantee claim filed successfully'}
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'السعر الأقل الذي وجدته (EGP)' : 'Lower Price Found (EGP)'}</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={lowerPrice || ''}
                      onChange={e => setLowerPrice(parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{ar ? 'رابط المنتج أو تفاصيل الدليل' : 'Product URL or Proof Details'}</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                      value={proofDetails}
                      onChange={e => setProofDetails(e.target.value)}
                      placeholder={ar ? 'ضع رابط المتجر أو تفاصيل العرض البديل...' : 'Provide the store link or details of the alternative quote...'}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowGuaranteeModal(false)} style={btnGhost}>{ar ? 'إلغاء' : 'Cancel'}</button>
                    <button type="submit" disabled={guaranteeLoading} style={btnPrimary}>{guaranteeLoading ? '...' : (ar ? 'تقديم البلاغ' : 'Submit Claim')}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Responsive & Keyframe animations */}
      <style>{`
        .request-details-grid {
          display: grid !important;
          grid-template-columns: 220px 1fr !important;
          gap: 1.5rem !important;
          align-items: start !important;
        }
        .request-details-sidebar {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.4rem !important;
          width: 100% !important;
        }
        @media (max-width: 768px) {
          .request-details-grid {
            grid-template-columns: 1fr !important;
          }
          .request-details-sidebar {
            flex-direction: row !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding-bottom: 0.5rem !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 0.5rem !important;
          }
          .request-details-sidebar button {
            width: auto !important;
            flex-shrink: 0 !important;
            padding: 0.6rem 1rem !important;
            justify-content: center !important;
          }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
