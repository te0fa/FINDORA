// src/components/staff/AICopilotPanel.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import * as Actions from '@/app/[locale]/staff/workspace/[request_id]/ai-actions'
import { handleReviewerDecision } from '@/app/[locale]/staff/workspace/[request_id]/actions'
import { createPortal } from 'react-dom'

interface AICopilotPanelProps {
  requestId: string
  requestData: any
  preferences: any
  snapshots: any[]
  dict: any
  isRTL: boolean
  actionPermissions?: any
  isAdmin?: boolean
  canReviewIntake?: boolean
  canResearch?: boolean
  canReport?: boolean
}

type Tab = 'intake' | 'pricing' | 'research' | 'report' | 'message' | 'safety'

export function AICopilotPanel({
  requestId,
  requestData,
  preferences,
  snapshots,
  dict,
  isRTL,
  actionPermissions,
  isAdmin,
  canReviewIntake,
  canResearch,
  canReport
}: AICopilotPanelProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isAdminUser = isAdmin || false
  const hasReviewerRole = canReviewIntake || (actionPermissions && actionPermissions.canReviewIntake) || false
  
  // Set default tab based on role priority: intake > research > report
  let defaultTab: Tab = 'intake'
  if (!isAdminUser) {
    if (hasReviewerRole) {
      defaultTab = 'intake'
    } else if (canResearch) {
      defaultTab = 'research'
    } else if (canReport) {
      defaultTab = 'report'
    } else {
      defaultTab = 'safety' // fallback
    }
  }
  
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [staffNote, setStaffNote] = useState<string>('')
  const [gatePayload, setGatePayload] = useState<any>(null)
  const [gateError, setGateError] = useState<string | null>(null)

  // Pre-populate manual intake fields from parsed interpreted_summary or original client preferences
  let initialBrand = ''
  let initialName = ''
  let initialCategory = ''
  let initialNotes = ''
  let initialAttrs = ''

  try {
    let intakeData: any = null
    if (requestData?.interpreted_summary) {
      intakeData = typeof requestData.interpreted_summary === 'string'
        ? JSON.parse(requestData.interpreted_summary)
        : requestData.interpreted_summary
    }
    const product = intakeData?.ai_analysis?.product
    initialBrand = product?.brand || intakeData?.product?.brand || preferences?.preferred_brands || ''
    initialName = product?.name || intakeData?.product?.name || preferences?.preferred_models || requestData?.title || ''
    initialCategory = product?.category || intakeData?.product?.category || ''
    initialAttrs = product?.key_attributes?.join(', ') || preferences?.preferred_specs || ''
    initialNotes = preferences?.notes || requestData?.raw_description || ''
  } catch (e) {
    console.error('Error pre-populating manual intake fields:', e)
  }

  // Manual Intake Mode
  const [intakeMode, setIntakeMode] = useState<'ai' | 'manual'>('ai')
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaveError, setManualSaveError] = useState<string | null>(null)
  const [manualSaveSuccess, setManualSaveSuccess] = useState(false)
  const [manualBrand, setManualBrand] = useState(initialBrand)
  const [manualName, setManualName] = useState(initialName)
  const [manualCategory, setManualCategory] = useState(initialCategory)
  const [manualNotes, setManualNotes] = useState(initialNotes)
  const [manualAttrs, setManualAttrs] = useState(initialAttrs)

  const applyApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setGateError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await handleReviewerDecision(formData)
      if (res && res.status === 'PENDING_STAFF_CONFIRMATION') {
        setGatePayload(res.payload)
      } else {
        // Redirects or revalidates automatically
      }
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      setGateError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const confirmApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return // prevent double-submit
    setLoading(true)
    setGateError(null)
    const formData = new FormData(e.currentTarget)

    try {
      const res = await handleReviewerDecision(formData)
      if (res && res.status === 'PENDING_STAFF_CONFIRMATION') {
        setGatePayload(res.payload)
      } else {
        setGatePayload(null)
        window.location.href = `/${locale}/staff/workspace/${requestId}?success=true`
      }
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      setGateError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveManualIntake = async () => {
    setManualSaving(true)
    setManualSaveError(null)
    setManualSaveSuccess(false)
    try {
      const attrs = manualAttrs.split(',').map(s => s.trim()).filter(Boolean)
      const res = await Actions.handleSaveManualIntakeDetails({
        request_id: requestId,
        brand: manualBrand,
        name: manualName,
        category: manualCategory,
        key_attributes: attrs,
        notes: manualNotes,
      })
      if (res.success) {
        setManualSaveSuccess(true)
        setTimeout(() => setManualSaveSuccess(false), 3000)
      } else {
        setManualSaveError(res.error || 'Save failed')
      }
    } catch (err: any) {
      setManualSaveError(err.message)
    } finally {
      setManualSaving(false)
    }
  }

  const applySuggestion = async () => {
    if (!result) return
    setLoading(true)
    setGateError(null)

    const decisionStr = result.suggestions?.decision_support?.suggested_decision || result.decision || 'APPROVE'
    const dbDecision = decisionStr === 'REJECT' ? 'reject' : decisionStr === 'NEEDS_CLARIFICATION' ? 'needs_clarification' : 'approve'
    
    // Fallback notes
    let notes = staffNote || ''
    if (!notes && result.suggestions?.decision_support) {
      notes = result.suggestions.decision_support.decision_reason_ar || result.suggestions.decision_support.decision_reason_en || ''
    }

    const formData = new FormData()
    formData.append('requestId', requestId)
    formData.append('decision', dbDecision)
    formData.append('locale', locale)
    formData.append('reviewer_note', notes)

    try {
      const res = await handleReviewerDecision(formData)
      if (res && res.status === 'PENDING_STAFF_CONFIRMATION') {
        setGatePayload(res.payload)
      }
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      setGateError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyPricingSuggestion = () => {
    if (!result || !result.suggestions) return
    const sug = result.suggestions

    // Find requestKind dropdown
    const requestKindEl = document.querySelector('select[name="requestKind"]') as HTMLSelectElement
    if (requestKindEl) {
      let kindVal = requestData?.request_kind || 'everyday_purchase'
      if (sug.suggested_package_code?.startsWith('EDP-')) {
        kindVal = 'everyday_purchase'
      } else if (sug.suggested_package_code?.startsWith('BD-') || sug.suggested_package_code?.startsWith('PS-')) {
        kindVal = 'high_value_deals'
      } else if (sug.suggested_package_code?.startsWith('SC-') || sug.suggested_package_code?.startsWith('PS-')) {
        kindVal = 'projects_supplies'
      }
      requestKindEl.value = kindVal
      requestKindEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Find pricingModel dropdown
    const pricingModelEl = document.querySelector('select[name="pricingModel"]') as HTMLSelectElement
    if (pricingModelEl) {
      pricingModelEl.value = sug.suggested_pricing_model || 'fixed_fee'
      pricingModelEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Find paymentPolicy dropdown
    const paymentPolicyEl = document.querySelector('select[name="paymentPolicy"]') as HTMLSelectElement
    if (paymentPolicyEl) {
      paymentPolicyEl.value = sug.suggested_payment_policy || 'pay_after_preview'
      paymentPolicyEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Find serviceFee input
    const serviceFeeEl = document.getElementById('serviceFee') as HTMLInputElement || document.querySelector('input[name="serviceFee"]') as HTMLInputElement
    if (serviceFeeEl) {
      serviceFeeEl.value = String(sug.suggested_final_price || 0)
      serviceFeeEl.dispatchEvent(new Event('input', { bubbles: true }))
      serviceFeeEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Find pricingNotes textarea
    const pricingNotesEl = document.querySelector('textarea[name="pricingNotes"]') as HTMLTextAreaElement
    if (pricingNotesEl) {
      pricingNotesEl.value = sug.pricing_justification_ar || sug.pricing_justification_en || ''
      pricingNotesEl.dispatchEvent(new Event('input', { bubbles: true }))
      pricingNotesEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Scroll to the pricing form so staff can see it filled and click Confirm
    const formSection = document.getElementById('pricing-panel')
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      formSection.style.border = '2px solid var(--accent)'
      setTimeout(() => {
        formSection.style.border = '1px solid rgba(255,255,255,0.06)'
      }, 2000)
    }

    // Automatically submit the form to save it to the database permanently!
    const formEl = document.querySelector('form[data-testid="pricing-update-form"]') as HTMLFormElement
    if (formEl) {
      const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.click()
        } else {
          formEl.requestSubmit()
        }
      }, 300)
    }
  }

  const handleAction = async (tab: Tab) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let res: any
      switch (tab) {
        case 'intake':
          let forceImageAnalysis = false;
          if (requestData.reference_image_path) {
            forceImageAnalysis = window.confirm(
              isRTL 
                ? "لقد قمت برفع صورة مرجعية. هل تريد من الذكاء الاصطناعي معالجة وتحليل هذه الصورة؟\n\n(اضغط موافق للتحليل أو إلغاء للتخطي وتوفير التكلفة)" 
                : "A reference image is uploaded. Do you want the AI to process and analyze this image?\n\n(Click OK to analyze, Cancel to skip and save cost)"
            );
          }
          res = await Actions.handleAnalyzeIntakeAI({
            request_id: requestId,
            title: requestData.title,
            description: requestData.raw_description,
            request_kind: requestData.request_kind,
            preferences,
            language: requestData.customer_language,
            urgency: preferences.urgency_level,
            reference_image_path: requestData.reference_image_path,
            forceImageAnalysis
          })
          break
        case 'pricing':
          res = await Actions.handleSuggestPricingAI({
            request_id: requestId,
            request_kind: requestData.request_kind || 'everyday_purchase',
            description: requestData.raw_description,
            preferences,
            estimated_value: preferences.budget_max
          })
          break
        case 'research':
          res = await Actions.handleGenerateResearchPlanAI({
            request_id: requestId,
            title: requestData.title,
            description: requestData.raw_description,
            preferences
          })
          break
        case 'report':
          res = await Actions.handleAssistReportWritingAI({
            request_info: requestData,
            snapshots,
            is_unlocked: false
          })
          break
        case 'message':
          res = await Actions.handleDraftCommunicationAI({
            template_type: 'status_update',
            preferred_language: requestData.customer_language || 'en',
            request_code: requestData.request_code,
            request_title: requestData.title,
            current_stage: requestData.current_status
          })
          break
        case 'safety':
          res = await Actions.handleTrustSafetyCheckAI({
            content_to_check: requestData.executive_summary || '',
            context: 'report',
            hidden_data_keys: ['hidden_merchant_name', 'hidden_contact_notes']
          })
          break
      }

      if (res.error) {
        setError(res.error)
      } else {
        setResult(res)
        if (res.suggestions?.decision_support?.decision_reason_ar) {
          setStaffNote(res.suggestions.decision_support.decision_reason_ar)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  let tabs: { id: Tab; label: string }[] = [
    { id: 'intake', label: dict.ai_copilot.tab_intake },
    { id: 'pricing', label: dict.ai_copilot.tab_pricing },
    { id: 'research', label: dict.ai_copilot.tab_research },
    { id: 'report', label: dict.ai_copilot.tab_report },
    { id: 'safety', label: dict.ai_copilot.tab_safety },
  ]
  
  // Tab visibility: Admins always see ALL tabs
  // Non-admins see only tabs matching their permissions/roles
  if (!isAdminUser) {
    tabs = tabs.filter(t => {
      if (t.id === 'intake' || t.id === 'pricing') {
        return hasReviewerRole
      }
      if (t.id === 'research') {
        return !!canResearch
      }
      if (t.id === 'report' || t.id === 'safety') {
        return !!canReport
      }
      return false
    })
  }

  return (
    <section className="section-card glass-card ai-copilot-panel" style={{ border: '1px solid rgba(212,166,60,0.2)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '1.5rem' }}>
        <h2 className="card-title-text" style={{ color: 'var(--accent)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginInlineEnd: '0.5rem' }}>
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/>
          </svg>
          {dict.ai_copilot.panel_title}
        </h2>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>Beta</span>
      </header>

      <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBlockEnd: '1.5rem', fontWeight: 500 }}>
        {dict.ai_copilot.disclaimer}
      </p>

      <div style={{ padding: '1rem', background: 'rgba(212,166,60,0.05)', borderRadius: '12px', border: '1px solid rgba(212,166,60,0.1)', marginBlockEnd: '1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
        {isRTL 
          ? "يتم توليد اقتراحات الذكاء الاصطناعي باستخدام إعدادات الأدمن المعتمدة. يجب على الموظف مراجعة القرارات وتطبيقها يدويًا."
          : "AI suggestions use admin-approved settings. Staff must review and apply decisions manually."}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBlockEnd: '0.5rem', marginBlockEnd: '1.5rem', scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); setError(null); }}
            className={`badge ${activeTab === tab.id ? 'badge-gold' : 'badge-muted'}`}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap', border: 'none', transition: 'all 0.2s' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
        {/* ── Intake tab: AI/Manual mode toggle ── */}
        {activeTab === 'intake' && !result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Mode switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => { setIntakeMode('ai'); setManualSaveError(null); setManualSaveSuccess(false); }}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  background: intakeMode === 'ai' ? 'var(--accent)' : 'transparent',
                  color: intakeMode === 'ai' ? 'black' : 'rgba(148,163,184,1)',
                }}
              >
                🤖 {isRTL ? 'تحليل بالذكاء الاصطناعي' : 'AI Analysis'}
              </button>
              <button
                onClick={() => { setIntakeMode('manual'); setManualSaveError(null); setManualSaveSuccess(false); }}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  background: intakeMode === 'manual' ? 'rgba(99,102,241,0.3)' : 'transparent',
                  color: intakeMode === 'manual' ? 'rgba(167,139,250,1)' : 'rgba(148,163,184,1)',
                }}
              >
                ✍️ {isRTL ? 'إدخال يدوي' : 'Manual Entry'}
              </button>
            </div>

            {intakeMode === 'ai' ? (
              /* AI mode: original generate button */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', opacity: 0.6 }}>
                <div style={{ fontSize: '2rem' }}>🤖</div>
                <p style={{ fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
                  {isRTL ? 'اضغط لتشغيل تحليل الذكاء الاصطناعي على طلب العميل.' : 'Click to run AI analysis on the customer request.'}
                </p>
                <button onClick={() => handleAction(activeTab)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                  {dict.ai_copilot.btn_generate}
                </button>
              </div>
            ) : (
              /* Manual mode: form fields */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '12px', padding: '0.875rem', fontSize: '0.75rem', color: 'rgba(165,180,252,1)', fontWeight: 600 }}>
                  {isRTL
                    ? '✍️ إدخال يدوي: لو الطلب واضح وبسيط، ملي التفاصيل ده وهتتحفظ في الـ AI Intelligence Panel تلقائياً.'
                    : '✍️ Manual Entry: If the request is clear and simple, fill these details and they will appear in the AI Intelligence Panel automatically.'}
                </div>

                {([
                  { label: isRTL ? 'الماركة / البراند' : 'Brand / Make', val: manualBrand, set: setManualBrand, placeholder: isRTL ? 'مثال: شانيل، نايك، آبل' : 'e.g. Chanel, Nike, Apple' },
                  { label: isRTL ? 'نوع / موديل المنتج' : 'Product Type / Model', val: manualName, set: setManualName, placeholder: isRTL ? 'مثال: برفان No.5، حذاء Air Max' : 'e.g. No.5 Perfume, Air Max 90' },
                  { label: isRTL ? 'الفئة' : 'Category', val: manualCategory, set: setManualCategory, placeholder: isRTL ? 'مثال: عطور، أحذية، إلكترونيات' : 'e.g. Perfume, Shoes, Electronics' },
                ] as const).map(({ label, val, set, placeholder }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(100,116,139,1)', marginBottom: '4px' }}>{label}</div>
                    <input
                      type="text"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(100,116,139,1)', marginBottom: '4px' }}>
                    {isRTL ? 'المواصفات (افصل بفاصلة)' : 'Key Specs / Attributes (comma-separated)'}
                  </div>
                  <input
                    type="text"
                    value={manualAttrs}
                    onChange={e => setManualAttrs(e.target.value)}
                    placeholder={isRTL ? 'مثال: 100ml، رجالي، EDP' : 'e.g. 100ml, Men, EDP, Original'}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(100,116,139,1)', marginBottom: '4px' }}>
                    {isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
                  </div>
                  <textarea
                    value={manualNotes}
                    onChange={e => setManualNotes(e.target.value)}
                    placeholder={isRTL ? 'أي تفاصيل تانية مهمة...' : 'Any other important details...'}
                    rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.82rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                {manualSaveError && (
                  <div style={{ color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700 }}>⚠ {manualSaveError}</div>
                )}

                {manualSaveSuccess && (
                  <div style={{ color: '#4ade80', fontSize: '0.78rem', fontWeight: 700 }}>✅ {isRTL ? 'تم حفظ التفاصيل بنجاح. شوف AI Intelligence Panel.' : 'Details saved! Check AI Intelligence Panel.'}</div>
                )}

                <button
                  onClick={handleSaveManualIntake}
                  disabled={manualSaving || (!manualBrand && !manualName && !manualCategory)}
                  style={{
                    background: 'rgba(99,102,241,0.9)', color: 'white', fontWeight: 900, padding: '0.65rem 1.25rem',
                    borderRadius: '12px', border: 'none', cursor: manualSaving ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem', opacity: (manualSaving || (!manualBrand && !manualName && !manualCategory)) ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {manualSaving ? '⟳ جاري الحفظ...' : `💾 ${isRTL ? 'حفظ التفاصيل' : 'Save Details'}`}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'intake' && !result && !loading && !error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBlockEnd: '1rem' }}>🤖</div>
            <button onClick={() => handleAction(activeTab)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
              {dict.ai_copilot.btn_generate}
            </button>
          </div>
        )}

        {loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ marginBlockEnd: '1rem' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.7 }}>{dict.ai_copilot.loading}</div>
          </div>
        )}

        {error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fca5a5' }}>
            <div style={{ fontSize: '1.5rem', marginBlockEnd: '0.5rem' }}>⚠️</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{error}</div>
            <button onClick={() => handleAction(activeTab)} className="btn-secondary" style={{ marginBlockStart: '1rem', fontSize: '0.75rem' }}>Retry</button>
          </div>
        )}

        {result && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activeTab === 'intake' && result.suggestions?.ai_analysis ? (
              // Beautiful Premium Operations Workspace UI with Actionable Workflows
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. AI Analysis Header */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(212,166,60,0.15)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent)' }}>
                        FINDORA Intake AI Decision Assistant
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                        Sourcing validation and multimodal item intelligence
                      </p>
                    </div>
                    {/* Suggested Decision Badge */}
                    {(() => {
                      const decision = result.suggestions.decision_support?.suggested_decision;
                      let bg = 'rgba(34,197,94,0.1)';
                      let border = 'rgba(34,197,94,0.2)';
                      let color = '#4ade80';
                      let text = 'موافقة مقترحة / APPROVAL RECOMMENDED';
                      
                      if (decision === 'NEEDS_CLARIFICATION') {
                        bg = 'rgba(234,179,8,0.1)';
                        border = 'rgba(234,179,8,0.2)';
                        color = '#fde047';
                        text = 'توضيح مطلوب / NEEDS CLARIFICATION';
                      } else if (decision === 'REJECT') {
                        bg = 'rgba(239,68,68,0.1)';
                        border = 'rgba(239,68,68,0.2)';
                        color = '#fca5a5';
                        text = 'رفض مقترح / REJECTION RECOMMENDED';
                      }
                      
                      return (
                        <span style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          color: color,
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {text}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Confidence Warning System */}
                {result.suggestions.ai_analysis.confidence_score < 0.65 && (
                  <div style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: '#fcd34d',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      الذكاء الاصطناعي غير واثق من التحليل (درجة الثقة: {(result.suggestions.ai_analysis.confidence_score * 100).toFixed(0)}%).
                      يرجى مراجعة الطلب والصورة يدويًا قبل اتخاذ القرار.
                    </div>
                  </div>
                )}

                {/* 3. Product Detection Card */}
                {result.suggestions.ai_analysis.product && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      📦 Product Detection Intel
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      {result.suggestions.ai_analysis.product.brand && (
                        <div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>BRAND</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginBlockStart: '0.15rem' }}>
                            {result.suggestions.ai_analysis.product.brand}
                          </div>
                        </div>
                      )}
                      {result.suggestions.ai_analysis.product.name && (
                        <div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>PRODUCT NAME</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginBlockStart: '0.15rem' }}>
                            {result.suggestions.ai_analysis.product.name}
                          </div>
                        </div>
                      )}
                      {result.suggestions.ai_analysis.product.category && (
                        <div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>CATEGORY</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginBlockStart: '0.15rem' }}>
                            {result.suggestions.ai_analysis.product.category}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>CONFIDENCE</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', marginBlockStart: '0.15rem' }}>
                          {(result.suggestions.ai_analysis.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {result.suggestions.ai_analysis.product.key_attributes?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, marginBlockEnd: '0.4rem' }}>DETECTED ATTRIBUTES & OCR</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {result.suggestions.ai_analysis.product.key_attributes.map((attr: string, i: number) => (
                            <span key={i} className="badge badge-muted" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. AI Decision Support & Action Controls Card */}
                {result.suggestions.decision_support && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderInlineStart: '4px solid var(--accent)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                        ⚖️ Sourcing Recommendation & Review Controls
                      </h4>
                      {/* Risk Level Badge */}
                      {(() => {
                        const risk = result.suggestions.decision_support.risk_level;
                        let bg = 'rgba(34,197,94,0.1)';
                        let color = '#4ade80';
                        if (risk === 'MEDIUM') {
                          bg = 'rgba(234,179,8,0.1)';
                          color = '#fde047';
                        } else if (risk === 'HIGH') {
                          bg = 'rgba(239,68,68,0.1)';
                          color = '#fca5a5';
                        }
                        return (
                          <span style={{ background: bg, color: color, fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: '4px', border: `1px solid ${color}33` }}>
                            RISK: {risk}
                          </span>
                        );
                      })()}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 600, direction: 'rtl', textAlign: 'right', lineHeight: 1.5 }}>
                      {result.suggestions.decision_support.decision_reason_ar}
                    </p>
                    
                    {result.suggestions.decision_support.decision_reason_en && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                        {result.suggestions.decision_support.decision_reason_en}
                      </p>
                    )}

                    {/* Operational Action Buttons with State Note */}
                    {actionPermissions?.canReviewIntake ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBlockStart: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBlockStart: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 700, color: 'var(--accent)' }}>ملاحظات المراجع لتأكيد القرار:</div>
                        <textarea
                          value={staffNote}
                          onChange={(e) => setStaffNote(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '0.5rem',
                            fontSize: '0.85rem',
                            minHeight: '60px',
                            resize: 'vertical'
                          }}
                          placeholder="اكتب ملاحظاتك هنا قبل تأكيد القرار..."
                        />
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                          {(() => {
                            const decision = result.suggestions.decision_support?.suggested_decision;
                            if (decision === 'APPROVE') {
                              return (
                                <>
                                  <form onSubmit={applyApprove}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="approve" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-accent" style={{ background: '#22c55e', color: 'black', fontWeight: 900, padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}>
                                      ✅ اعتماد الاقتراح
                                    </button>
                                  </form>
                                  <a href="#reviewer-panel" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                    ✏ تعديل القرار
                                  </a>
                                  <form action={handleReviewerDecision as any}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="reject" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote || 'Rejected after review.'} />
                                    <button type="submit" className="btn-secondary" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                      ❌ رفض الاقتراح
                                    </button>
                                  </form>
                                  <form action={handleReviewerDecision as any}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="needs_clarification" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                      💬 طلب توضيح من العميل
                                    </button>
                                  </form>
                                </>
                              );
                            } else if (decision === 'REJECT') {
                              return (
                                <>
                                  <form action={handleReviewerDecision as any}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="reject" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-accent" style={{ background: '#ef4444', color: 'white', fontWeight: 900, padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}>
                                      ❌ اعتماد الرفض
                                    </button>
                                  </form>
                                  <a href="#reviewer-panel" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                    ✏ تعديل القرار
                                  </a>
                                  <form action={handleReviewerDecision as any}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="needs_clarification" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                      💬 طلب توضيح
                                    </button>
                                  </form>
                                  <form onSubmit={applyApprove}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="approve" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-secondary" style={{ color: '#4ade80', fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                      ✅ تحويل للمراجعة اليدوية
                                    </button>
                                  </form>
                                </>
                              );
                            } else { // NEEDS_CLARIFICATION
                              return (
                                <>
                                  <form action={handleReviewerDecision as any}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="needs_clarification" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-accent" style={{ background: '#eab308', color: 'black', fontWeight: 900, padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}>
                                      💬 إرسال أسئلة للعميل
                                    </button>
                                  </form>
                                  <a href="#reviewer-panel" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                    ✏ تعديل القرار
                                  </a>
                                  <form onSubmit={applyApprove}>
                                    <input type="hidden" name="requestId" value={requestId} />
                                    <input type="hidden" name="decision" value="approve" />
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="reviewer_note" value={staffNote} />
                                    <button type="submit" className="btn-secondary" style={{ color: '#4ade80', fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                                      ✅ اعتماد بعد المراجعة
                                    </button>
                                  </form>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(212,166,60,0.06)',
                        border: '1px solid rgba(212,166,60,0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBlockStart: '1rem',
                        fontSize: '0.8rem',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        {isRTL 
                          ? "ℹ️ هذا الطلب تم اعتماده مسبقاً ونقله لمرحلة التوريد والعمليات بنجاح. لا يمكن إعادة اتخاذ قرار المراجعة له."
                          : "ℹ️ This request is already approved and moved to operations. Sourcing phase is currently active."}
                      </div>
                    )}
 
                     <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', opacity: 0.9, marginBlockStart: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', background: 'rgba(212,166,60,0.05)', padding: '0.4rem', borderRadius: '6px' }}>
                       القرار النهائي يتم بواسطة الموظف وليس الذكاء الاصطناعي
                     </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', opacity: 0.9, marginBlockStart: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', background: 'rgba(212,166,60,0.05)', padding: '0.4rem', borderRadius: '6px' }}>
                      القرار النهائي يتم بواسطة الموظف وليس الذكاء الاصطناعي
                    </div>
                  </div>
                )}

                {/* 5. Field Agent Dispatch Preview Card */}
                {result.suggestions.decision_support?.suggested_decision === 'APPROVE' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>
                      🏪 معاينة إرسال مهمة البحث الميداني (Field Sourcing Instruction)
                    </h4>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div><strong style={{ color: 'white' }}>اسم المنتج المطلوب:</strong> {result.suggestions.ai_analysis.product.name || 'غير محدد بدقة'}</div>
                      <div><strong style={{ color: 'white' }}>الماركة / العلامة التجارية:</strong> {result.suggestions.ai_analysis.product.brand || 'كل الماركات المتاحة'}</div>
                      <div><strong style={{ color: 'white' }}>الفئة المستهدفة:</strong> {result.suggestions.ai_analysis.product.category || 'عام'}</div>
                      <div><strong style={{ color: 'white' }}>المواصفات الملتقطة:</strong> {result.suggestions.ai_analysis.product.key_attributes?.join('، ') || 'مواصفات عادية'}</div>
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingBlockStart: '0.5rem', marginBlockStart: '0.25rem' }}>
                        <strong style={{ color: 'var(--accent)' }}>💡 إرشادات الشراء والبدائل للباحث الميداني:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}>
                          - يرجى البحث عن المنتج المطابق تماماً للمواصفات والماركة الموضحة أعلاه.
                          <br />
                          - نطاق ميزانية العميل المقدرة: {preferences?.budget_min || 'غير محدد'} إلى {preferences?.budget_max || 'غير محدد'} EGP.
                          <br />
                          - قبول البدائل: {preferences?.allow_alternatives === false ? 'العميل يصر على نفس النوع والمواصفات المحددة تماماً ولا يقبل بدائل.' : 'يفضل العميل الحصول على نفس النوع والماركة تماماً، وفي حالة عدم توفره يرجى تسجيل العروض البديلة المناسبة والقريبة في السعر والجودة.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Online Research Status timeline */}
                {result.suggestions.decision_support?.suggested_decision === 'APPROVE' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      🌐 Online Sourcing Workflow Status
                    </h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span>
                        ⏳ جاري البحث / Searching
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', opacity: 0.5 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'gray', borderRadius: '50%' }}></span>
                        🔍 نتائج متوفرة / Results Found
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', opacity: 0.5 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'gray', borderRadius: '50%' }}></span>
                        📦 عروض أولية جاهزة / Offers Drafted
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', opacity: 0.5 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'gray', borderRadius: '50%' }}></span>
                        ✅ اكتمل البحث / Finished
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Staff Notes Card */}
                {result.suggestions.staff_view && (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      📋 Operational staff view & Highlights
                    </h4>
                    
                    {result.suggestions.staff_view.headline && (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                        {result.suggestions.staff_view.headline}
                      </div>
                    )}

                    {result.suggestions.staff_view.key_points?.length > 0 && (
                      <ul style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {result.suggestions.staff_view.key_points.map((pt: string, i: number) => <li key={i}>{pt}</li>)}
                      </ul>
                    )}

                    {result.suggestions.staff_view.recommended_actions?.length > 0 && (
                      <div style={{ marginBlockStart: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, marginBlockEnd: '0.5rem' }}>RECOMMENDED NEXT STEPS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {result.suggestions.staff_view.recommended_actions.map((act: string, i: number) => (
                            <span key={i} style={{ background: 'rgba(212,166,60,0.1)', border: '1px solid rgba(212,166,60,0.2)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                              ⚡ {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 8. Customer Status Card */}
                {result.suggestions.customer_message && (
                  <div style={{
                    background: 'rgba(212,166,60,0.03)',
                    border: '1px solid rgba(212,166,60,0.1)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)' }}>
                      <span>🟡</span>
                      <span>الطلب قيد مراجعة الموظف / PENDING STAFF REVIEW</span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 500, direction: 'rtl', textAlign: 'right', lineHeight: 1.5 }}>
                      {result.suggestions.customer_message.message_ar}
                    </p>
                    
                    {result.suggestions.customer_message.message_en && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
                        {result.suggestions.customer_message.message_en}
                      </p>
                    )}

                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, marginBlockStart: '0.25rem' }}>
                      * The customer has NOT received any notification yet. Human reviewer approval required to dispatch.
                    </div>
                  </div>
                )}

              </div>
            ) : activeTab === 'pricing' && result.suggestions ? (
              // ─── Beautiful Pricing Suggestion Card ───────────────────────────────
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Service Type + Package Row */}
                <div style={{
                  background: 'rgba(212,166,60,0.06)',
                  border: '1px solid rgba(212,166,60,0.2)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.08em' }}>نوع الطلب / Service Type</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>
                        {requestData?.request_kind === 'high_value_deals' || requestData?.request_kind === 'high_value_asset' ? '💎 طلب صفقة كبيرة' :
                         requestData?.request_kind === 'projects_supplies' || requestData?.request_kind === 'project_supply' ? '💼 مشاريع وتوريد' :
                         '🛒 شراء يومي'}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, fontFamily: 'monospace' }}>{result.suggestions.suggested_package_code}</div>
                    </div>
                    <div style={{ textAlign: 'end' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.08em' }}>السعر المقترح / Suggested Price</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                        {result.suggestions.suggested_final_price} <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>EGP</span>
                      </div>
                      {result.suggestions.suggested_price_min !== result.suggestions.suggested_price_max && (
                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                          النطاق: {result.suggestions.suggested_price_min} – {result.suggestions.suggested_price_max} EGP
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Model + Policy badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700 }}>
                      📋 {result.suggestions.suggested_pricing_model?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700 }}>
                      💳 {result.suggestions.suggested_payment_policy?.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      background: result.suggestions.risk_level === 'high' || result.suggestions.risk_level === 'very_high' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      border: `1px solid ${result.suggestions.risk_level === 'high' || result.suggestions.risk_level === 'very_high' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      color: result.suggestions.risk_level === 'high' || result.suggestions.risk_level === 'very_high' ? '#fca5a5' : '#34d399',
                      borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700
                    }}>
                      ⚠️ مخاطر: {result.suggestions.risk_level}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700 }}>
                      ⚡ مجهود: {result.suggestions.effort_level}
                    </span>
                  </div>
                </div>

                {/* Arabic Justification */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '1rem',
                  direction: 'rtl',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.45, letterSpacing: '0.06em', marginBlockEnd: '0.5rem' }}>مبرر التسعير للموظف</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
                    {result.suggestions.pricing_justification_ar}
                  </div>
                </div>

                {/* Warnings if any */}
                {result.suggestions.warnings?.length > 0 && (
                  <div style={{ borderInlineStart: '3px solid #f59e0b', paddingInlineStart: '0.75rem', direction: 'rtl', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBlockEnd: '0.25rem' }}>⚠ ملاحظات</div>
                    <ul style={{ margin: 0, paddingInlineStart: '1rem', fontSize: '0.8rem', color: '#fbbf24' }}>
                      {result.suggestions.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {/* Action to Apply suggestion to form */}
                <button
                  type="button"
                  onClick={applyPricingSuggestion}
                  className="btn-accent"
                  style={{
                    background: 'var(--accent)',
                    color: 'black',
                    fontWeight: 900,
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    marginBlockStart: '0.5rem',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(212,166,60,0.2)',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase'
                  }}
                >
                  ✍️ {isRTL ? 'تطبيق هذا الاقتراح على النموذج' : 'Apply Suggestion to Form'}
                </button>

                {/* Staff disclaimer */}
                <div style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'center', fontWeight: 600 }}>
                  * هذا الاقتراح للمراجعة فقط — يجب على الموظف تأكيد التسعير النهائي يدوياً
                </div>
              </div>
            ) : (
              // Default clean presentation for other tabs
              <>
                <div className="field-box">
                  <div className="field-label">{dict.ai_copilot.summary}</div>
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {result.summary}
                  </div>
                </div>

                {result.suggestions && (
                  <div className="field-box" style={{ background: 'rgba(212,166,60,0.05)' }}>
                    <div className="field-label">{dict.ai_copilot.suggestions}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>
                      {typeof result.suggestions === 'string'
                        ? result.suggestions
                        : Object.entries(result.suggestions as Record<string, any>)
                            .filter(([k]) => !k.includes('_en') || k.includes('ar'))
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join('\n')}
                    </div>
                  </div>
                )}
              </>
            )}

            {result.risks && result.risks.length > 0 && activeTab !== 'intake' && (
              <div className="field-box" style={{ borderInlineStart: '4px solid #fca5a5' }}>
                <div className="field-label">{dict.ai_copilot.risks}</div>
                <ul style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                  {result.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockStart: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.4 }}>
                {dict.ai_copilot.confidence}: {(result.confidence * 100).toFixed(0)}%
              </div>
              {activeTab === 'message' ? (
                <button
                  onClick={() => {
                    if (result.summary) {
                      navigator.clipboard.writeText(result.summary)
                    }
                  }}
                  className="btn-accent"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                >
                  {dict.ai_copilot.copy_draft}
                </button>
              ) : (
                <button
                  onClick={applySuggestion}
                  className="btn-accent"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                >
                  {dict.ai_copilot.apply_suggestion}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {gatePayload && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-card animate-in" style={{
            maxWidth: '550px',
            width: '100%',
            border: '2px solid var(--accent)',
            borderRadius: '24px',
            padding: '2rem',
            background: '#0a0a0a',
            boxShadow: '0 0 40px rgba(212,166,60,0.25)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)', marginBlockEnd: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚖️ تأكيد تسعير الطلب (Pricing Gate Confirmation)
            </h3>
            
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBlockEnd: '1.5rem', lineHeight: 1.5 }}>
              يرجى مراجعة وتأكيد تفاصيل التسعير والنموذج المعتمد قبل الموافقة النهائية على طلب العميل.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBlockEnd: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>السعر الأساسي / BASE PRICE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBlockStart: '0.25rem' }}>
                    {gatePayload.pricing.base_price} {gatePayload.pricing.currency}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>السعر الترويجي / PROMO PRICE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: gatePayload.pricing.promo_price ? '#4ade80' : 'rgba(255,255,255,0.3)', marginBlockStart: '0.25rem' }}>
                    {gatePayload.pricing.promo_price ? `${gatePayload.pricing.promo_price} ${gatePayload.pricing.currency}` : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(212,166,60,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212,166,60,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)' }}>السعر النهائي المستحق / FINAL SERVICE FEE</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                    {gatePayload.pricing.final_price} {gatePayload.pricing.currency}
                  </span>
                </div>
                <div style={{ marginBlockStart: '0.5rem', fontSize: '0.7rem', opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>نموذج التسعير: {gatePayload.pricing.model}</span>
                  <span>السياسة: الدفع بعد المعاينة</span>
                </div>
              </div>

              {/* Request Summary (from Intake AI) */}
              <div style={{ background: 'rgba(99,102,241,0.08)', padding: '0.875rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 800, color: 'rgba(165,180,252,1)', marginBlockEnd: '0.375rem', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 ملخص طلب العميل (Intake AI Summary):</div>
                <div style={{ opacity: 0.85, lineHeight: 1.55, color: 'rgba(203,213,225,1)' }}>
                  {result?.suggestions?.ai_analysis?.summary_en || result?.suggestions?.ai_analysis?.summary_ar || requestData?.intake_summary || requestData?.raw_description || 'لا يوجد ملخص متاح'}
                </div>
                {gatePayload.ai_insight?.recommended_price && (
                  <div style={{ marginBlockStart: '0.5rem', fontSize: '0.7rem', opacity: 0.5, display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.375rem' }}>
                    <span>💰 سعر الخدمة المقترح: {gatePayload.ai_insight.recommended_price} EGP</span>
                    {gatePayload.ai_insight.confidence && <span>الثقة: {(gatePayload.ai_insight.confidence * 100).toFixed(0)}%</span>}
                  </div>
                )}
              </div>
            </div>

            {gateError && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBlockEnd: '1rem' }}>
                ⚠️ {gateError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setGatePayload(null)}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
              >
                إلغاء / Cancel
              </button>
              
              <form onSubmit={confirmApprove}>
                <input type="hidden" name="requestId" value={requestId} />
                <input type="hidden" name="decision" value="approve" />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="confirmed_approval" value="true" />
                <input type="hidden" name="final_price" value={gatePayload.pricing.final_price} />
                <input type="hidden" name="pricing_model" value={gatePayload.pricing.model} />
                <input type="hidden" name="pricing_notes" value={gatePayload.ai_insight?.reasoning || 'Approved after pricing gate review.'} />
                <input type="hidden" name="reviewer_note" value={staffNote || 'Approved.'} />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent"
                  style={{ background: '#22c55e', color: 'black', fontWeight: 900, fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'جاري التأكيد...' : 'تأكيد واعتماد / Confirm & Approve'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
