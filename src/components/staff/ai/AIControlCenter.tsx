// src/components/staff/ai/AIControlCenter.tsx
'use client'

import { useState } from 'react'
import { EditAgentModal } from './EditAgentModal'
import { testAIAgentConfigAction } from '@/app/[locale]/staff/intelligence/ai/actions'

interface AIControlCenterProps {
  configs: any[]
  runs: any[]
  summary: any
  envStatus: any
  dict: any
  isRTL: boolean
}

function formatLogDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  // Deterministic ISO-like format: YYYY-MM-DD HH:mm:ss UTC
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function AIControlCenter({ configs, runs, summary, envStatus, dict, isRTL }: AIControlCenterProps) {
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [testingAgent, setTestingAgent] = useState<string | null>(null)

  const handleTest = async (agentCode: string) => {
    setTestingAgent(agentCode)
    try {
      const res = await testAIAgentConfigAction(agentCode)
      alert(res.message)
    } catch (err) {
      alert('Test failed')
    } finally {
      setTestingAgent(null)
    }
  }

  return (
    <div className="ai-control-center px-2 sm:px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .ai-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 24px; 
        }
        @media (min-width: 1100px) {
          .ai-grid { 
            grid-template-columns: 1fr 340px; 
          }
        }
        .config-table-container {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow-x: auto;
          margin-top: 16px;
        }
        .config-table { 
          width: 100%; 
          border-collapse: collapse; 
          min-width: 700px;
        }
        .config-table th { 
          text-align: start; 
          padding: 14px 16px; 
          border-bottom: 2px solid rgba(255, 255, 255, 0.08); 
          font-size: 0.75rem; 
          text-transform: uppercase; 
          font-weight: 800;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.05em;
        }
        .config-table td { 
          padding: 16px; 
          border-bottom: 1px solid rgba(255, 255, 255, 0.04); 
          font-size: 0.85rem; 
          color: rgba(255, 255, 255, 0.85);
          vertical-align: middle;
        }
        .log-list { display: flex; flex-direction: column; gap: 12px; }
        .log-item { 
          background: rgba(255, 255, 255, 0.02); 
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px; 
          border-radius: 16px; 
          font-size: 0.8rem; 
          transition: all 0.2s;
        }
        .log-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .status-pill { 
          padding: 4px 10px; 
          border-radius: 9999px; 
          font-size: 0.65rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 0.05em;
          display: inline-block;
          border: 1px solid transparent;
        }
        .status-ok { 
          background: rgba(16, 185, 129, 0.1); 
          color: #34d399; 
          border-color: rgba(16, 185, 129, 0.2);
        }
        .status-fail { 
          background: rgba(239, 68, 68, 0.1); 
          color: #fca7a7; 
          border-color: rgba(239, 68, 68, 0.2);
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.2s;
        }
        .stat-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
      ` }} />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{dict.ai_control.global_status}</div>
          <div className="text-xl font-black mt-2" style={{ color: envStatus.ai_enabled ? '#34d399' : '#fca7a7' }}>
            {envStatus.ai_enabled ? 'ACTIVE' : 'DISABLED'}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{dict.ai_control.enabled_agents}</div>
          <div className="text-xl font-black mt-2 text-white">{configs.filter(c => c.enabled).length} / {configs.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{dict.ai_control.runs_today}</div>
          <div className="text-xl font-black mt-2 text-purple-400">{summary.runsToday}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{dict.ai_control.cost_today}</div>
          <div className="text-xl font-black mt-2 text-emerald-400">{summary.costToday.toFixed(4)} EGP</div>
        </div>
      </div>

      <div className="ai-grid">
        <div className="stack space-y-8">
          
          {/* Agent Settings Table card */}
          <section className="bg-slate-900/20 rounded-3xl border border-white/5 p-6">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <span>⚙️</span>
              <span>{dict.ai_control.agent_settings}</span>
            </h2>
            
            <div className="config-table-container">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>{dict.ai_control.agent_name}</th>
                    <th>{dict.ai_control.enabled}</th>
                    <th>{dict.ai_control.provider}</th>
                    <th>{dict.ai_control.model}</th>
                    <th>{dict.ai_control.temperature}</th>
                    <th>{dict.common.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map(config => (
                    <tr key={config.agent_code}>
                      <td style={{ fontWeight: 900 }} className="text-white">
                        {config.agent_code.replace('_', ' ').toUpperCase()}
                      </td>
                      <td>
                        <span className={`status-pill ${config.enabled ? 'status-ok' : 'status-fail'}`}>
                          {config.enabled ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="font-semibold uppercase text-xxs tracking-wider text-slate-300">{config.provider}</td>
                      <td className="font-mono text-xs opacity-60">{config.model || '—'}</td>
                      <td className="font-bold text-slate-200">{config.temperature}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setEditingAgent(config)} 
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xxs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:text-white"
                          >
                            {dict.ai_control.edit_agent}
                          </button>
                          <button 
                            onClick={() => handleTest(config.agent_code)} 
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xxs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                            disabled={testingAgent === config.agent_code}
                          >
                            {testingAgent === config.agent_code ? '...' : dict.ai_control.test_agent}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Latest Runs Audit list card */}
          <section className="bg-slate-900/20 rounded-3xl border border-white/5 p-6">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <span>📜</span>
              <span>{dict.ai_control.latest_runs}</span>
            </h2>
            <div className="log-list mt-4">
              {runs.length > 0 ? runs.map(run => (
                <div key={run.id} className="log-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBlockEnd: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900 }} className="text-purple-300 text-xs uppercase tracking-wider">{run.agent_code.toUpperCase()}</span>
                    <span className={`status-pill ${run.status === 'completed' ? 'status-ok' : 'status-fail'}`}>{run.status}</span>
                  </div>
                  <div style={{ opacity: 0.5, display: 'flex', gap: '15px', fontSize: '0.75rem' }}>
                    <span>{run.provider} ({run.model})</span>
                    <span>{formatLogDate(run.created_at)}</span>
                    {run.staff_members?.full_name && <span>By: {run.staff_members.full_name}</span>}
                  </div>
                  {run.error_message && (
                    <div style={{ color: '#fca7a7', marginTop: '8px', fontWeight: 700, fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      {run.error_message}
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ textAlign: 'center', opacity: 0.4, padding: '24px' }}>No runs recorded yet.</div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Controls Column */}
        <aside className="stack space-y-6">
          <section className="bg-slate-900/20 rounded-3xl border border-white/5 p-6">
            <h2 className="text-base font-black text-white flex items-center space-x-2 mb-4">
              <span>🔌</span>
              <span>{dict.ai_control.provider_status}</span>
            </h2>
            <div className="stack space-y-3">
              {[
                { label: 'AI_ENABLED', value: envStatus.ai_enabled },
                { label: 'AI_PROVIDER', value: envStatus.ai_provider },
                { label: 'AI_API_KEY', value: envStatus.has_ai_key },
                { label: 'GEMINI_API_KEY', value: envStatus.has_gemini_key },
                { label: 'TAVILY_API_KEY', value: envStatus.has_tavily_key },
                { label: 'BRAVE_API_KEY', value: envStatus.has_brave_key }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ opacity: 0.6 }} className="font-mono text-white">{item.label}</span>
                  <span className={`status-pill ${item.value ? 'status-ok' : 'status-fail'}`}>
                    {item.value ? 'FOUND' : 'MISSING'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/20 rounded-3xl border border-white/5 p-6" style={{ background: 'rgba(212,166,60,0.02)', border: '1px solid rgba(212,166,60,0.1)' }}>
            <h2 className="text-base font-black text-white flex items-center space-x-2 mb-4" style={{ color: 'var(--accent)' }}>
              <span>🛡️</span>
              <span>{dict.ai_control.safety_rules}</span>
            </h2>
            <ul style={{ margin: 0, paddingInlineStart: '18px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', display: 'flex', flexDirection: 'column', gap: '10px' }} className="list-disc">
              <li>{dict.ai_control.rule_no_status}</li>
              <li>{dict.ai_control.rule_no_external}</li>
              <li>{dict.ai_control.rule_no_payment}</li>
              <li>{dict.ai_control.rule_no_unlock}</li>
              <li>{dict.ai_control.rule_no_leak}</li>
            </ul>
          </section>
        </aside>
      </div>

      {editingAgent && (
        <EditAgentModal 
          agent={editingAgent} 
          dict={dict} 
          onClose={() => setEditingAgent(null)} 
        />
      )}
    </div>
  )
}
