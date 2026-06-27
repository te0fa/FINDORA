'use client'

import React, { useState } from 'react'
import { useLiveEditor } from './LiveEditorContext'
import { updatePageContent } from '@/lib/cms/actions'
import { usePathname } from 'next/navigation'

export default function LiveEditorToolbar() {
  const { 
    isEditMode, 
    toggleEditMode, 
    canEdit, 
    hasUnsavedChanges, 
    unsavedBlocks, 
    clearUnsavedChanges 
  } = useLiveEditor()
  
  const pathname = usePathname()
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  if (!canEdit) return null

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    
    try {
      // Create an array of save promises
      const savePromises = Object.entries(unsavedBlocks).map(([blockId, content]) => 
        updatePageContent(pathname, blockId, content)
      )
      
      const results = await Promise.all(savePromises)
      
      const failed = results.filter(r => !r.success)
      if (failed.length > 0) {
        setMessage(`Failed to save ${failed.length} block(s).`)
      } else {
        setMessage('Changes published successfully!')
        clearUnsavedChanges()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error(error)
      setMessage('An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
      <div className="max-w-xl mx-auto bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <div>
              <p className="text-white font-bold text-sm leading-none">Developer CMS</p>
              <p className="text-slate-400 text-xs">Live Edit Mode</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-white/20 mx-2" />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-12 h-6 rounded-full transition-colors ${isEditMode ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isEditMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <span className="text-slate-200 text-sm font-medium select-none">
              {isEditMode ? 'Editing On' : 'Editing Off'}
            </span>
          </label>
          <input 
            type="checkbox" 
            className="hidden" 
            checked={isEditMode}
            onChange={toggleEditMode}
          />
        </div>

        {isEditMode && (
          <div className="flex items-center gap-3">
            {message && (
              <span className={`text-xs ${message.includes('Failed') || message.includes('error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {message}
              </span>
            )}
            {hasUnsavedChanges && !message && (
              <span className="text-amber-400 text-xs font-medium animate-pulse">
                Unsaved changes
              </span>
            )}
            
            <button
              onClick={clearUnsavedChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className="text-xs px-3 py-1.5 text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-all ${
                hasUnsavedChanges && !isSaving
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {isSaving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
