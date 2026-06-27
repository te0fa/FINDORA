'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { handleAssignReviewer, handleAutoAssignReviewer, handleUnassignReviewer } from './actions'

type Props = {
  requestId: string
  locale: string
  assignableReviewers: Array<{ id: string; full_name: string; staff_role: string | null }>
  currentReviewerId: string | null
  currentReviewerName: string | null
  assignmentStatus: string
}

export default function AssignmentControls({ 
  requestId, 
  locale, 
  assignableReviewers,
  currentReviewerId,
  currentReviewerName,
  assignmentStatus
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isRTL = locale === 'ar'

  const handleManualAssign = async (reviewerId: string) => {
    if (!reviewerId) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('requestId', requestId)
      formData.append('reviewerId', reviewerId)
      formData.append('locale', locale)
      await handleAssignReviewer(formData)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleAutoAssign = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('requestId', requestId)
      formData.append('locale', locale)
      await handleAutoAssignReviewer(formData)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('requestId', requestId)
      formData.append('locale', locale)
      await handleUnassignReviewer(formData)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="assignment-controls" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 160 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .assignment-controls select {
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .assignment-controls select option {
          background: #111;
          color: #fff;
        }
        .assignment-controls select:hover {
          border-color: #d4a63c;
        }
        .btn-tiny {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.6);
        }
        .btn-tiny:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        .btn-auto {
          background: rgba(212,166,60,0.1);
          color: #d4a63c;
          border: 1px solid rgba(212,166,60,0.2);
        }
        .btn-auto:hover {
          background: rgba(212,166,60,0.2);
        }
      ` }} />

      <select 
        value={currentReviewerId || ""} 
        onChange={(e) => handleManualAssign(e.target.value)}
        disabled={loading}
      >
        <option value="" disabled>{isRTL ? 'توزيع المراجع...' : 'Assign Reviewer...'}</option>
        {assignableReviewers.map(r => (
          <option key={r.id} value={r.id} style={{ color: '#fff' }}>
            {r.full_name} — {r.staff_role ? r.staff_role.toUpperCase() : 'Reviewer'}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button 
          className="btn-tiny btn-auto" 
          onClick={handleAutoAssign}
          disabled={loading}
        >
          {isRTL ? 'توزيع تلقائي' : 'Auto'}
        </button>
        {currentReviewerId && (
          <button 
            className="btn-tiny" 
            onClick={handleUnassign}
            disabled={loading}
            style={{ color: '#fca5a5' }}
          >
            {isRTL ? 'إلغاء' : 'Clear'}
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'center' }}>{isRTL ? 'جاري التحديث...' : 'Updating...'}</div>}
    </div>
  )
}
