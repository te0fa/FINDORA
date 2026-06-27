'use client'

import { useState } from 'react'
import { sendRecoveryOtp, verifyRecoveryOtp } from './actions'
import RequestHeader from '@/components/RequestHeader'
import Link from 'next/link'

type Props = {
  dict: any
  locale: string
  isRTL: boolean
}

type Step = 'phone' | 'otp' | 'results'

export default function RecoverRequestsForm({ dict, locale, isRTL }: Props) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const res = await sendRecoveryOtp(phone)
    setIsPending(false)

    if (res.error) {
      setError(res.error)
    } else {
      setStep('otp')
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const res = await verifyRecoveryOtp(phone, otp)
    setIsPending(false)

    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setResults(res.data)
      setStep('results')
    }
  }

  const phoneStep = (
    <form onSubmit={handleSendOtp} className="track-form animate-fade-in">
      <div className="input-stack">
        <div className="form-group">
          <label className="label">{dict.recover_requests.phone_field}</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={dict.recover_requests.phone_placeholder}
            className="input centered large"
            data-testid="recover-phone-input"
          />
        </div>
      </div>

      {error && <div className="error-box animate-shake">{error === 'invalid_phone' ? dict.recover_requests.invalid_phone : error}</div>}

      <button
        type="submit"
        disabled={isPending}
        className={`submit-btn ${isPending ? 'pending' : ''}`}
        data-testid="recover-send-code"
      >
        {isPending ? dict.common.loading : dict.recover_requests.send_code}
      </button>
    </form>
  )

  const otpStep = (
    <form onSubmit={handleVerifyOtp} className="track-form animate-fade-in">
      <div className="input-stack">
        <div className="form-group">
          <label className="label">{dict.recover_requests.otp_field}</label>
          <input
            required
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder={dict.recover_requests.otp_placeholder}
            className="input centered large"
            maxLength={6}
            data-testid="recover-otp-input"
          />
        </div>
      </div>

      {error && <div className="error-box animate-shake">{dict.recover_requests.invalid_otp}</div>}

      <button
        type="submit"
        disabled={isPending}
        className={`submit-btn ${isPending ? 'pending' : ''}`}
        data-testid="recover-verify-code"
      >
        {isPending ? dict.common.loading : dict.recover_requests.verify_button}
      </button>

      <button
        type="button"
        onClick={() => setStep('phone')}
        className="text-btn"
      >
        {dict.recover_requests.back_to_phone}
      </button>
    </form>
  )

  const resultsStep = (
    <div className="results-container animate-fade-in" data-testid="recover-results">
      <h2 className="results-title">{dict.recover_requests.results_title}</h2>

      {results.length === 0 ? (
        <div className="empty-box">{dict.recover_requests.no_requests}</div>
      ) : (
        <div className="results-grid">
          {results.map((req) => (
            <div key={req.request_id} className="request-card" data-request-id={req.request_id}>
              <div className="card-header">
                <span className="card-code">{req.request_code}</span>
                <span className="card-status">{req.customer_visible_status}</span>
              </div>
              <h3 className="card-title">{req.title}</h3>
              <p className="card-date">{formatDate(req.request_created_at)}</p>
              <Link href={`/${locale}/track-request?code=${encodeURIComponent(req.request_code)}&phone=${encodeURIComponent(phone)}`} className="track-link">
                {dict.recover_requests.open_tracking}
              </Link>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => { setStep('phone'); setOtp(''); }}
        className="submit-btn secondary"
        style={{ marginTop: '32px' }}
      >
        {dict.recover_requests.back_to_phone}
      </button>
    </div>
  )

  return (
    <main className="page-container" dir={isRTL ? 'rtl' : 'ltr'} data-testid="recover-requests-page">
      <RequestHeader locale={locale} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .page-container {
          min-height: 100vh;
          padding: 220px 24px 100px;
          background: #020617;
          color: #fff;
          position: relative;
          font-family: inherit;
        }

        .background-decor {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
        }

        .orb-1 { top: -10%; right: 10%; width: 600px; height: 600px; background: #3b82f6; opacity: 0.15; }
        .orb-2 { bottom: -10%; left: 10%; width: 700px; height: 700px; background: #d4a63c; opacity: 0.1; }

        .content-container {
          max-width: 720px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .header-stack {
          text-align: center;
          margin-bottom: 64px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .page-title {
          font-size: 5rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 0.9;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .page-desc {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .glass-container {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 40px;
          padding: 64px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
        }

        .track-form {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .input-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .label {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 0.4);
          margin-inline-start: 4px;
        }

        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 20px;
          padding: 20px 24px;
          color: #fff !important;
          font-size: 1.1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .input.centered {
          text-align: center;
        }

        .input.large {
          font-size: 1.75rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          color: #d4a63c !important;
        }

        .input:focus {
          background: rgba(255, 255, 255, 0.07) !important;
          border-color: #d4a63c !important;
          box-shadow: 0 0 0 4px rgba(212, 166, 60, 0.15);
        }

        .submit-btn {
          width: 100%;
          padding: 24px;
          background: #fff;
          color: #000 !important;
          border: none;
          border-radius: 24px;
          font-size: 1.25rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
          background: #f8fafc;
        }

        .submit-btn.pending {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3) !important;
        }

        .submit-btn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff !important;
        }

        .text-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          margin-top: -16px;
        }

        .error-box {
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 20px;
          color: #ef4444;
          text-align: center;
          font-weight: 700;
        }

        /* RESULTS STYLING */
        .results-title {
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 32px;
          text-align: center;
          color: #d4a63c;
        }

        .results-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .request-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 24px;
          transition: transform 0.3s ease;
        }

        .request-card:hover {
          transform: scale(1.02);
          background: rgba(255, 255, 255, 0.05);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card-code {
          font-weight: 900;
          color: #d4a63c;
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .card-status {
          font-size: 0.75rem;
          font-weight: 800;
          background: rgba(212, 166, 60, 0.15);
          color: #d4a63c;
          padding: 4px 12px;
          border-radius: 8px;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .card-date {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .track-link {
          display: inline-block;
          color: #3b82f6;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .track-link:hover {
          border-color: #3b82f6;
        }

        .empty-box {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
          font-style: italic;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.4s ease;
        }

        @media (max-width: 768px) {
          .page-container { padding-top: 160px; }
          .page-title { font-size: 3.5rem; }
          .glass-container { padding: 40px 24px; border-radius: 32px; }
        }
      `,
        }}
      />

      <div className="background-decor">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="content-container">
        <div className="header-stack animate-fade-in">
          <h1 className="page-title">{dict.recover_requests.title}</h1>
          <p className="page-desc">{dict.recover_requests.desc}</p>
        </div>

        <div className="glass-container animate-fade-in">
          {step === 'phone' && phoneStep}
          {step === 'otp' && otpStep}
          {step === 'results' && resultsStep}
        </div>
      </div>
    </main>
  )
}
