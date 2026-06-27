// src/components/staff/SourcingAnalysisPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { handleGetAiAnalysis, handleTriggerAiAnalysis } from '@/app/[locale]/staff/workspace/[request_id]/ai-actions'

interface SourcingAnalysisPanelProps {
  requestId: string
  locale: string
}

export function SourcingAnalysisPanel({ requestId, locale }: SourcingAnalysisPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  const fetchAnalysis = async (forceTrigger = false) => {
    setLoading(true)
    setError(null)
    try {
      if (forceTrigger) {
        const res = await handleTriggerAiAnalysis(requestId, true)
        if (res.success && res.data) {
          setAnalysis(res.data)
          triggerSavedNotice()
        } else {
          setError(res.error || 'Failed to generate analysis')
        }
      } else {
        const res = await handleGetAiAnalysis(requestId)
        if (res.success && res.data) {
          setAnalysis(res.data)
        } else {
          // If no analysis exists, automatically trigger generation
          const triggerRes = await handleTriggerAiAnalysis(requestId, false)
          if (triggerRes.success && triggerRes.data) {
            setAnalysis(triggerRes.data)
          } else {
            setError(triggerRes.error || 'Failed to generate initial analysis')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const triggerSavedNotice = () => {
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
    }, 3000)
  }

  useEffect(() => {
    fetchAnalysis(false)
  }, [requestId])

  const priorityColor = (priority: string) => {
    const p = String(priority).toUpperCase()
    if (p === 'URGENT') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (p === 'HIGH') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  const flowLabelEn = (flow: string) => {
    if (flow === 'online_only') return 'Online Only'
    if (flow === 'offline_only') return 'Field/Offline Only'
    return 'Hybrid (Online + Field)'
  }

  const flowLabelAr = (flow: string) => {
    if (flow === 'online_only') return 'بحث رقمي فقط'
    if (flow === 'offline_only') return 'بحث ميداني فقط'
    return 'بحث هجين (رقمي + ميداني)'
  }

  if (loading && !analysis) {
    return (
      <div className="w-full bg-white/5 dark:bg-slate-900/40 rounded-3xl border border-white/10 p-8 shadow-2xl animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-white/10 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-4 w-40 bg-white/10 rounded"></div>
              <div className="h-3 w-60 bg-white/10 rounded"></div>
            </div>
          </div>
          <div className="h-9 w-28 bg-white/10 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl border border-white/5"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 bg-white/5 rounded-2xl border border-white/5"></div>
          <div className="h-40 bg-white/5 rounded-2xl border border-white/5"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-900/30 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden hover:border-white/15 transition-all duration-300">
      
      {/* Top Premium Header Section */}
      <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-500/10 via-transparent to-indigo-500/10">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-xl text-indigo-300 shadow-inner flex-shrink-0">
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                AI Sourcing Analysis
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                Copilot Live
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Structured machine-learning assessment of customer requirements and strategic execution
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-center">
          {savedNotice && (
            <span className="text-xs text-emerald-400 flex items-center font-bold animate-fade-in mr-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <svg style={{ width: '14px', height: '14px' }} className="mr-1 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Saved permanently
            </span>
          )}
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/20 transition-all hover:border-white/20 active:scale-98 disabled:opacity-50 shadow-lg"
          >
            <svg style={{ width: '14px', height: '14px' }} className={loading ? 'animate-spin text-purple-400' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73"/>
            </svg>
            <span>{loading ? 'Analyzing Sourcing...' : 'Re-run Analysis'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 text-rose-300 text-xs">
          <svg style={{ width: '16px', height: '16px' }} className="text-rose-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <span className="font-bold uppercase tracking-wider">Analysis Warning:</span> {error}
          </div>
        </div>
      )}

      {analysis && (
        <div className="p-6 space-y-6">
          
          {/* Simple Elegant Micro-Cards Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Priority Card */}
            <div className="bg-white/5 hover:bg-white/[0.08] p-4 rounded-2xl border border-white/5 hover:border-white/10 flex items-center space-x-3.5 transition-all duration-200 hover:-translate-y-0.5">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 flex-shrink-0 border border-rose-500/20">
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Priority</div>
                <div className={`mt-1 inline-block text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${priorityColor(analysis.en.priority)}`}>
                  {analysis.en.priority || 'NORMAL'}
                </div>
              </div>
            </div>

            {/* Category Card */}
            <div className="bg-white/5 hover:bg-white/[0.08] p-4 rounded-2xl border border-white/5 hover:border-white/10 flex items-center space-x-3.5 transition-all duration-200 hover:-translate-y-0.5">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0 border border-indigo-500/20">
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Category</div>
                <div className="text-xs font-black text-white truncate mt-1 uppercase tracking-tight">
                  {analysis.en.category || 'General'}
                </div>
              </div>
            </div>

            {/* Budget Range Card */}
            <div className="bg-white/5 hover:bg-white/[0.08] p-4 rounded-2xl border border-white/5 hover:border-white/10 flex items-center space-x-3.5 transition-all duration-200 hover:-translate-y-0.5">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0 border border-emerald-500/20">
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Budget Range</div>
                <div className="text-xs font-black text-emerald-300 truncate mt-1 tracking-tight">
                  {analysis.en.budget_range || 'N/A'}
                </div>
              </div>
            </div>

            {/* Sourcing Flow Card */}
            <div className="bg-white/5 hover:bg-white/[0.08] p-4 rounded-2xl border border-white/5 hover:border-white/10 flex items-center space-x-3.5 transition-all duration-200 hover:-translate-y-0.5">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 flex-shrink-0 border border-purple-500/20">
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Routing Flow</div>
                <div className="text-xs font-black text-purple-300 truncate mt-1 tracking-tight">
                  {flowLabelEn(analysis.en.recommended_flow)}
                </div>
              </div>
            </div>

          </div>

          {/* Bilingual English / Arabic Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* English Sourcing Card */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col space-y-4 hover:border-white/20 transition-all">
              <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
                <svg style={{ width: '16px', height: '16px' }} className="text-indigo-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="text-xs font-black text-slate-200 tracking-tight">English Sourcing Intelligence</span>
              </div>
              
              <div className="space-y-3.5 text-xs leading-relaxed text-slate-300">
                <div>
                  <h4 className="font-extrabold text-white/50 text-[10px] uppercase tracking-wider mb-1.5">
                    Executive Summary
                  </h4>
                  <p className="bg-white/5 p-3.5 rounded-xl border border-white/5 text-slate-200 font-medium">
                    {analysis.en.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* Arabic Sourcing Card */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col space-y-4 hover:border-white/20 transition-all" dir="rtl">
              <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
                <svg style={{ width: '16px', height: '16px' }} className="text-purple-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
                </svg>
                <span className="text-xs font-black text-slate-200 tracking-tight font-sans">تحليل متطلبات التوريد باللغة العربية</span>
              </div>
              
              <div className="space-y-3.5 text-xs leading-relaxed text-slate-300 font-sans">
                <div>
                  <h4 className="font-extrabold text-white/50 text-[10px] uppercase tracking-wider mb-1.5">
                    ملخص التحليل التنفيذي
                  </h4>
                  <p className="bg-white/5 p-3.5 rounded-xl border border-white/5 text-slate-200 font-medium leading-6">
                    {analysis.ar.summary}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
