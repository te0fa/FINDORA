'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BidOption {
  id: string
  price_amount: number
  vendor?: {
    display_name?: string
  }
}

interface StaffAuctionApprovalActionProps {
  requestId: string
  selectedBidId: string | null
  auctionEndsAt: string | null
  bids: BidOption[]
  locale: string
}

export default function StaffAuctionApprovalAction({
  requestId,
  selectedBidId,
  auctionEndsAt,
  bids,
  locale
}: StaffAuctionApprovalActionProps) {
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [currentSelectedBidId, setCurrentSelectedBidId] = useState<string | null>(selectedBidId)
  const [selectedToApprove, setSelectedToApprove] = useState<string>(bids[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isExpired = auctionEndsAt ? new Date() > new Date(auctionEndsAt) : false
  const isClosed = Boolean(currentSelectedBidId)

  const handleApprove = async () => {
    if (!selectedToApprove) return
    const confirmMsg = isRTL
      ? 'هل أنت متأكد من رغبتك في اعتماد هذا العرض؟ سيتم إغلاق المزاد فوراً.'
      : 'Are you sure you want to approve this bid? Bidding will close immediately.'
    if (!window.confirm(confirmMsg)) return

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/staff/marketplace/auctions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          bid_id: selectedToApprove,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve bid')
      }

      setCurrentSelectedBidId(selectedToApprove)
      setSuccessMsg(isRTL ? 'تم اعتماد العرض بنجاح وإغلاق المزاد' : 'Bid approved successfully. Auction closed.')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (currentSelectedBidId) {
    const approvedBid = bids.find(b => b.id === currentSelectedBidId)
    return (
      <div style={{ fontSize: '0.85rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#4ade80',
          padding: '4px 8px',
          borderRadius: '6px',
          fontWeight: 'bold'
        }}>
          ✓ {isRTL ? 'معتمد' : 'Approved'}
          {approvedBid ? ` (${approvedBid.price_amount.toLocaleString()} EGP)` : ''}
        </span>
      </div>
    )
  }

  if (bids.length === 0) {
    return (
      <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
        {isRTL ? 'لا توجد عروض' : 'No bids yet'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <select
          value={selectedToApprove}
          onChange={e => setSelectedToApprove(e.target.value)}
          disabled={loading}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            maxWidth: '160px'
          }}
        >
          {bids.map(b => (
            <option key={b.id} value={b.id}>
              {b.price_amount.toLocaleString()} EGP - {b.vendor?.display_name || (isRTL ? 'تاجر' : 'Vendor')}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApprove}
          disabled={loading || !selectedToApprove}
          style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '...' : (isRTL ? 'اعتماد' : 'Approve')}
        </button>
      </div>

      {successMsg && (
        <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>{successMsg}</span>
      )}
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}
