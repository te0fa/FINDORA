'use client'

import React, { useState } from 'react'
import { handleRunResearchRetrieval, handleSaveResearchCandidate } from '@/app/[locale]/staff/workspace/[request_id]/ai-actions'

interface Props {
  requestId: string
  dict: any
  isRTL: boolean
}

export function AIResearchRetrievalPanel({ requestId, dict, isRTL }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState('google_custom_search')
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<string[]>([])

  const onRunRetrieval = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res: any = await handleRunResearchRetrieval({ request_id: requestId, provider })
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setResults(res.data)
      } else {
        setError('No data returned from AI.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const onSave = async (candidate: any) => {
    try {
      const res = await handleSaveResearchCandidate({ request_id: requestId, candidate })
      if (res.success) {
        setSavedIds(prev => [...prev, candidate.url])
      }
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <section className="section-card glass-card" id="ai-research-retrieval">
      <div className="card-title-row">
        <h2 className="card-title-text" style={{ fontSize: '1.25rem' }}>
          <span>🤖</span>
          {isRTL ? 'بحث AI عن المصادر' : 'AI Research Retrieval'}
        </h2>
        <select 
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="btn-secondary"
          style={{ 
            fontSize: '0.8rem', 
            padding: '0.4rem 0.8rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: '8px'
          }}
        >
          <option value="google_custom_search" style={{ color: 'black' }}>Google CSE</option>
          <option value="tavily" style={{ color: 'black' }}>Tavily</option>
          <option value="brave_search" style={{ color: 'black' }}>Brave Search</option>
          <option value="gemini_analysis_only" style={{ color: 'black' }}>Gemini (Analytic Only)</option>
        </select>
      </div>

      <div style={{ marginBlockEnd: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBlockEnd: '1rem', lineHeight: 1.5 }}>
          {isRTL 
            ? 'سيقوم هذا الإجراء بالبحث في مصادر خارجية عن المنتجات أو الموردين بناءً على تفاصيل الطلب.' 
            : 'This action will search external sources for products, sellers, or suppliers based on request details.'}
        </p>
        <button 
          onClick={onRunRetrieval} 
          disabled={isLoading}
          className="btn-accent"
          style={{ 
            width: '100%', 
            background: 'var(--accent)', 
            color: 'black', 
            fontWeight: 900,
            padding: '0.75rem',
            borderRadius: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'بدء البحث الذكي' : 'Run Smart Retrieval')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBlockEnd: '1.5rem', fontSize: '0.85rem', padding: '1rem', borderRadius: '12px' }}>
          {error}
        </div>
      )}

      {results && (
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(212,166,60,0.1)', borderRadius: '12px', border: '1px solid rgba(212,166,60,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', marginBlockEnd: '0.5rem', letterSpacing: '0.05em' }}>
              {isRTL ? 'ملخص البحث' : 'Research Summary'}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'white', margin: 0, lineHeight: 1.6 }}>{results.summary}</p>
          </div>

          <div className="finding-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {results.candidates?.map((c: any, idx: number) => (
              <div 
                key={idx} 
                className="item-box" 
                style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  border: savedIds.includes(c.url) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                  padding: '1rem',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="badge badge-muted" style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem' }}>{c.provider}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: c.source_confidence > 70 ? '#4ade80' : '#fbbf24' }}>
                    {c.source_confidence}% Match
                  </div>
                </div>
                <a href={c.url} target="_blank" className="item-link" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)', textDecoration: 'none' }}>
                  {c.title}
                </a>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
                  {c.why_relevant}
                </p>
                
                {c.risks && c.risks.length > 0 && (
                   <div style={{ fontSize: '0.65rem', color: '#f87171', fontStyle: 'italic' }}>
                      ⚠️ {c.risks.join(', ')}
                   </div>
                )}
                
                <div style={{ marginBlockStart: 'auto', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => onSave(c)}
                    disabled={savedIds.includes(c.url)}
                    className="btn-secondary"
                    style={{ 
                      flex: 1, 
                      fontSize: '0.7rem', 
                      padding: '0.5rem', 
                      borderRadius: '8px',
                      background: savedIds.includes(c.url) ? 'rgba(212,166,60,0.2)' : 'rgba(255,255,255,0.05)',
                      color: savedIds.includes(c.url) ? 'var(--accent)' : 'white',
                      border: 'none',
                      cursor: savedIds.includes(c.url) ? 'default' : 'pointer'
                    }}
                  >
                    {savedIds.includes(c.url) ? (isRTL ? 'تم الحفظ كمسودة' : 'Saved as Draft') : (isRTL ? 'حفظ كمسودة' : 'Save as Draft')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBlockStart: '1.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 600 }}>
        {isRTL 
          ? 'تنبيه: نتائج AI استرشادية فقط وتطلب مراجعة من الموظف قبل اعتمادها.' 
          : 'NOTICE: AI results are for guidance only and require staff review before use.'}
      </div>
    </section>
  )
}
