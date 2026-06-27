'use client'

import React, { useEffect } from 'react'
import { LiveEditorProvider, useLiveEditor } from './LiveEditorContext'
import LiveEditorToolbar from './LiveEditorToolbar'

function CMSPermissions({ canEdit }: { canEdit: boolean }) {
  const { setCanEdit } = useLiveEditor()
  
  useEffect(() => {
    setCanEdit(canEdit)
  }, [canEdit, setCanEdit])

  return null
}

export default function CMSLayoutWrapper({ 
  children, 
  canEdit 
}: { 
  children: React.ReactNode
  canEdit: boolean 
}) {
  return (
    <LiveEditorProvider>
      <CMSPermissions canEdit={canEdit} />
      {children}
      {canEdit && <LiveEditorToolbar />}
    </LiveEditorProvider>
  )
}
