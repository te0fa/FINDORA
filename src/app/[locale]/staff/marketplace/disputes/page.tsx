import { getDisputesForAdmin, resolveDispute } from '@/lib/dal/disputes'
import { createAdminClient } from '@/lib/dal/customers'
import { addCustomerPoints } from '@/lib/dal/points'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Server Action for resolving disputes
async function resolveDisputeAction(formData: FormData) {
  'use server'
  const disputeId = formData.get('disputeId') as string
  const notes = formData.get('notes') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Find staff member ID
  const adminClient = await createAdminClient()
  const { data: staff } = await adminClient
    .from('staff_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  await resolveDispute(disputeId, staff.id, notes)
  revalidatePath('/[locale]/staff/marketplace/disputes')
}

// Server Action for price guarantees
async function handleGuaranteeAction(formData: FormData) {
  'use server'
  const claimId = formData.get('claimId') as string
  const action = formData.get('action') as string // 'approve' or 'reject'
  const customerId = formData.get('customerId') as string

  const adminClient = await createAdminClient()
  const status = action === 'approve' ? 'approved' : 'rejected'

  const { error } = await adminClient
    .from('price_guarantees')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', claimId)

  if (error) throw new Error(error.message)

  // Award 50 points if approved
  if (action === 'approve') {
    await addCustomerPoints(customerId, 50, 'vip_redeemed', claimId)
  }

  revalidatePath('/[locale]/staff/marketplace/disputes')
}

export default async function DisputesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const ar = locale === 'ar'

  const disputes = await getDisputesForAdmin()

  // Fetch price guarantees
  const adminClient = await createAdminClient()
  const { data: guarantees } = await adminClient
    .from('price_guarantees')
    .select(`
      *,
      customer:customers(full_name)
    `)
    .order('created_at', { ascending: false })

  const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '1.5rem',
    marginBottom: '1rem',
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '0.75rem'
  }

  return (
    <div style={{ padding: '2rem', color: '#fff', direction: ar ? 'rtl' : 'ltr' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', color: '#fff' }}>
        {ar ? '⚖️ مركز فض النزاعات وضمان الأسعار' : '⚖️ Dispute Resolution & Price Guarantees'}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Disputes Section */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#d4a63c', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛡️</span> {ar ? 'شكاوى حماية المشترين' : 'Buyer Protection Disputes'}
          </h2>
          {disputes.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
              {ar ? 'لا توجد شكاوى أو نزاعات حالياً.' : 'No active disputes found.'}
            </p>
          ) : (
            disputes.map((d: any) => (
              <div key={d.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', background: d.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: d.status === 'resolved' ? '#4ade80' : '#f87171', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    {d.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(d.created_at).toLocaleDateString(locale)}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'العميل:' : 'Customer:'}</strong> {d.customer?.full_name || 'N/A'}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'المورد:' : 'Vendor:'}</strong> {d.vendor?.display_name || 'N/A'}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'السبب:' : 'Reason:'}</strong> {d.dispute_reason}
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8 }}>
                  {d.details}
                </p>

                {d.status !== 'resolved' && (
                  <form action={resolveDisputeAction} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <input type="hidden" name="disputeId" value={d.id} />
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{ar ? 'ملاحظات الحل والتسوية:' : 'Resolution Notes:'}</label>
                    <textarea name="notes" style={{ ...inputStyle, minHeight: 60 }} placeholder={ar ? 'اكتب تفاصيل الحل والتسوية...' : 'Provide settlement details...'} required />
                    <button type="submit" style={{ background: '#d4a63c', color: '#000', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      {ar ? 'حل الشكوى وإغلاقها' : 'Resolve & Close Dispute'}
                    </button>
                  </form>
                )}
                {d.status === 'resolved' && d.resolution_notes && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4ade80' }}>
                    <strong>{ar ? 'ملاحظات التسوية:' : 'Settlement Notes:'}</strong> {d.resolution_notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Price Guarantees Section */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#d4a63c', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💰</span> {ar ? 'طلبات ضمان السعر الأقل' : 'Price Guarantee Claims'}
          </h2>
          {!guarantees || guarantees.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
              {ar ? 'لا توجد طلبات ضمان حالياً.' : 'No price guarantee claims found.'}
            </p>
          ) : (
            guarantees.map((g: any) => (
              <div key={g.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    background: g.status === 'approved' ? 'rgba(34,197,94,0.15)' : g.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(212,166,60,0.15)',
                    color: g.status === 'approved' ? '#4ade80' : g.status === 'rejected' ? '#f87171' : '#d4a63c',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontWeight: 700
                  }}>
                    {g.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(g.created_at).toLocaleDateString(locale)}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'العميل:' : 'Customer:'}</strong> {g.customer?.full_name || 'N/A'}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'المنتج:' : 'Product:'}</strong> {g.product_name}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                  <strong>{ar ? 'السعر الأقل المكتشف:' : 'Lower Price Found:'}</strong> {g.lower_price} EGP
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8 }}>
                  <strong>{ar ? 'الدليل:' : 'Proof:'}</strong> {g.proof_details}
                </p>

                {g.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <form action={handleGuaranteeAction}>
                      <input type="hidden" name="claimId" value={g.id} />
                      <input type="hidden" name="customerId" value={g.customer_id} />
                      <input type="hidden" name="action" value="approve" />
                      <button type="submit" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        {ar ? 'قبول وصرف ٥٠ نقطة' : 'Approve & Award 50 Pts'}
                      </button>
                    </form>
                    <form action={handleGuaranteeAction}>
                      <input type="hidden" name="claimId" value={g.id} />
                      <input type="hidden" name="customerId" value={g.customer_id} />
                      <input type="hidden" name="action" value="reject" />
                      <button type="submit" style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        {ar ? 'رفض الطلب' : 'Reject Claim'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
