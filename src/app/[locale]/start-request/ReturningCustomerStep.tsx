'use client'
/**
 * src/app/[locale]/start-request/ReturningCustomerStep.tsx
 *
 * Phase 3 — Optional "Returning Customer" first step in the Request Wizard.
 *
 * Constraints (from spec):
 * - 100% optional and skippable in ONE tap/click. "تخطي" is equally prominent.
 * - No auto-advance on any state — customer must always act explicitly.
 * - Skip during loading → proceeds immediately to normal wizard (no block).
 * - Phone used ONLY for lookup — never saved or sent until the Intake step.
 * - No AI calls anywhere in this component.
 * - If useFeature('request_history_lookup').enabled !== true → renders null.
 */

import React, { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReusedRequestData {
  id:             string
  productName:    string
  category:       string
  targetLocation: string | null
  maxPrice:       number  | null
  notes:          string  | null
  status:         string
  createdAt:      string
  sourceType:     'manual'
  lookupPhone:    string   // the normalized phone — passed to wizard for Intake pre-fill
}

interface PreviousRequestSummary {
  id:          string
  productName: string
  category:    string
  status:      string
  createdAt:   string
}

interface ReturningCustomerStepProps {
  isAr:    boolean
  onSkip:  () => void
  onReuse: (data: ReusedRequestData) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(isoString: string, isAr: boolean): string {
  try {
    const diff   = Date.now() - new Date(isoString).getTime()
    const days   = Math.floor(diff / 86_400_000)
    const weeks  = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    if (isAr) {
      if (days < 1)    return 'اليوم'
      if (days === 1)  return 'أمس'
      if (days < 7)    return `منذ ${days} أيام`
      if (weeks < 5)   return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`
      if (months < 12) return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`
      return 'منذ أكثر من سنة'
    } else {
      if (days < 1)   return 'Today'
      if (days === 1) return 'Yesterday'
      if (days < 7)   return `${days} days ago`
      if (weeks < 5)  return `${weeks} week${weeks > 1 ? 's' : ''} ago`
      if (months < 12)return `${months} month${months > 1 ? 's' : ''} ago`
      return 'Over a year ago'
    }
  } catch {
    return isoString
  }
}

function translateStatus(status: string, isAr: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    open:        { ar: 'مفتوح',      en: 'Open' },
    processing:  { ar: 'قيد المعالجة', en: 'In Progress' },
    fulfilled:   { ar: 'مكتمل',     en: 'Fulfilled' },
    cancelled:   { ar: 'ملغى',      en: 'Cancelled' },
  }
  const entry = map[status]
  if (!entry) return status
  return isAr ? entry.ar : entry.en
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReturningCustomerStep({
  isAr,
  onSkip,
  onReuse,
}: ReturningCustomerStepProps) {
  const [phone,         setPhone]         = useState('')
  const [isSearching,   setIsSearching]   = useState(false)
  const [isReusing,     setIsReusing]     = useState<string | null>(null) // requestId being fetched
  const [results,       setResults]       = useState<PreviousRequestSummary[] | null>(null)
  const [notFound,      setNotFound]      = useState(false)
  const [searchError,   setSearchError]   = useState('')
  const [lookedUpPhone, setLookedUpPhone] = useState('') // the phone used for the lookup

  // ── Search handler ────────────────────────────────────────────────────────
  async function handleSearch() {
    const trimmed = phone.trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearchError('')
    setResults(null)
    setNotFound(false)

    try {
      const res  = await fetch('/api/requests/history-lookup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: trimmed }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setSearchError(data.messageAr ?? (isAr ? 'محاولات كثيرة، حاول بعد دقيقة' : 'Too many attempts, try again in a minute'))
        return
      }

      if (!res.ok) {
        setSearchError(isAr ? 'حدث خطأ، حاول مرة أخرى' : 'Something went wrong, please try again')
        return
      }

      if (!data.found) {
        setNotFound(true)
        setLookedUpPhone(trimmed)
        return
      }

      setResults(data.requests as PreviousRequestSummary[])
      setLookedUpPhone(trimmed)
    } catch {
      setSearchError(isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error, please try again')
    } finally {
      setIsSearching(false)
    }
  }

  // ── Reuse handler ─────────────────────────────────────────────────────────
  async function handleReuse(requestId: string) {
    if (isReusing) return
    setIsReusing(requestId)
    setSearchError('')

    try {
      const res  = await fetch(
        `/api/requests/${encodeURIComponent(requestId)}/reuse?phone=${encodeURIComponent(lookedUpPhone)}`,
        { method: 'GET' }
      )
      const data = await res.json()

      if (res.status === 403) {
        setSearchError(isAr ? 'تعذّر التحقق من الطلب، حاول مجدداً' : 'Could not verify request, please try again')
        return
      }
      if (!res.ok) {
        setSearchError(isAr ? 'حدث خطأ أثناء جلب الطلب' : 'Error fetching request, please try again')
        return
      }

      onReuse({
        ...data,
        lookupPhone: lookedUpPhone,
      } as ReusedRequestData)
    } catch {
      setSearchError(isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error, please try again')
    } finally {
      setIsReusing(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rc-step" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rc-header">
        <div className="rc-icon">🔄</div>
        <div className="rc-header-text">
          <h2 className="rc-title">
            {isAr ? 'عميل قديم؟' : 'Returning Customer?'}
          </h2>
          <p className="rc-subtitle">
            {isAr
              ? 'ادخل رقمك لاسترجاع طلباتك السابقة وإعادة استخدامها'
              : 'Enter your phone to retrieve and reuse your previous requests'}
          </p>
        </div>
      </div>

      {/* Phone input + buttons row */}
      <div className="rc-input-row">
        <input
          id="rc-phone-input"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setSearchError('')
            setResults(null)
            setNotFound(false)
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
          disabled={isSearching}
          className="rc-phone-input"
          placeholder={isAr ? '01XXXXXXXXX' : '01XXXXXXXXX'}
          dir="ltr"
        />

        {/* Search button */}
        <button
          id="rc-search-btn"
          type="button"
          onClick={handleSearch}
          disabled={isSearching || !phone.trim()}
          className="rc-search-btn"
        >
          {isSearching ? (
            <>
              <span className="rc-spinner" />
              {isAr ? 'جاري...' : 'Searching...'}
            </>
          ) : (
            isAr ? '🔍 بحث' : '🔍 Search'
          )}
        </button>

        {/* Skip button — equally prominent, always enabled */}
        <button
          id="rc-skip-btn"
          type="button"
          onClick={onSkip}
          className="rc-skip-btn"
        >
          {isAr ? 'تخطي ←' : '→ Skip'}
        </button>
      </div>

      {/* Error banner */}
      {searchError && (
        <div className="rc-error">⚠️ {searchError}</div>
      )}

      {/* Not found state */}
      {notFound && !searchError && (
        <div className="rc-not-found">
          <span className="rc-not-found-icon">📭</span>
          <div>
            <p className="rc-not-found-title">
              {isAr ? 'لا توجد طلبات سابقة بهذا الرقم' : 'No previous requests found for this number'}
            </p>
            <p className="rc-not-found-hint">
              {isAr
                ? 'انقر على "تخطي" لبدء طلب جديد'
                : 'Click Skip to start a new request'}
            </p>
          </div>
        </div>
      )}

      {/* Results — previous request cards */}
      {results && results.length > 0 && (
        <div className="rc-results">
          <p className="rc-results-label">
            {isAr
              ? `وجدنا ${results.length} طلب${results.length > 1 ? 'ات' : ''} سابق${results.length > 1 ? 'ة' : ''} — اختر لإعادة الاستخدام:`
              : `Found ${results.length} previous request${results.length > 1 ? 's' : ''} — choose one to reuse:`}
          </p>
          {results.map((req) => (
            <div key={req.id} className="rc-card">
              <div className="rc-card-info">
                <p className="rc-card-product">{req.productName}</p>
                <div className="rc-card-meta">
                  <span className="rc-card-category">{req.category}</span>
                  <span className="rc-card-dot">·</span>
                  <span className="rc-card-date">
                    {formatRelativeDate(req.createdAt, isAr)}
                  </span>
                  <span className="rc-card-dot">·</span>
                  <span className="rc-card-status">{translateStatus(req.status, isAr)}</span>
                </div>
              </div>
              <button
                id={`rc-reuse-btn-${req.id}`}
                type="button"
                onClick={() => handleReuse(req.id)}
                disabled={!!isReusing}
                className="rc-reuse-btn"
              >
                {isReusing === req.id ? (
                  <>
                    <span className="rc-spinner" />
                    {isAr ? 'جاري...' : 'Loading...'}
                  </>
                ) : (
                  isAr ? 'إعادة استخدام' : 'Reuse'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scoped CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .rc-step {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Header */
        .rc-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px;
          border-radius: 14px;
          border: 1px solid rgba(99, 102, 241, 0.25);
          background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04));
        }
        .rc-icon {
          font-size: 28px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .rc-header-text { text-align: start; }
        .rc-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0 0 6px 0;
        }
        .rc-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.5;
        }

        /* Input row — phone input + search + skip all equally accessible */
        .rc-input-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .rc-phone-input {
          flex: 1;
          min-width: 200px;
          height: 48px;
          border-radius: 10px;
          background: rgba(0,0,0,0.4);
          padding: 0 16px;
          color: white;
          font-size: 16px;
          letter-spacing: 0.05em;
          border: 1px solid rgba(99,102,241,0.3);
          outline: none;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }
        .rc-phone-input:focus {
          border-color: rgba(99,102,241,0.65);
        }
        .rc-phone-input::placeholder { color: #475569; }
        .rc-phone-input:disabled { opacity: 0.6; }

        /* Search button */
        button.rc-search-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          height: 48px !important;
          width: 140px !important;
          border-radius: 10px !important;
          background: rgba(99,102,241,0.18) !important;
          border: 1px solid rgba(99,102,241,0.4) !important;
          color: #a5b4fc !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          white-space: nowrap !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }
        button.rc-search-btn:hover:not(:disabled) {
          background: rgba(99,102,241,0.3) !important;
          color: white !important;
        }
        button.rc-search-btn:disabled {
          opacity: 0.45 !important;
          cursor: not-allowed !important;
        }

        /* Skip button */
        button.rc-skip-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 48px !important;
          width: 140px !important;
          border-radius: 10px !important;
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          color: #cbd5e1 !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          white-space: nowrap !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }
        button.rc-skip-btn:hover {
          background: rgba(255,255,255,0.12) !important;
          color: white !important;
          border-color: rgba(255,255,255,0.25) !important;
        }

        /* Spinner */
        .rc-spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          animation: rcSpin 0.7s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        @keyframes rcSpin { to { transform: rotate(360deg); } }

        /* Error */
        .rc-error {
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          font-size: 13px;
          font-weight: 500;
        }

        /* Not found */
        .rc-not-found {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border-radius: 10px;
          background: rgba(250,204,21,0.07);
          border: 1px solid rgba(250,204,21,0.2);
        }
        .rc-not-found-icon { font-size: 24px; flex-shrink: 0; }
        .rc-not-found-title {
          font-size: 14px;
          font-weight: 600;
          color: #fde68a;
          margin: 0 0 4px 0;
        }
        .rc-not-found-hint {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        /* Results */
        .rc-results { display: flex; flex-direction: column; gap: 10px; }
        .rc-results-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Request card */
        .rc-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .rc-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(99,102,241,0.3);
        }
        .rc-card-info { flex: 1; min-width: 0; text-align: start; }
        .rc-card-product {
          font-size: 15px;
          font-weight: 600;
          color: white;
          margin: 0 0 6px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rc-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .rc-card-category, .rc-card-date, .rc-card-status {
          font-size: 12px;
          color: #94a3b8;
        }
        .rc-card-status { color: #86efac; }
        .rc-card-dot { font-size: 10px; color: #475569; }

        /* Reuse button */
        button.rc-reuse-btn {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 8px 14px !important;
          border-radius: 8px !important;
          background: rgba(34,197,94,0.12) !important;
          border: 1px solid rgba(34,197,94,0.3) !important;
          color: #86efac !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          flex-shrink: 0 !important;
          white-space: nowrap !important;
        }
        button.rc-reuse-btn:hover:not(:disabled) {
          background: rgba(34,197,94,0.22) !important;
          color: white !important;
        }
        button.rc-reuse-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        /* Responsive: stack on narrow screens */
        @media (max-width: 480px) {
          .rc-input-row {
            flex-wrap: wrap;
          }
          .rc-phone-input {
            flex-basis: 100%;
          }
          button.rc-search-btn, button.rc-skip-btn {
            flex: 1 !important;
            justify-content: center !important;
          }
        }
      `}} />
    </div>
  )
}
