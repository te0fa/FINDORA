'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LiveEditorContextType {
  isEditMode: boolean
  toggleEditMode: () => void
  hasUnsavedChanges: boolean
  unsavedBlocks: Record<string, any>
  updateBlockContent: (blockId: string, content: any) => void
  clearUnsavedChanges: () => void
  canEdit: boolean
  setCanEdit: (canEdit: boolean) => void
}

const LiveEditorContext = createContext<LiveEditorContextType | undefined>(undefined)

export function LiveEditorProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [canEdit, setCanEdit] = useState(false) // Whether current user has permission
  const [unsavedBlocks, setUnsavedBlocks] = useState<Record<string, any>>({})

  const hasUnsavedChanges = Object.keys(unsavedBlocks).length > 0

  const toggleEditMode = () => {
    if (canEdit) {
      setIsEditMode(!isEditMode)
    }
  }

  const updateBlockContent = (blockId: string, content: any) => {
    setUnsavedBlocks(prev => ({
      ...prev,
      [blockId]: content
    }))
  }

  const clearUnsavedChanges = () => {
    setUnsavedBlocks({})
  }

  // Warn before closing tab if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <LiveEditorContext.Provider 
      value={{ 
        isEditMode, 
        toggleEditMode, 
        hasUnsavedChanges, 
        unsavedBlocks, 
        updateBlockContent, 
        clearUnsavedChanges,
        canEdit,
        setCanEdit
      }}
    >
      {children}
    </LiveEditorContext.Provider>
  )
}

export function useLiveEditor() {
  const context = useContext(LiveEditorContext)
  if (context === undefined) {
    throw new Error('useLiveEditor must be used within a LiveEditorProvider')
  }
  return context
}
