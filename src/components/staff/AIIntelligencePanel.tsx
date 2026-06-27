'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  handleGetRequestIntelligence,
  handleTriggerAiAnalysis,
  handleGenerateResearchQueries,
  handleExecuteResearchQueries,
  handleSaveResearchCandidate,
} from '@/app/[locale]/staff/workspace/[request_id]/ai-actions'

interface Props {
  requestId: string
  locale: string
  dict: any
  isRTL: boolean
  requestData?: any
  preferences?: any
}

type TabType = 'analysis' | 'strategy' | 'results'

// ── Tooltip component ──────────────────────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        fontSize: '10px', fontWeight: 800, color: 'rgba(148,163,184,1)',
      }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px', padding: '0.625rem 0.875rem', fontSize: '11.5px',
          color: 'rgba(203,213,225,1)', whiteSpace: 'normal', minWidth: '220px', maxWidth: '280px',
          zIndex: 9999, lineHeight: 1.55, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AIIntelligencePanel({ requestId, locale, dict, isRTL, requestData: propsRequest, preferences: propsPrefs }: Props) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('analysis')

  // Intelligence data (loaded from server)
  const [intel, setIntel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

  // Search strategy
  const [stratLoading, setStratLoading] = useState(false)
  const [stratError, setStratError] = useState<string | null>(null)
  const [queries, setQueries] = useState<any[]>([])
  const [provider, setProvider] = useState('google_custom_search')

  // Search params editable state (the actual AI inputs)
  const [editBrand, setEditBrand] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editBudgetMin, setEditBudgetMin] = useState('')
  const [editBudgetMax, setEditBudgetMax] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Results
  const [execLoading, setExecLoading] = useState(false)
  const [execError, setExecError] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => { setMounted(true) }, [])

  // ── Load intelligence ──────────────────────────────────────────────────────
  const loadIntel = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await handleGetRequestIntelligence(requestId)
      if (res.success && res.data) {
        setIntel(res.data)
      } else {
        setError(res.error || 'Failed to load')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { loadIntel() }, [loadIntel])

  // ── Populate editable fields once intel loads ──────────────────────────────
  useEffect(() => {
    if (!intel) return
    const pref = intel.preferences || propsPrefs
    const intakeData = intel.interpretedDetails

    // Try to extract product details from the saved IntakeAnalysis JSON
    const product = intakeData?.ai_analysis?.product
    const brand = product?.brand || intakeData?.product?.brand || ''
    const name = product?.name || intakeData?.product?.name || ''
    const cat = product?.category || intakeData?.product?.category || intel.sourcingAnalysis?.en?.category || ''

    setEditBrand(brand)
    setEditProduct(name)
    setEditCategory(cat)
    setEditBudgetMin(pref?.budget_min != null ? String(pref.budget_min) : '')
    setEditBudgetMax(pref?.budget_max != null ? String(pref.budget_max) : '')
    setEditNotes(product?.key_attributes?.join(', ') || '')
  }, [intel, propsPrefs])

  // ── Re-run analysis ────────────────────────────────────────────────────────
  const rerunAnalysis = async () => {
    setRerunning(true)
    try {
      await handleTriggerAiAnalysis(requestId, true)
      await loadIntel()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRerunning(false)
    }
  }

  // ── Generate queries ───────────────────────────────────────────────────────
  const generateQueries = async () => {
    setStratLoading(true)
    setStratError(null)
    try {
      const res = await handleGenerateResearchQueries({ request_id: requestId })
      if (res.error) setStratError(res.error)
      else if (res.data?.queries) setQueries(res.data.queries)
    } catch (e: any) {
      setStratError(e.message)
    } finally {
      setStratLoading(false)
    }
  }

  // ── Execute search ─────────────────────────────────────────────────────────
  const executeSearch = async () => {
    setExecLoading(true)
    setExecError(null)
    setActiveTab('results')
    try {
      // Build queries from the editable inputs if we don't have AI-generated ones
      let finalQueries = queries.filter(q => q.query.trim())
      if (finalQueries.length === 0) {
        // Build from editable fields
        const budgetPart = editBudgetMax ? ` budget ${editBudgetMax} EGP` : ''
        if (editBrand && editProduct) {
          finalQueries = [
            { query: `${editBrand} ${editProduct}${budgetPart}`, language: 'en', purpose: 'Brand + Product search', priority: 1 },
            { query: `buy ${editBrand} ${editProduct} online Egypt`, language: 'en', purpose: 'Purchase intent', priority: 2 },
            { query: `${editBrand} ${editProduct} price`, language: 'en', purpose: 'Price comparison', priority: 3 },
          ]
        } else {
          finalQueries = [
            { query: `${editCategory || editProduct || editBrand}${budgetPart}`, language: 'en', purpose: 'General search', priority: 1 }
          ]
        }
      }

      const res: any = await handleExecuteResearchQueries({
        request_id: requestId,
        queries: finalQueries,
        provider,
      })
      if (res.error) setExecError(res.error)
      else setResults(res)
    } catch (e: any) {
      setExecError(e.message)
    } finally {
      setExecLoading(false)
    }
  }

  const saveCandidate = async (c: any) => {
    try {
      const res = await handleSaveResearchCandidate({ request_id: requestId, candidate: c })
      if (res.success) setSavedIds(prev => [...prev, c.url])
    } catch (e: any) {
      alert('Save failed: ' + e.message)
    }
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const pref = intel?.preferences || propsPrefs
  const req = intel?.request || propsRequest
  const intakeData = intel?.interpretedDetails
  const sourcing = intel?.sourcingAnalysis

  const product = intakeData?.ai_analysis?.product || intakeData?.product
  const productBrand = product?.brand || null
  const productName = product?.name || null
  const productCategory = product?.category || sourcing?.en?.category || null
  const productAttrs: string[] = product?.key_attributes || []
  const intakeSummaryEN = intakeData?.ai_analysis?.summary_en || intakeData?.summary_en || req?.intake_summary || null
  const intakeSummaryAR = intakeData?.ai_analysis?.summary_ar || intakeData?.summary_ar || null

  const budgetMin = pref?.budget_min
  const budgetMax = pref?.budget_max
  const budgetStr =
    budgetMin != null && budgetMax != null ? `${Number(budgetMin).toLocaleString()} – ${Number(budgetMax).toLocaleString()} EGP`
    : budgetMax != null ? `Up to ${Number(budgetMax).toLocaleString()} EGP`
    : budgetMin != null ? `From ${Number(budgetMin).toLocaleString()} EGP`
    : null

  const priority = sourcing?.en?.priority || 'NORMAL'
  const flow = sourcing?.en?.recommended_flow || 'online_and_offline'
  const priorityColor: Record<string, string> = {
    URGENT: '#ef4444', HIGH: '#f59e0b', NORMAL: '#60a5fa',
  }
  const flowLabels: Record<string, string> = {
    online_only: '🌐 Online Only',
    offline_only: '🏪 Field/Offline Only',
    online_and_offline: '⚡ Hybrid (Online + Field)',
  }

  // Tab descriptions for tooltips
  const tabTooltips: Record<TabType, string> = {
    analysis: 'Shows the AI\'s complete understanding of the request: product type, brand, budget, priority, and what type of sourcing approach to use (online/offline/hybrid).',
    strategy: 'Lets you review and edit the exact data the AI will use to search online. You can modify brand, model, budget range, and specific search queries before starting the search.',
    results: 'Shows the live search results returned by the AI agent — product listings, links, relevance scores, and risks. You can save candidates as drafts.',
  }

  // ── Tab style helper ───────────────────────────────────────────────────────
  const tabStyle = (t: TabType): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: activeTab === t ? '#d4a63c' : 'transparent',
    color: activeTab === t ? '#000' : 'rgba(148,163,184,1)',
  })

  if (!mounted) return null

  return (
    <div style={{
      width: '100%',
      background: 'rgba(10, 16, 30, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.09)',
      overflow: 'visible',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, transparent 60%)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            padding: '0.625rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(79,70,229,0.2))',
            border: '1px solid rgba(99,102,241,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>AI Sourcing Intelligence</span>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: 'rgba(99,102,241,0.25)', color: 'rgba(167,139,250,1)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>COPILOT LIVE</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'rgba(100,116,139,1)', marginTop: '2px', fontWeight: 500 }}>
              {isRTL ? 'تحليل المتطلبات، بناء الاستراتيجية، وتنفيذ البحث الأوتوماتيكي' : 'Structured machine-learning assessment of customer requirements and strategic execution'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', gap: '2px' }}>
          {(['analysis', 'strategy', 'results'] as TabType[]).map(t => (
            <div key={t} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                suppressHydrationWarning
                onClick={() => { setActiveTab(t); if (t === 'strategy' && queries.length === 0) generateQueries() }}
                style={tabStyle(t)}
              >
                {t === 'analysis' ? (isRTL ? 'التحليل' : 'Analysis')
                 : t === 'strategy' ? (isRTL ? 'استراتيجية البحث' : 'Search Strategy')
                 : (isRTL ? 'النتائج' : 'Results')}
              </button>
              <Tooltip text={tabTooltips[t]} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '1.5rem' }}>

        {/* Loading / Error states */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(100,116,139,1)', fontSize: '0.85rem' }}>
            Loading intelligence data...
          </div>
        )}
        {error && (
          <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: 'rgba(248,113,113,1)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem' }}>
            ⚠ {error}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 1 ─ ANALYSIS
            ════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'analysis' && (
          <div>
            {/* Re-run button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <button suppressHydrationWarning onClick={rerunAnalysis} disabled={rerunning} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '0.4rem 0.875rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(203,213,225,1)', cursor: rerunning ? 'not-allowed' : 'pointer', opacity: rerunning ? 0.5 : 1,
              }}>
                <span style={{ display: 'inline-block', animation: rerunning ? 'spin 0.8s linear infinite' : 'none' }}>⟳</span>
                {rerunning ? ' Running...' : ' Re-run Analysis'}
              </button>
            </div>

            {/* ── PRODUCT DETAILS CARD (from Intake AI) ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(79,70,229,0.06) 100%)',
              border: '1px solid rgba(99,102,241,0.28)',
              borderRadius: '18px', padding: '1.25rem', marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(165,180,252,1)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  📦 Product Details — Intake AI Analysis
                </span>
                <Tooltip text="This data was extracted by the AI when it first analyzed the customer's request during the Intake phase. It identifies the exact product type, brand, and specifications." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: isRTL ? 'الماركة / البراند' : 'Brand', value: productBrand || '—', highlight: !!productBrand, tip: 'The brand name detected from the customer request (e.g. Dior, Chanel, local brand)' },
                  { label: isRTL ? 'نوع / موديل المنتج' : 'Product Type / Model', value: productName || '—', highlight: !!productName, tip: 'The specific product name or model identified by the AI' },
                  { label: isRTL ? 'الفئة' : 'Category', value: productCategory || '—', highlight: !!productCategory, tip: 'The product category (e.g. Perfume, Electronics, Apparel)' },
                  { label: isRTL ? 'ميزانية العميل الحقيقية' : 'Customer Budget', value: budgetStr || '—', highlight: !!budgetStr, accent: true, tip: 'The actual budget entered by the customer — NOT the service fee. This is the product budget.' },
                ].map(({ label, value, highlight, accent, tip }) => (
                  <div key={label} style={{
                    background: accent && highlight ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)',
                    border: accent && highlight ? '1px solid rgba(52,211,153,0.25)' : highlight ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', padding: '0.875rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                      <Tooltip text={tip} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: accent ? 'rgba(52,211,153,1)' : highlight ? 'white' : 'rgba(100,116,139,1)' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Key attributes */}
              {productAttrs.length > 0 && (
                <div style={{ marginTop: '0.875rem' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    {isRTL ? 'المواصفات والسمات الرئيسية' : 'Key Attributes / Specifications'}
                    <Tooltip text="Specific features or requirements the customer mentioned about the product" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {productAttrs.map((attr: string, i: number) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 12px', background: 'rgba(99,102,241,0.15)', color: 'rgba(165,180,252,1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '100px', fontWeight: 600 }}>
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning if no product data */}
              {!productBrand && !productName && !productCategory && (
                <div style={{ marginTop: '0.875rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', fontSize: '0.75rem', color: 'rgba(252,211,77,1)', lineHeight: 1.5 }}>
                  ⚠ Product details (Brand/Type) are not saved yet. Run the <strong>Intake AI</strong> analysis first from the AI Staff Copilot → Intake tab, then the details will appear here automatically.
                </div>
              )}
            </div>

            {/* ── SOURCING ANALYSIS METRICS ── */}
            {sourcing ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    {
                      label: 'Priority', value: priority,
                      chip: true, color: priorityColor[priority] || '#60a5fa',
                      tip: 'AI-assessed urgency level based on the request content and customer signals',
                    },
                    {
                      label: 'Category', value: productCategory || sourcing.en?.category || '—',
                      tip: 'Product category detected by the AI for routing to the right sourcing channel',
                    },
                    {
                      label: 'Budget Range', value: budgetStr || sourcing.en?.budget_range || '—',
                      tip: 'The customer\'s product budget. This is NOT the service fee.',
                    },
                    {
                      label: 'Routing Flow', value: flowLabels[flow] || flow,
                      tip: 'Whether this request should be sourced online, offline (field visits), or both',
                    },
                  ].map(({ label, value, chip, color, tip }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                        {tip && <Tooltip text={tip} />}
                      </div>
                      {chip ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '8px', background: `${color}20`, color, border: `1px solid ${color}40` }}>{value}</span>
                      ) : (
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white' }}>{value}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* English + Arabic summaries */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { label: 'English Sourcing Intelligence', text: sourcing.en?.summary, dir: 'ltr' },
                    { label: 'تحليل متطلبات التوريد باللغة العربية', text: sourcing.ar?.summary, dir: 'rtl' },
                  ].filter(x => x.text).map(({ label, text, dir }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.25rem' }} dir={dir as any}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(148,163,184,1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>{label}</div>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(203,213,225,0.9)', lineHeight: 1.7, margin: 0 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : !loading && !error && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(100,116,139,1)', fontSize: '0.82rem' }}>
                {isRTL ? 'لا يوجد تحليل محفوظ بعد. اضغط "Re-run Analysis".' : 'No sourcing analysis saved yet. Click "Re-run Analysis" to generate one.'}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 2 ─ SEARCH STRATEGY
            ════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'strategy' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

              {/* ── SECTION A: Customer's Request (Read-only) ── */}
              <div style={{
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.22)',
                borderRadius: '18px', padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                  <span style={{ fontSize: '13px' }}>👤</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(147,197,253,1)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isRTL ? 'طلبات العميل' : 'Customer Request'}
                  </span>
                  <Tooltip text="This is what the customer originally requested. Read-only — this is the source data extracted from the intake form and AI analysis." />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: isRTL ? 'الماركة المطلوبة' : 'Requested Brand', value: productBrand || req?.title || '—', tip: 'The brand the customer specifically mentioned' },
                    { label: isRTL ? 'نوع / موديل المنتج' : 'Product Type / Model', value: productName || '—', tip: 'The specific product type or model' },
                    { label: isRTL ? 'الفئة' : 'Category', value: productCategory || '—', tip: 'Product category' },
                    { label: isRTL ? 'ميزانية العميل' : 'Customer Budget', value: budgetStr || 'Not specified', accent: !!budgetStr, tip: 'The actual product budget — not the service fee' },
                  ].map(({ label, value, accent, tip }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                        <Tooltip text={tip} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: accent ? 'rgba(52,211,153,1)' : 'rgba(203,213,225,1)' }}>{value}</span>
                    </div>
                  ))}

                  {productAttrs.length > 0 && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                        {isRTL ? 'المواصفات المطلوبة' : 'Requested Specs'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {productAttrs.map((a: string, i: number) => (
                          <span key={i} style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(59,130,246,0.15)', color: 'rgba(147,197,253,1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '100px', fontWeight: 600 }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer's original description */}
                  {req?.raw_description && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'rgba(100,116,139,1)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{isRTL ? 'وصف الطلب الأصلي' : 'Original Description'}</div>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.8)', lineHeight: 1.55, margin: 0 }}>{req.raw_description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION B: AI Search Parameters (Editable) ── */}
              <div style={{
                background: 'rgba(212,166,60,0.06)',
                border: '1px solid rgba(212,166,60,0.22)',
                borderRadius: '18px', padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(212,166,60,0.15)' }}>
                  <span style={{ fontSize: '13px' }}>🤖</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(212,166,60,1)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isRTL ? 'بيانات الـ AI Agent (قابلة للتعديل)' : 'AI Agent Search Parameters (Editable)'}
                  </span>
                  <Tooltip text="These are the exact parameters the AI agent will use to search online. Edit them to refine the search — add a specific brand, adjust the budget, or add model details." />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: isRTL ? 'الماركة للبحث' : 'Brand to Search', val: editBrand, set: setEditBrand, tip: 'The brand name the AI will search for. Be specific (e.g. "Dior Sauvage" not just "Dior")' },
                    { label: isRTL ? 'نوع المنتج / الموديل' : 'Product Type / Model', val: editProduct, set: setEditProduct, tip: 'Specific product type or model. The more precise, the better the results.' },
                    { label: isRTL ? 'الفئة' : 'Category', val: editCategory, set: setEditCategory, tip: 'Product category (e.g. Perfume, Laptop, Watch). Helps the AI focus the search.' },
                  ].map(({ label, val, set, tip }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(212,166,60,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
                        <Tooltip text={tip} />
                      </div>
                      <input
                        type="text"
                        value={val}
                        onChange={e => set(e.target.value)}
                        placeholder={isRTL ? 'اكتب هنا...' : 'Type here...'}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(212,166,60,0.2)',
                          borderRadius: '10px', padding: '0.5rem 0.75rem',
                          color: 'white', fontSize: '0.85rem', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { label: isRTL ? 'الميزانية الدنيا' : 'Budget Min (EGP)', val: editBudgetMin, set: setEditBudgetMin, tip: 'Minimum product budget. Leave empty if no minimum.' },
                      { label: isRTL ? 'الميزانية القصوى' : 'Budget Max (EGP)', val: editBudgetMax, set: setEditBudgetMax, tip: 'Maximum product budget the customer is willing to pay.' },
                    ].map(({ label, val, set, tip }) => (
                      <div key={label}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '10px', color: 'rgba(212,166,60,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
                          <Tooltip text={tip} />
                        </div>
                        <input
                          type="number"
                          value={val}
                          onChange={e => set(e.target.value)}
                          placeholder="0"
                          style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(212,166,60,0.2)',
                            borderRadius: '10px', padding: '0.5rem 0.75rem',
                            color: 'white', fontSize: '0.85rem', outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'rgba(212,166,60,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {isRTL ? 'ملاحظات إضافية / مواصفات خاصة' : 'Additional Notes / Specific Specs'}
                      </label>
                      <Tooltip text="Any extra details you want the AI to consider — specific size, color, material, or where to source from." />
                    </div>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder={isRTL ? 'مثال: حجم 100ml، برائحة Oud...' : 'e.g. 100ml size, Oud scent, original packaging...'}
                      rows={2}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(212,166,60,0.2)',
                        borderRadius: '10px', padding: '0.5rem 0.75rem',
                        color: 'white', fontSize: '0.82rem', outline: 'none',
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── AI QUERIES SECTION ── */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(203,213,225,1)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    🔍 {isRTL ? 'جمل البحث المخصصة' : 'Custom Search Queries'}
                  </span>
                  <Tooltip text="The specific search phrases the AI will type into search engines. Edit these for more precise results." />
                </div>
                <button suppressHydrationWarning onClick={generateQueries} disabled={stratLoading} style={{
                  padding: '0.4rem 0.875rem', background: 'rgba(99,102,241,0.15)',
                  color: 'rgba(165,180,252,1)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  opacity: stratLoading ? 0.5 : 1,
                }}>
                  {stratLoading ? '⟳ Generating...' : (isRTL ? '✦ توليد بالـ AI' : '✦ Generate via AI')}
                </button>
              </div>

              {stratError && (
                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: 'rgba(248,113,113,1)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                  ⚠ {stratError}
                </div>
              )}

              {queries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {queries.map((q, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(100,116,139,1)', minWidth: '20px', textAlign: 'center' }}>#{i+1}</span>
                      <input
                        type="text"
                        value={q.query}
                        onChange={e => {
                          const updated = [...queries]
                          updated[i] = { ...updated[i], query: e.target.value }
                          setQueries(updated)
                        }}
                        style={{
                          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.83rem', outline: 'none',
                        }}
                      />
                      <button suppressHydrationWarning onClick={() => setQueries(queries.filter((_, j) => j !== i))} style={{
                        padding: '0.4rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: 'rgba(248,113,113,1)',
                        border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                      }}>✕</button>
                    </div>
                  ))}
                  <button suppressHydrationWarning onClick={() => setQueries([...queries, { query: '', language: 'en', purpose: 'Custom', priority: 1 }])} style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'rgba(99,102,241,0.8)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', textAlign: 'left',
                  }}>+ {isRTL ? 'إضافة يدوية' : 'Add manually'}</button>
                </div>
              ) : !stratLoading ? (
                <p style={{ fontSize: '0.78rem', color: 'rgba(100,116,139,1)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                  {isRTL ? 'اضغط "توليد بالـ AI" لإنشاء جمل بحث مخصصة، أو سيتم البناء تلقائياً من التفاصيل أعلاه.' : 'Click "Generate via AI" for smart queries, or the system will auto-build from the fields above.'}
                </p>
              ) : null}
            </div>

            {/* ── EXECUTE BAR ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(100,116,139,1)', textTransform: 'uppercase' }}>
                    {isRTL ? 'محرك البحث' : 'Search Engine'}
                  </label>
                  <Tooltip text="Choose which search provider the AI will use to find products online. Google CSE is the most comprehensive; Tavily is optimized for AI research; Brave Search is privacy-focused." />
                </div>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={{
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white', fontSize: '0.75rem', borderRadius: '8px', padding: '0.375rem 0.625rem', outline: 'none',
                }}>
                  <option value="google_custom_search" style={{ color: '#000' }}>Google CSE</option>
                  <option value="tavily" style={{ color: '#000' }}>Tavily AI Search</option>
                  <option value="brave_search" style={{ color: '#000' }}>Brave Search</option>
                </select>
              </div>

              <button suppressHydrationWarning onClick={executeSearch} disabled={execLoading} style={{
                padding: '0.75rem 2.25rem', background: '#d4a63c', color: '#000',
                fontWeight: 900, borderRadius: '14px', border: 'none',
                cursor: execLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                opacity: execLoading ? 0.6 : 1, transition: 'all 0.2s ease',
                boxShadow: '0 4px 20px rgba(212,166,60,0.4)',
              }}>
                {execLoading ? '⟳ Searching...' : (isRTL ? '🚀 تنفيذ البحث' : '🚀 Execute Search')}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 3 ─ RESULTS
            ════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'results' && (
          <div>
            {execLoading && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ width: '44px', height: '44px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #d4a63c', borderRadius: '50%', margin: '0 auto 1.25rem', animation: 'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: '#d4a63c', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                  {isRTL ? 'الـ AI يبحث ويحلل العروض المتاحة في السوق الرقمي...' : 'AI agent is scanning online sources, ranking offers, and assessing relevance...'}
                </p>
              </div>
            )}

            {execError && (
              <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', color: 'rgba(248,113,113,1)', fontSize: '0.8rem', fontWeight: 700 }}>
                ⚠ Search Error: {execError}
              </div>
            )}

            {!execLoading && !results && !execError && (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: 'rgba(100,116,139,1)', fontSize: '0.875rem' }}>
                {isRTL ? 'لم يتم تنفيذ بحث بعد. اذهب إلى تاب "استراتيجية البحث" واضغط تنفيذ البحث.' : 'No search executed yet. Go to "Search Strategy" tab and click Execute Search.'}
              </div>
            )}

            {results && !execLoading && (
              <div>
                {results.summary && (
                  <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '14px', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(167,139,250,1)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      {isRTL ? 'ملخص نتائج البحث' : 'Search Results Summary'}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(203,213,225,1)', margin: 0, lineHeight: 1.65 }}>{results.summary}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {results.candidates?.map((c: any, idx: number) => {
                    const saved = savedIds.includes(c.url)
                    return (
                      <div key={idx} style={{
                        padding: '1rem', borderRadius: '16px',
                        display: 'flex', flexDirection: 'column', gap: '0.75rem',
                        background: saved ? 'rgba(212,166,60,0.07)' : 'rgba(255,255,255,0.03)',
                        border: saved ? '1px solid rgba(212,166,60,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.8)', borderRadius: '6px', fontWeight: 600 }}>{c.provider}</span>
                          <span style={{ fontSize: '12px', fontWeight: 900, color: c.source_confidence > 70 ? 'rgba(52,211,153,1)' : 'rgba(251,191,36,1)' }}>{c.source_confidence}% Match</span>
                        </div>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', textDecoration: 'none', lineHeight: 1.4 }}>{c.title}</a>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.8)', margin: 0, lineHeight: 1.55, flex: 1 }}>{c.why_relevant}</p>
                        {c.risks?.length > 0 && (
                          <div style={{ fontSize: '10px', color: 'rgba(248,113,113,0.9)', background: 'rgba(239,68,68,0.08)', padding: '0.375rem 0.625rem', borderRadius: '8px' }}>
                            ⚠ {c.risks[0]}
                          </div>
                        )}
                        <button suppressHydrationWarning onClick={() => saveCandidate(c)} disabled={saved} style={{
                          width: '100%', padding: '0.5rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                          background: saved ? 'rgba(212,166,60,0.2)' : 'rgba(255,255,255,0.06)',
                          color: saved ? '#d4a63c' : 'rgba(203,213,225,1)',
                          border: saved ? '1px solid rgba(212,166,60,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          cursor: saved ? 'default' : 'pointer',
                        }}>
                          {saved ? (isRTL ? '✓ تم الحفظ' : '✓ Saved as Draft') : (isRTL ? '💾 حفظ كمرشح' : '💾 Save Candidate')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
