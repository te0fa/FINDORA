'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTrackResult } from './actions'
import RequestHeader from '@/components/RequestHeader'

type Props = {
  dict: any
  locale: string
  isRTL: boolean
  initialCode?: string
  initialPhone?: string
}

export default function TrackRequestForm({
  dict,
  locale,
  isRTL,
  initialCode,
  initialPhone,
}: Props) {
  const [state, formAction, isPending] = useActionState(getTrackResult, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (initialCode && initialPhone && formRef.current) {
      const timer = setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [initialCode, initialPhone])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'

    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const resultView = state?.success && state.data && (
    <div className="track-result-container animate-fade-in" data-testid="track-result">
      <div className="track-result-header">
        <div className="track-result-code-wrap">
          <p className="track-meta-label">{dict.track_request.result_code}</p>
          <h2 className="track-result-code">{state.data.request_code}</h2>
        </div>

        <div className="track-status-badge-wrap">
          <p className="track-meta-label">{dict.track_request.status_label}</p>
          <span className="track-status-badge" data-testid="track-result-status">
            {state.data.customer_visible_status}
          </span>
        </div>
      </div>

      <div className="track-card-detail">
        <h3 className="track-card-title">{state.data.title}</h3>

        <div className="track-metrics-stack">
          <div className="track-progress-group">
            <div className="track-progress-info">
              <span className="track-progress-label">
                {dict.track_request.progress_label}
              </span>
              <span className="track-progress-value">
                {state.data.pipeline_completion_pct || 0}%
              </span>
            </div>

            <div className="track-progress-track">
              <div
                className="track-progress-fill"
                style={{ width: `${state.data.pipeline_completion_pct || 0}%` }}
              />
            </div>
          </div>

          <div className="track-timestamps-grid">
            <div className="track-timestamp-item">
              <p className="track-tiny-label">{dict.track_request.created_label}</p>
              <p className="track-timestamp-val">
                {formatDate(state.data.request_created_at)}
              </p>
            </div>

            <div className="track-timestamp-item">
              <p className="track-tiny-label">{dict.track_request.updated_label}</p>
              <p className="track-timestamp-val">
                {formatDate(state.data.request_updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const formView = (
    <form
      ref={formRef}
      action={formAction}
      className="track-form"
      data-testid="track-request-form"
    >
      <div className="track-input-stack">
        <div className="track-form-group">
          <label className="track-label">{dict.track_request.code_field}</label>
          <input
            required
            name="request_code"
            defaultValue={initialCode}
            placeholder={dict.track_request.code_placeholder}
            className="track-input track-input-centered track-input-large"
            data-testid="track-code-input"
          />
        </div>

        <div className="track-form-group">
          <label className="track-label">{dict.track_request.phone_field}</label>
          <input
            required
            type="tel"
            name="phone_number"
            defaultValue={initialPhone}
            placeholder={dict.track_request.phone_placeholder}
            className="track-input"
            data-testid="track-phone-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`track-submit-btn ${isPending ? 'pending' : ''}`}
        data-testid="track-submit"
      >
        {isPending ? dict.common.loading : dict.track_request.track_button}
      </button>

      {state?.error && (
        <div className="track-error-box animate-shake">
          {state.error === 'not_found' ? dict.track_request.not_found : dict.common.error}
        </div>
      )}
    </form>
  )

  return (
    <main
      className="track-page-container"
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="track-request-page"
    >
      <RequestHeader locale={locale} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .track-page-container {
              min-height: 100dvh;
              height: auto;
              padding: 220px 24px 100px;
              background: #020617;
              color: white;
              position: relative;
              overflow-x: hidden !important;
              overflow-y: visible !important;
              font-family: inherit;
              box-sizing: border-box;
            }

            .track-background-decor {
              position: fixed;
              inset: 0;
              pointer-events: none;
              z-index: 0;
              overflow: hidden;
            }

            .track-orb {
              position: absolute;
              border-radius: 50%;
              filter: blur(120px);
              opacity: 0.2;
            }

            .track-orb-1 {
              top: -10%;
              right: 10%;
              width: 600px;
              height: 600px;
              background: #3b82f6;
              opacity: 0.15;
            }

            .track-orb-2 {
              bottom: -10%;
              left: 10%;
              width: 700px;
              height: 700px;
              background: #d4a63c;
              opacity: 0.1;
            }

            .track-content-container {
              width: 100%;
              max-width: 720px;
              margin: 0 auto;
              position: relative;
              z-index: 10;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              box-sizing: border-box;
            }

            .track-tabs {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 28px;
              flex-wrap: wrap;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }

            .track-tab {
              padding: 12px 18px;
              border-radius: 14px;
              text-decoration: none;
              font-weight: 800;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.1);
              color: rgba(255,255,255,0.82);
              transition: all 0.2s ease;
              white-space: nowrap;
            }

            .track-tab:hover {
              border-color: #d4a63c;
              color: #fff;
            }

            .track-tab.active {
              background: rgba(212,166,60,0.14);
              border-color: rgba(212,166,60,0.35);
              color: #d4a63c;
            }

            .track-header-stack {
              text-align: center;
              margin-bottom: 72px;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }

            .track-page-title {
              font-size: clamp(3rem, 10vw, 5rem);
              font-weight: 900;
              margin-bottom: 24px;
              letter-spacing: -0.05em;
              line-height: 1;
              color: #fff;
            }

            .track-page-desc {
              font-size: 1.25rem;
              color: rgba(255, 255, 255, 0.6);
              font-weight: 500;
              line-height: 1.6;
              margin: 0;
            }

            .track-glass-container {
              width: 100%;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              background: rgba(255, 255, 255, 0.02);
              backdrop-filter: blur(32px);
              -webkit-backdrop-filter: blur(32px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 40px;
              padding: 64px;
              box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
              box-sizing: border-box;
            }

            .track-inner-stack {
              display: flex;
              flex-direction: column;
              gap: 32px;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              box-sizing: border-box;
            }

            .track-form,
            .track-result-container,
            .track-recover-card,
            .track-card-detail {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              box-sizing: border-box;
            }

            .track-form {
              display: flex;
              flex-direction: column;
              gap: 40px;
            }

            .track-input-stack {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }

            .track-form-group {
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin: 0;
            }

            .track-label {
              display: block;
              font-size: 0.8rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: rgba(255, 255, 255, 0.4);
              margin-inline-start: 4px;
              margin-block-end: 0;
            }

            .track-input {
              width: 100%;
              background: rgba(255, 255, 255, 0.04) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              border-radius: 18px;
              padding: 20px 24px;
              color: #fff !important;
              font-size: 1.1rem;
              font-weight: 600;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              outline: none;
              box-sizing: border-box;
            }

            .track-input-centered {
              text-align: center;
            }

            .track-input-large {
              font-size: 1.75rem;
              font-weight: 900;
              letter-spacing: 0.1em;
              color: #d4a63c !important;
            }

            .track-input:focus {
              background: rgba(255, 255, 255, 0.07) !important;
              border-color: #d4a63c !important;
              box-shadow: 0 0 0 4px rgba(212, 166, 60, 0.15);
            }

            .track-submit-btn {
              width: 100%;
              padding: 24px;
              background: #fff;
              color: #000 !important;
              border: none;
              border-radius: 24px;
              font-size: 1.5rem;
              font-weight: 900;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 20px 40px rgba(0,0,0,0.4);
              display: inline-flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
            }

            .track-submit-btn:hover:not(:disabled) {
              transform: translateY(-3px);
              box-shadow: 0 25px 50px rgba(0,0,0,0.5);
              background: #f8fafc;
            }

            .track-submit-btn.pending {
              background: rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.3) !important;
            }

            .track-error-box {
              padding: 20px;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-radius: 20px;
              color: #ef4444;
              text-align: center;
              font-weight: 700;
            }

            .track-recover-card {
              margin-top: 20px;
              padding: 24px;
              border-radius: 24px;
              background: rgba(255,255,255,0.025);
              border: 1px solid rgba(255,255,255,0.08);
              text-align: center;
            }

            .track-recover-card-title {
              font-size: 1.15rem;
              font-weight: 900;
              color: #fff;
              margin-bottom: 10px;
            }

            .track-recover-card-desc {
              font-size: 0.98rem;
              color: rgba(255,255,255,0.62);
              line-height: 1.6;
              margin-bottom: 16px;
            }

            .track-recover-card-link {
              display: inline-block;
              padding: 12px 18px;
              border-radius: 14px;
              text-decoration: none;
              font-weight: 900;
              background: rgba(212,166,60,0.14);
              border: 1px solid rgba(212,166,60,0.35);
              color: #d4a63c;
            }

            .track-result-container {
              padding-top: 64px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              flex-direction: column;
              gap: 48px;
            }

            .track-result-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 24px;
            }

            .track-result-code-wrap {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .track-status-badge-wrap {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 8px;
            }

            .track-meta-label {
              font-size: 0.8rem;
              font-weight: 800;
              text-transform: uppercase;
              color: rgba(255, 255, 255, 0.4);
              margin: 0;
            }

            .track-result-code {
              font-size: 2.75rem;
              font-weight: 900;
              color: #d4a63c;
              letter-spacing: -0.02em;
              line-height: 1;
              margin: 0;
            }

            .track-status-badge {
              padding: 12px 24px;
              background: rgba(212, 166, 60, 0.15);
              border: 1px solid rgba(212, 166, 60, 0.3);
              color: #d4a63c;
              border-radius: 12px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .track-card-detail {
              background: rgba(255, 255, 255, 0.015);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 32px;
              padding: 48px;
            }

            .track-card-title {
              font-size: 1.75rem;
              font-weight: 700;
              margin-bottom: 40px;
              color: #fff;
            }

            .track-metrics-stack {
              display: flex;
              flex-direction: column;
              gap: 40px;
            }

            .track-progress-group {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .track-progress-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 18px;
            }

            .track-progress-label {
              font-size: 0.85rem;
              font-weight: 800;
              text-transform: uppercase;
              color: rgba(255, 255, 255, 0.4);
            }

            .track-progress-value {
              font-size: 1.5rem;
              font-weight: 900;
              color: #d4a63c;
            }

            .track-progress-track {
              height: 16px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .track-progress-fill {
              height: 100%;
              background: #d4a63c;
              box-shadow: 0 0 20px rgba(212, 166, 60, 0.4);
              transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .track-timestamps-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
              padding-top: 32px;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .track-timestamp-item {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .track-tiny-label {
              font-size: 0.7rem;
              font-weight: 800;
              text-transform: uppercase;
              color: rgba(255, 255, 255, 0.35);
              margin: 0;
            }

            .track-timestamp-val {
              font-size: 1.1rem;
              font-weight: 700;
              margin: 0;
            }

            @keyframes trackFadeIn {
              from {
                opacity: 0;
                transform: translateY(15px);
              }

              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .animate-fade-in {
              animation: trackFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            @keyframes trackShake {
              0%, 100% {
                transform: translateX(0);
              }

              25% {
                transform: translateX(-5px);
              }

              75% {
                transform: translateX(5px);
              }
            }

            .animate-shake {
              animation: trackShake 0.4s ease;
            }

            @media (max-width: 1024px) {
              .track-glass-container {
                padding: 48px 32px;
              }
            }

            @media (max-width: 768px) {
              .track-page-container {
                min-height: 100dvh;
                height: auto;
                padding: 150px 16px 80px;
                overflow-x: hidden !important;
                overflow-y: visible !important;
              }

              .track-content-container {
                max-width: 100%;
                overflow: visible !important;
              }

              .track-page-title {
                font-size: clamp(2.4rem, 12vw, 3.5rem);
              }

              .track-page-desc {
                font-size: 1.05rem;
              }

              .track-header-stack {
                margin-bottom: 44px;
              }

              .track-glass-container {
                padding: 32px 18px;
                border-radius: 28px;
                overflow: visible !important;
              }

              .track-tabs {
                margin-bottom: 22px;
              }

              .track-tab {
                flex: 1 1 auto;
                text-align: center;
              }

              .track-input-large {
                font-size: 1.35rem;
              }

              .track-submit-btn {
                font-size: 1.15rem;
                padding: 20px;
              }

              .track-result-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }

              .track-status-badge-wrap {
                align-items: center;
              }

              .track-card-detail {
                padding: 28px 18px;
              }

              .track-timestamps-grid {
                grid-template-columns: 1fr;
                gap: 20px;
              }
            }
          `,
        }}
      />

      <div className="track-background-decor">
        <div className="track-orb track-orb-1" />
        <div className="track-orb track-orb-2" />
      </div>

      <div className="track-content-container">
        <div className="track-tabs animate-fade-in">
          <Link href={`/${locale}/track-request`} className="track-tab active">
            {dict.track_request.tab_with_code}
          </Link>

          <Link href={`/${locale}/recover-requests`} className="track-tab">
            {dict.track_request.tab_forgot_code}
          </Link>
        </div>

        <div className="track-header-stack animate-fade-in">
          <h1 className="track-page-title">{dict.track_request.title}</h1>
          <p className="track-page-desc">{dict.track_request.desc}</p>
        </div>

        <div className="track-glass-container animate-fade-in">
          <div className="track-inner-stack">
            {formView}

            <div className="track-recover-card animate-fade-in">
              <p className="track-recover-card-title">
                {dict.track_request.recover_card_title}
              </p>

              <p className="track-recover-card-desc">
                {dict.track_request.recover_card_desc}
              </p>

              <Link href={`/${locale}/recover-requests`} className="track-recover-card-link">
                {dict.track_request.recover_card_cta}
              </Link>
            </div>

            {resultView}
          </div>
        </div>
      </div>
    </main>
  )
}