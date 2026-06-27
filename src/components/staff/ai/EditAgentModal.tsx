import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { updateAIAgentConfigAction } from '@/app/[locale]/staff/intelligence/ai/actions'

interface EditAgentModalProps {
  agent: any
  dict: any
  onClose: () => void
}

export function EditAgentModal({ agent, dict, onClose }: EditAgentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ ...agent })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateAIAgentConfigAction(formData)
      router.refresh()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev: any) => ({ ...prev, [name]: val }))
  }

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay animate-in" style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.85)', 
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 99999,
      padding: '20px'
    }}>
      <div className="modal-content glass-card animate-in" style={{
        background: '#070708', 
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', 
        width: '100%', 
        maxWidth: '500px', 
        padding: '20px 24px',
        maxHeight: '90vh', 
        overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: '16px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#fff' }}>
            {dict.ai_control.edit_agent}: <span style={{ color: 'var(--accent)' }}>{agent.agent_code.replace('_', ' ').toUpperCase()}</span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.7 }} className="hover:opacity-100">×</button>
        </header>

        <form onSubmit={handleSubmit} className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.enabled}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="enabled" checked={formData.enabled} onChange={handleChange} style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{formData.enabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.provider}</label>
              <select name="provider" value={formData.provider} onChange={handleChange} style={{ width: '100%', background: '#121214', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }}>
                <option value="disabled">Disabled</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="tavily">Tavily Search</option>
                <option value="brave_search">Brave Search</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.model}</label>
              <input type="text" name="model" value={formData.model || ''} onChange={handleChange} placeholder="gpt-4, gemini-1.5-pro..." style={{ width: '100%', background: '#121214', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }} />
            </div>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.temperature}</label>
              <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} style={{ width: '100%', background: '#121214', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.daily_limit}</label>
              <input type="number" name="daily_limit" value={formData.daily_limit} onChange={handleChange} style={{ width: '100%', background: '#121214', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }} />
            </div>
            <div className="field-box" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label className="field-label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBlockEnd: '2px' }}>{dict.ai_control.safety_level}</label>
              <select name="safety_level" value={formData.safety_level} onChange={handleChange} style={{ width: '100%', background: '#121214', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }}>
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', opacity: 0.5, letterSpacing: '0.05em' }}>Permissions</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
                <input type="checkbox" name="allow_create_draft" checked={formData.allow_create_draft} onChange={handleChange} style={{ width: '12px', height: '12px' }} />
                {dict.ai_control.allow_draft}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
                <input type="checkbox" name="allow_create_research_items" checked={formData.allow_create_research_items} onChange={handleChange} style={{ width: '12px', height: '12px' }} />
                {agent.agent_code === 'intake_reviewer' ? dict.ai_control.allow_image_analysis : dict.ai_control.allow_research}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', gridColumn: '1 / -1' }}>
                <input type="checkbox" name="allow_suggest_report_snapshots" checked={formData.allow_suggest_report_snapshots} onChange={handleChange} style={{ width: '12px', height: '12px' }} />
                {dict.ai_control.allow_snapshots}
              </label>
            </div>
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBlockStart: '12px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-500 transition-all shadow-md shadow-amber-900/10 active:scale-98" 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Config'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}
