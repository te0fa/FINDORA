'use client'

import React, { useState, useEffect } from 'react'

export function AiAgentControlPanel({ isRTL }: { isRTL: boolean }) {
  const [provider, setProvider] = useState('tavily')
  const [model, setModel] = useState('gpt-4o')
  const [priority, setPriority] = useState('normal')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_agent_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.provider) setProvider(parsed.provider)
        if (parsed.model) setModel(parsed.model)
        if (parsed.priority) setPriority(parsed.priority)
      } catch (e) {}
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setShowSuccess(false)
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 600))
    
    localStorage.setItem('ai_agent_settings', JSON.stringify({ provider, model, priority }))
    
    setIsSaving(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <section className="section-card glass-card" style={{ border: '1px solid rgba(212,166,60,0.3)', background: 'linear-gradient(145deg, rgba(212,166,60,0.05) 0%, rgba(0,0,0,0.2) 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🤖</span>
        <h2 className="card-title-text" style={{ margin: 0, color: 'var(--accent)' }}>
          {isRTL ? 'إعدادات التحكم في ذكاء الأعمال (AI Agents)' : 'AI Agent Control Center'}
        </h2>
      </div>
      
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: 1.5 }}>
        {isRTL 
          ? 'تحكم مركزي في إعدادات ومحركات البحث الخاصة بـ AI. هذه الإعدادات تطبق على جميع الطلبات التلقائية الجديدة في النظام.' 
          : 'Central control for AI research engines and settings. These settings apply globally to all new automated requests.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Agent Provider */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'white' }}>
            {isRTL ? 'محرك البحث الأساسي (Agent Provider)' : 'Primary Search Engine'}
          </label>
          <select 
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}
          >
            <option value="tavily" style={{ color: 'black' }}>Tavily (Optimized for AI Agents)</option>
            <option value="google_custom_search" style={{ color: 'black' }}>Google Custom Search Engine</option>
            <option value="brave_search" style={{ color: 'black' }}>Brave Search API</option>
          </select>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            {isRTL 
              ? 'يحدد الأداة التي سيستخدمها الـ AI لجلب العروض من الإنترنت. Tavily هو الأسرع ومصمم للذكاء الاصطناعي.' 
              : 'Determines the tool the AI uses to fetch offers from the internet. Tavily is optimized for agentic workflows.'}
          </div>
        </div>

        {/* Model */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'white' }}>
            {isRTL ? 'نموذج الذكاء الاصطناعي (LLM Model)' : 'Intelligence Model'}
          </label>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}
          >
            <option value="gpt-4o" style={{ color: 'black' }}>GPT-4o (OpenAI - Fastest & Most accurate)</option>
            <option value="gemini-1.5-pro" style={{ color: 'black' }}>Gemini 1.5 Pro (Google - Excellent context)</option>
            <option value="claude-3-5-sonnet" style={{ color: 'black' }}>Claude 3.5 Sonnet (Anthropic - Strong reasoning)</option>
          </select>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            {isRTL 
              ? 'العقل المدبر الذي سيقوم بتحليل نتائج البحث واتخاذ القرارات.' 
              : 'The "brain" that will analyze search results and make decisions.'}
          </div>
        </div>

        {/* Priority */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'white' }}>
            {isRTL ? 'أولوية التنفيذ (Execution Priority)' : 'Execution Priority'}
          </label>
          <select 
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}
          >
            <option value="high" style={{ color: 'black' }}>High (Real-time blocking execution)</option>
            <option value="normal" style={{ color: 'black' }}>Normal (Background async execution)</option>
            <option value="batch" style={{ color: 'black' }}>Batch (Overnight processing)</option>
          </select>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            {isRTL 
              ? 'التحكم في سرعة التنفيذ والتكلفة. Normal ينفذ العمليات في الخلفية بدون تعطيل الموظف.' 
              : 'Controls speed and cost. Normal runs asynchronously without blocking staff operations.'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-accent"
            style={{ 
              background: 'var(--accent)', 
              color: 'black', 
              fontWeight: 900, 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
          </button>
          
          {showSuccess && (
            <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>
              {isRTL ? '✅ تم حفظ الإعدادات بنجاح!' : '✅ Settings saved successfully!'}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
