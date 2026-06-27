'use client'

import React from 'react'

interface ConfigSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  configKey: string
  oldValue: any
  newValue: any
  simulation: {
    impactPct: number
    description: string
    warningLevel: 'none' | 'low' | 'high'
  } | null
  isSaving: boolean
}

export default function ConfigSimulationModal({
  isOpen,
  onClose,
  onConfirm,
  configKey,
  oldValue,
  newValue,
  simulation,
  isSaving
}: ConfigSimulationModalProps) {
  if (!isOpen) return null

  const getWarningColor = (level: string) => {
    if (level === 'high') return 'text-[hsl(0,84%,60%)] border-[hsl(0,84%,60%)]'
    if (level === 'low') return 'text-[hsl(43,96%,56%)] border-[hsl(43,96%,56%)]'
    return 'text-[hsl(152,69%,51%)] border-[hsl(152,69%,51%)]'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[rgba(255,255,255,0.1)] bg-[hsl(220,20%,12%)] p-6 shadow-2xl">
        
        <h2 className="mb-2 text-xl font-bold text-[hsl(220,15%,95%)]">Review System Change</h2>
        <p className="mb-6 text-sm text-[hsl(220,10%,60%)]">
          You are modifying <code className="text-white bg-black/30 px-1 rounded">{configKey}</code>. 
          Please review the projected impact before applying to the live system.
        </p>

        {/* Diff View */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded border border-[rgba(255,255,255,0.05)] bg-black/20 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(220,10%,60%)]">Old Value</h3>
            <pre className="text-xs text-red-400 overflow-auto">
              {JSON.stringify(oldValue, null, 2)}
            </pre>
          </div>
          <div className="rounded border border-[rgba(255,255,255,0.05)] bg-black/20 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(220,10%,60%)]">New Value</h3>
            <pre className="text-xs text-green-400 overflow-auto">
              {JSON.stringify(newValue, null, 2)}
            </pre>
          </div>
        </div>

        {/* Simulation Results */}
        {simulation ? (
          <div className={`mb-6 rounded-lg border-l-4 p-4 bg-black/30 ${getWarningColor(simulation.warningLevel)}`}>
            <h3 className="mb-1 text-sm font-bold uppercase">Impact Projection</h3>
            <p className="text-sm opacity-90">{simulation.description}</p>
          </div>
        ) : (
          <div className="mb-6 animate-pulse text-sm text-[hsl(220,10%,60%)]">
            Running simulation...
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded bg-black/30 px-4 py-2 text-sm font-medium text-white hover:bg-black/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving || !simulation}
            className="rounded bg-[hsl(258,89%,66%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(258,89%,70%)] disabled:opacity-50"
          >
            {isSaving ? 'Applying...' : 'Apply to Live System'}
          </button>
        </div>

      </div>
    </div>
  )
}
