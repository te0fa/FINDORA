'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

/**
 * ModalBackdrop — wraps the full-screen overlay.
 * Clicking the backdrop (outside the inner card) navigates to `closeHref`.
 * Clicking inside the card does NOT close the modal.
 */
export function ModalBackdrop({
  closeHref,
  children,
}: {
  closeHref: string
  children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(closeHref)}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
        cursor: 'pointer',
      }}
    >
      {/* Stop clicks on the inner card from bubbling up to the backdrop */}
      <div onClick={(e) => e.stopPropagation()} style={{ cursor: 'auto', width: '100%', maxWidth: '400px' }}>
        {children}
      </div>
    </div>
  )
}
