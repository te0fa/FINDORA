'use client'

import React, { useState } from 'react'

export default function GrowthEngineSimulator({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const [runningDetector, setRunningDetector] = useState(false)
  const [runningRecycler, setRunningRecycler] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  const triggerTrendDetector = async () => {
    setRunningDetector(true)
    addLog('Triggering Trend Detector AI...')
    try {
      const res = await fetch('/api/cron/trend-detector')
      const data = await res.json()
      addLog(`Trend Detector finished: ${data.message}`)
      if (data.newTasksGenerated > 0) {
        addLog(`SUCCESS: ${data.newTasksGenerated} new proactive tasks created!`)
      }
    } catch (e) {
      addLog('Error running Trend Detector')
    } finally {
      setRunningDetector(false)
    }
  }

  const triggerTaskRecycler = async () => {
    setRunningRecycler(true)
    addLog('Triggering Task Recycler...')
    try {
      const res = await fetch('/api/cron/task-recycler')
      const data = await res.json()
      addLog(`Task Recycler finished: ${data.message}`)
      if (data.recycledCount > 0) {
        addLog(`SUCCESS: ${data.recycledCount} stale tasks boosted and recycled!`)
      }
    } catch (e) {
      addLog('Error running Task Recycler')
    } finally {
      setRunningRecycler(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[hsl(258,89%,66%,0.5)] bg-[hsl(220,20%,12%)] p-6 shadow-2xl mt-8">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        ⚙️ {isAr ? 'محاكي محرك النمو (للاختبار)' : 'Growth Engine Simulator (Testing)'}
      </h2>
      <p className="text-[hsl(220,10%,60%)] mb-6 text-sm">
        {isAr 
          ? 'في النسخة النهائية ستعمل هذه الوظائف تلقائياً عبر خدمات CRON. اضغط هنا لاختبارها يدوياً الآن.'
          : 'In production, these functions run automatically via CRON services. Click here to test them manually.'}
      </p>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <button 
          onClick={triggerTrendDetector}
          disabled={runningDetector}
          className="rounded-lg bg-[hsl(258,89%,66%,0.2)] border border-[hsl(258,89%,66%)] py-3 px-4 font-bold text-[hsl(258,89%,66%)] transition hover:bg-[hsl(258,89%,66%,0.3)] disabled:opacity-50"
        >
          {runningDetector ? 'Running AI...' : '🔍 Trigger Trend Detector'}
        </button>
        
        <button 
          onClick={triggerTaskRecycler}
          disabled={runningRecycler}
          className="rounded-lg bg-[hsl(43,96%,56%,0.2)] border border-[hsl(43,96%,56%)] py-3 px-4 font-bold text-[hsl(43,96%,56%)] transition hover:bg-[hsl(43,96%,56%,0.3)] disabled:opacity-50"
        >
          {runningRecycler ? 'Recycling...' : '♻️ Trigger Task Recycler'}
        </button>
      </div>

      <div className="bg-black/60 rounded-xl p-4 min-h-[150px] font-mono text-xs text-[hsl(152,69%,51%)] border border-white/5">
        <div className="text-slate-500 mb-2">// System Logs</div>
        {logs.map((log, idx) => (
          <div key={idx} className="mb-1">{log}</div>
        ))}
        {logs.length === 0 && <div className="text-slate-600">Waiting for triggers...</div>}
      </div>
    </div>
  )
}
