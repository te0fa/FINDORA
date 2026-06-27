'use client'

import React, { useState } from 'react'
import ConfigSimulationModal from '@/components/staff/ConfigSimulationModal'
import { simulateConfigAction, updateConfigAction } from '@/app/[locale]/staff/intelligence/economy-config/actions'

interface ConfigClientProps {
  initialConfigs: Array<{
    config_key: string
    value: any
    description_en: string | null
    is_system_controlled: boolean
  }>
}

export default function EconomyConfigClient({ initialConfigs }: ConfigClientProps) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>(null)
  const [simulation, setSimulation] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (key: string, value: any) => {
    setEditingKey(key)
    setEditValue(JSON.stringify(value, null, 2))
  }

  const handlePreview = async () => {
    if (!editingKey) return

    try {
      const parsedValue = JSON.parse(editValue)
      const oldConfig = configs.find(c => c.config_key === editingKey)
      const oldValue = oldConfig?.value

      setModalData({ configKey: editingKey, oldValue, newValue: parsedValue })
      setModalOpen(true)
      setSimulation(null) // clear previous

      const simResult = await simulateConfigAction(editingKey, oldValue, parsedValue)
      setSimulation(simResult)
    } catch (e) {
      alert('Invalid JSON formatting.')
    }
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      const res = await updateConfigAction(modalData.configKey, modalData.newValue)
      if (res.success) {
        setConfigs(configs.map(c => 
          c.config_key === modalData.configKey 
            ? { ...c, value: modalData.newValue } 
            : c
        ))
        setModalOpen(false)
        setEditingKey(null)
      } else {
        alert('Failed to save: ' + res.error)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {configs.map((config) => (
        <div key={config.config_key} className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[hsl(220,20%,12%)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{config.config_key}</h3>
              <p className="text-sm text-[hsl(220,10%,60%)]">{config.description_en}</p>
            </div>
            {config.is_system_controlled && (
              <span className="rounded bg-[hsl(0,84%,60%,0.2)] px-2 py-1 text-xs font-semibold text-[hsl(0,84%,60%)]">
                System Controlled
              </span>
            )}
          </div>

          {editingKey === config.config_key ? (
            <div className="space-y-4">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded border border-[rgba(255,255,255,0.1)] bg-black/30 p-4 font-mono text-sm text-[hsl(152,69%,51%)] outline-none focus:border-[hsl(258,89%,66%)]"
                rows={8}
              />
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  className="rounded bg-[hsl(258,89%,66%)] px-4 py-2 text-sm font-bold text-white hover:bg-[hsl(258,89%,70%)]"
                >
                  Preview Changes
                </button>
                <button
                  onClick={() => setEditingKey(null)}
                  className="rounded bg-black/30 px-4 py-2 text-sm font-bold text-white hover:bg-black/50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <pre className="mb-4 rounded bg-black/30 p-4 font-mono text-sm text-[hsl(220,15%,95%)] overflow-auto">
                {JSON.stringify(config.value, null, 2)}
              </pre>
              <button
                onClick={() => handleEdit(config.config_key, config.value)}
                className="rounded border border-[rgba(255,255,255,0.1)] bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
              >
                Edit Config
              </button>
            </div>
          )}
        </div>
      ))}

      {modalData && (
        <ConfigSimulationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
          configKey={modalData.configKey}
          oldValue={modalData.oldValue}
          newValue={modalData.newValue}
          simulation={simulation}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
