'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { handleReviewerDecision } from '@/app/[locale]/staff/workspace/[request_id]/actions'
import { createPortal } from 'react-dom'

function ConfirmSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: '#22c55e',
        color: '#000',
        fontWeight: 900,
        padding: '0.8rem 1.5rem',
        border: 'none',
        borderRadius: '12px',
        cursor: pending ? 'not-allowed' : 'pointer',
        fontSize: '0.9rem',
        opacity: pending ? 0.7 : 1
      }}
    >
      {pending ? 'جاري التنفيذ...' : 'تأكيد واعتماد / Confirm & Approve'}
    </button>
  )
}

function PhaseOneSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="btn-accent" 
      style={{ background: 'var(--accent)', color: 'black', fontWeight: 900, alignSelf: 'flex-start', opacity: pending ? 0.7 : 1 }} 
      data-testid="reviewer-save-decision"
    >
      {pending ? 'جاري الحفظ...' : 'حفظ'}
    </button>
  )
}

export function ReviewerDecisionForm({ 
  requestId, 
  locale, 
  dict, 
  isRTL, 
  errorCode, 
  decisionType, 
  defaultNote,
  requestData
}: { 
  requestId: string
  locale: string
  dict: any
  isRTL: boolean
  errorCode?: string
  decisionType?: string
  defaultNote?: string
  requestData?: any
}) {
  const [loading, setLoading] = useState(false)
  const [gatePayload, setGatePayload] = useState<any>(null)
  const [gateError, setGateError] = useState<string | null>(null)
  const [staffNote, setStaffNote] = useState(defaultNote || '')

  const onAction = async (formData: FormData) => {
    setGateError(null)
    formData.append('client_managed_gate', 'true')
    
    const res = await handleReviewerDecision(formData)
    if (res && res.status === 'PENDING_STAFF_CONFIRMATION') {
      setGatePayload(res.payload)
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

  return (
    <>
      <form action={onAction} className="stack" style={{ gap: '1.5rem' }} data-testid="reviewer-decision-form">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="locale" value={locale} />
        
        <div className="field-box">
          <div className="field-label">{dict.staff_workspace.status}</div>
          <select 
            name="decision" 
            required 
            data-testid="reviewer-decision-select"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', width: '200px' }}
          >
            <option value="" style={{ color: 'black' }}>{dict.common.loading.replace('...', '')}</option>
            <option value="approve" style={{ color: 'black' }}>{dict.staff_workspace.approve}</option>
            <option value="reject" style={{ color: 'black' }}>{dict.staff_workspace.reject}</option>
            <option value="needs_clarification" style={{ color: 'black' }}>{dict.staff_workspace.needs_clarification}</option>
          </select>
        </div>

        <div className="field-box">
          <div className="field-label">{isRTL ? 'ملاحظة المراجع' : 'Reviewer Note'}</div>
          <textarea 
            name="reviewer_note" 
            id="reviewer_note"
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder={dict.staff_workspace.reviewer_notes_placeholder}
            style={{ 
              width: '100%', 
              border: errorCode === 'note_required' ? '1px solid #fca5a5' : 'none', 
              background: errorCode === 'note_required' ? 'rgba(252,165,165,0.05)' : 'transparent',
              color: 'white', 
              outline: 'none', 
              minHeight: '100px', 
              resize: 'vertical', 
              fontSize: '0.9rem',
              borderRadius: errorCode === 'note_required' ? '8px' : '0',
              padding: errorCode === 'note_required' ? '0.5rem' : '0'
            }}
            data-testid="reviewer-note-input"
          />
          {errorCode === 'note_required' && (
            <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: 700, marginBlockStart: '0.5rem' }}>
              {decisionType === 'reject' 
                ? (isRTL ? "يجب كتابة ملاحظة المراجع قبل رفض الطلب." : "Reviewer note is required before rejecting.")
                : (isRTL ? "يجب كتابة ملاحظة المراجع قبل طلب توضيح." : "Reviewer note is required before requesting clarification.")
              }
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <PhaseOneSubmitButton />
          </div>
        </div>
      </form>

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
                  {requestData?.intake_summary || requestData?.raw_description || 'لا يوجد ملخص متاح'}
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
                disabled={loading}
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
                  style={{ background: '#22c55e', color: 'black', fontWeight: 900, fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'جاري التأكيد...' : 'تأكيد واعتماد / Confirm & Approve'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
