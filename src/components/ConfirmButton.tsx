'use client'

import React from 'react'

export function ConfirmButton({ 
  children, 
  confirmMessage, 
  className, 
  style,
  name,
  value,
  type = 'submit'
}: { 
  children: React.ReactNode
  confirmMessage: string
  className?: string
  style?: React.CSSProperties
  name?: string
  value?: string
  type?: 'submit' | 'button'
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <button 
      type={type} 
      name={name}
      value={value}
      className={className} 
      style={style} 
      onClick={handleClick}
    >
      {children}
    </button>
  )
}
