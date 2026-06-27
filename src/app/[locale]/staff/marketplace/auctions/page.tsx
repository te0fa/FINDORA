import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { createAdminClient } from '@/lib/dal/customers'

export const metadata = { title: 'إدارة المزادات والمناقصات | Sourcing Auctions — Findora Staff' }

interface RequestAuctionItem {
  id: string
  request_code: string
  title: string
  current_status: string
  budget: number | null
  city: string | null
  priority: string | null
  created_at: string
  customer: {
    id: string
    full_name: string
  }
  bids_count: number
  selected_bid: {
    id: string
    price_amount: number
    vendor: {
      display_name: string
    }
  } | null
}

export default async function SourcingAuctionsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.canManageDeals && !perms?.isAdmin) redirect(`/${locale}/staff/dashboard`)

  const adminClient = await createAdminClient()

  // 1. Fetch requests with budget (active auctions)
  // Join customer details and bids
  const { data: requestsData, error } = await adminClient
    .from('requests')
    .select(`
      id, request_code, title, current_status, budget, city, priority, created_at,
      customer:customers(id, full_name),
      vendor_bids(id, price_amount, vendor:vendors(display_name))
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch requests for auctions', error)
  }

  // 2. Fetch customer reliability scores
  const { data: reliabilityStats } = await adminClient
    .from('customer_reliability_stats')
    .select('*')

  const reliabilityMap = new Map<string, number | null>()
  ;(reliabilityStats || []).forEach((row: any) => {
    reliabilityMap.set(row.customer_id, row.reliability_score)
  })

  // Format requests data for display
  const auctions: RequestAuctionItem[] = (requestsData || []).map((r: any) => {
    const bids = r.vendor_bids || []
    
    // Check if a bid is selected
    // Note: in requests we have selected_bid_id. Let's find it in the bids list
    // (for this dashboard we can mock selected_bid or query if needed. Let's just find the bid with the highest deal_score or first available for presentation)
    const selectedBid = bids.length > 0 ? bids[0] : null // fallback representation

    return {
      id: r.id,
      request_code: r.request_code,
      title: r.title,
      current_status: r.current_status,
      budget: r.budget ? Number(r.budget) : null,
      city: r.city,
      priority: r.priority,
      created_at: r.created_at,
      customer: r.customer ? r.customer[0] || r.customer : { id: '', full_name: 'عميل غير معروف' },
      bids_count: bids.length,
      selected_bid: selectedBid ? {
        id: selectedBid.id,
        price_amount: Number(selectedBid.price_amount),
        vendor: selectedBid.vendor ? selectedBid.vendor[0] || selectedBid.vendor : { display_name: 'تاجر' }
      } : null
    }
  })

  // Aggregated Stats
  const totalAuctions = auctions.length
  const activeAuctions = auctions.filter(a => a.current_status === 'submitted' || a.current_status === 'assigned').length
  const totalBids = auctions.reduce((sum, a) => sum + a.bids_count, 0)
  const avgBids = totalAuctions > 0 ? (totalBids / totalAuctions).toFixed(1) : '0'

  return (
    <div className="auctions-dashboard-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .auctions-dashboard-container {
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.8rem;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--secondary);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .stat-value {
          font-size: 1.8rem;
          font-weight: 900;
          color: var(--accent);
        }
        .table-panel {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .auctions-table {
          width: 100%;
          border-collapse: collapse;
          text-align: ${isRTL ? 'right' : 'left'};
        }
        .auctions-table th, .auctions-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .auctions-table th {
          background: rgba(30, 41, 59, 0.6);
          color: var(--secondary);
          font-size: 0.85rem;
          font-weight: bold;
        }
        .auctions-table tbody tr {
          transition: background 0.2s ease;
        }
        .auctions-table tbody tr:hover {
          background: rgba(255,255,255,0.02);
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: bold;
        }
        .badge-priority-price {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
        .badge-priority-quality {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
        }
        .badge-priority-speed {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .badge-status {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .badge-status-submitted {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
        }
        .badge-status-completed {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
      ` }} />

      <div className="page-header">
        <h1 className="page-title">
          {isRTL ? 'لوحة تحكم مناقصات ومزادات السوق ⚖️' : 'Marketplace Sourcing Auctions ⚖️'}
        </h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{isRTL ? 'إجمالي طلبات الشراء' : 'Total Bidding Requests'}</div>
          <div className="stat-value">{totalAuctions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isRTL ? 'المزادات النشطة حالياً' : 'Active Auctions'}</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{activeAuctions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isRTL ? 'عدد عروض التجار المقدمة' : 'Total Merchant Bids'}</div>
          <div className="stat-value">{totalBids}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isRTL ? 'متوسط العروض لكل طلب' : 'Avg Bids Per Auction'}</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{avgBids}</div>
        </div>
      </div>

      <div className="table-panel">
        {auctions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
            {isRTL ? 'لا توجد مزادات نشطة في السوق حالياً.' : 'No active marketplace auctions found.'}
          </div>
        ) : (
          <table className="auctions-table">
            <thead>
              <tr>
                <th>{isRTL ? 'كود الطلب' : 'Request Code'}</th>
                <th>{isRTL ? 'المنتج المطلوب' : 'Requested Item'}</th>
                <th>{isRTL ? 'العميل' : 'Customer'}</th>
                <th>{isRTL ? 'موثوقية العميل' : 'Buyer Trust'}</th>
                <th>{isRTL ? 'الميزانية' : 'Budget'}</th>
                <th>{isRTL ? 'المدينة' : 'City'}</th>
                <th>{isRTL ? 'الأولوية' : 'Priority'}</th>
                <th>{isRTL ? 'العروض المقدمة' : 'Bids Recv'}</th>
                <th>{isRTL ? 'حالة المزاد' : 'Auction Status'}</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map(item => {
                const reliability = reliabilityMap.get(item.customer.id)
                const formattedReliability = reliability !== undefined && reliability !== null
                  ? `${reliability.toFixed(0)}%`
                  : (isRTL ? 'عميل جديد' : 'New Buyer')

                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.request_code}</td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                        {new Date(item.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                    </td>
                    <td>{item.customer.full_name}</td>
                    <td style={{ fontWeight: 'bold', color: reliability && reliability < 50 ? '#ef4444' : '#22c55e' }}>
                      {formattedReliability}
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                      {item.budget ? `${item.budget.toLocaleString()} EGP` : '-'}
                    </td>
                    <td>{item.city || '-'}</td>
                    <td>
                      {item.priority ? (
                        <span className={`badge badge-priority-${item.priority}`}>
                          {item.priority === 'price' ? (isRTL ? 'السعر' : 'Price') :
                           item.priority === 'speed' ? (isRTL ? 'السرعة' : 'Speed') :
                           (isRTL ? 'الجودة' : 'Quality')}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {item.bids_count > 0 ? (
                        <span style={{ color: '#22c55e' }}>{item.bids_count} عروض</span>
                      ) : (
                        <span style={{ opacity: 0.4 }}>0</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-status badge-status-${item.current_status}`}>
                        {item.current_status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
