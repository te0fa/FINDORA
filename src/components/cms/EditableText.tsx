'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLiveEditor } from './LiveEditorContext'

interface EditableTextProps {
  blockId: string
  defaultText: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
  className?: string
  // If true, the updated content comes from the server initial payload
  serverContent?: any 
}

export default function EditableText({ 
  blockId, 
  defaultText, 
  as: Component = 'span', 
  className = '',
  serverContent
}: EditableTextProps) {
  const { isEditMode, updateBlockContent, unsavedBlocks } = useLiveEditor()
  
  // Use unsaved changes if they exist, otherwise server content, otherwise default
  const unsavedContent = unsavedBlocks[blockId]?.text
  const currentText = unsavedContent ?? serverContent?.text ?? defaultText

  const [localText, setLocalText] = useState(currentText)
  const editableRef = useRef<HTMLElement>(null)

  // Sync when mode changes or external updates happen
  useEffect(() => {
    if (!isEditMode) {
      setLocalText(currentText)
    }
  }, [currentText, isEditMode])

  const handleBlur = () => {
    if (!editableRef.current) return
    const newText = editableRef.current.innerText
    if (newText !== currentText) {
      setLocalText(newText)
      updateBlockContent(blockId, { text: newText })
    }
  }

  // Visual cues for edit mode
  const editClasses = isEditMode 
    ? 'outline-dashed outline-2 outline-emerald-500/50 hover:outline-emerald-500 cursor-text transition-all bg-emerald-500/5 relative rounded' 
    : ''

  return (
    <Component 
      ref={editableRef as any}
      className={`${className} ${editClasses}`}
      contentEditable={isEditMode}
      suppressContentEditableWarning={true}
      onBlur={handleBlur}
    >
      {localText}
    </Component>
  )
}
