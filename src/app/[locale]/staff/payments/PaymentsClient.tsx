'use client';

import React, { useState } from 'react';
import { PaymentIntent, PaymentIntentStatus } from '@/lib/dal/payments';
import { 
  confirmPaymentAction, 
  updatePaymentStatusAction, 
  unlockReportAction,
  createPaymentIntentFromRequestAction
} from './actions';
import { useRouter } from 'next/navigation';

export default function PaymentsClient({ 
  initialIntents, 
  initialNeedsPayment,
  initialLedger,
  locale 
}: { 
  initialIntents: any[], 
  initialNeedsPayment: any[],
  initialLedger: any[],
  locale: string 
}) {
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [activeTab, setActiveTab] = useState<'needs_payment' | 'intents' | 'ledger'>('intents');
  const [selectedIntent, setSelectedIntent] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: () => Promise<any>) => {
    setIsProcessing(true);
    try {
      await action();
      router.refresh();
      setSelectedIntent(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending_customer': return '#f59e0b';
      case 'submitted': return '#3b82f6';
      case 'rejected': return '#ef4444';
      case 'cancelled': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const renderEmptyState = (message: string) => (
    <div className="empty-state">
      <div className="empty-icon">💸</div>
      <div className="empty-text">{message}</div>
    </div>
  );

  return (
    <div className="payments-client">
      <style dangerouslySetInnerHTML={{ __html: `
        .tabs-container { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
        .tab-btn { background: none; border: none; color: rgba(255,255,255,0.4); padding: 8px 16px; font-weight: 800; cursor: pointer; border-radius: 8px; font-size: 0.9rem; transition: all 0.2s; }
        .tab-btn:hover { color: white; background: rgba(255,255,255,0.05); }
        .tab-btn.active { color: #f7d46b; background: rgba(247, 212, 107, 0.1); }

        .payments-table-wrap { 
          background: rgba(255,255,255,0.02); 
          border: 1px solid rgba(255,255,255,0.06); 
          border-radius: 16px; 
          overflow-x: auto; /* Allow horizontal scroll */
          -webkit-overflow-scrolling: touch;
        }
        .payments-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 800px; }
        .payments-table th { background: rgba(255,255,255,0.03); padding: 16px; text-align: left; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .payments-table td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .payments-table tr:hover { background: rgba(255,255,255,0.01); }
        [dir="rtl"] .payments-table th { text-align: right; }

        .status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
        .intent-type { font-weight: 700; color: #f7d46b; }
        .amount-cell { font-weight: 900; font-family: monospace; font-size: 1.1rem; }

        .action-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; transition: all 0.2s; white-space: nowrap; }
        .action-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(212,166,60,0.4); }
        .action-btn.primary { background: rgba(247, 212, 107, 0.1); border-color: rgba(247, 212, 107, 0.3); color: #f7d46b; }
        
        .empty-state { padding: 60px; text-align: center; color: rgba(255,255,255,0.3); }
        .empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
        .empty-text { font-size: 1.1rem; font-weight: 700; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: #0f1115; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; width: 100%; max-width: 600px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow-y: auto; max-height: 90vh; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .modal-title { font-size: 1.25rem; font-weight: 900; }
        .close-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1.5rem; }

        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .detail-item label { display: block; font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
        .detail-item div { font-weight: 600; font-size: 0.95rem; }

        .modal-actions { display: flex; gap: 10px; margin-top: 30px; }
        .confirm-btn { background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; flex: 1; transition: opacity 0.2s; }
        .reject-btn { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
        .cancel-btn { background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .confirm-btn:disabled, .reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .audit-list { margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
        .audit-item { font-size: 0.8rem; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .audit-date { color: rgba(255,255,255,0.3); margin-right: 10px; }
        .audit-event { font-weight: 700; color: #f7d46b; }
      ` }} />

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'needs_payment' ? 'active' : ''}`} 
          onClick={() => setActiveTab('needs_payment')}
        >
          {isRTL ? 'تحتاج دفع' : 'Needs Payment'}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'intents' ? 'active' : ''}`} 
          onClick={() => setActiveTab('intents')}
        >
          {isRTL ? 'نوايا الدفع' : 'Payment Intents'}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} 
          onClick={() => setActiveTab('ledger')}
        >
          {isRTL ? 'سجل المدفوعات' : 'Payments Ledger'}
        </button>
      </div>

      <div className="payments-table-wrap">
        {activeTab === 'needs_payment' && (
          <table className="payments-table">
            <thead>
              <tr>
                <th>{isRTL ? 'الطلب' : 'Request'}</th>
                <th>{isRTL ? 'العميل' : 'Customer'}</th>
                <th>{isRTL ? 'المبلغ المطلوب' : 'Service Fee'}</th>
                <th>{isRTL ? 'القرار' : 'Pricing Decision'}</th>
                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialNeedsPayment.length === 0 ? (
                <tr><td colSpan={7}>{renderEmptyState(isRTL ? 'لا توجد طلبات تحتاج دفع حالياً' : 'No requests currently need payment')}</td></tr>
              ) : (
                initialNeedsPayment.map((req) => (
                  <tr key={req.id}>
                    <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{req.request_code}</code></td>
                    <td>{req.customer?.full_name || '-'}</td>
                    <td className="amount-cell">{req.service_fee_amount} EGP</td>
                    <td><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{req.pricing_decision}</span></td>
                    <td><span className="status-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}>{req.current_status}</span></td>
                    <td style={{ whiteSpace: 'nowrap', opacity: 0.6 }}>{new Date(req.created_at).toISOString().split('T')[0] + ' UTC'}</td>
                    <td style={{ textAlign: isRTL ? 'left' : 'right' }}>
                      <button 
                        className="action-btn primary"
                        disabled={isProcessing}
                        onClick={() => handleAction(() => createPaymentIntentFromRequestAction({
                          requestId: req.id,
                          customerId: req.customer_id,
                          amount: req.service_fee_amount
                        }))}
                      >
                        {isRTL ? 'إنشاء مطالبة' : 'Create Intent'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'intents' && (
          <table className="payments-table">
            <thead>
              <tr>
                <th>{isRTL ? 'المعرف' : 'ID'}</th>
                <th>{isRTL ? 'العميل' : 'Customer'}</th>
                <th>{isRTL ? 'الطلب' : 'Request'}</th>
                <th>{isRTL ? 'النوع' : 'Type'}</th>
                <th>{isRTL ? 'المبلغ' : 'Amount'}</th>
                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialIntents.length === 0 ? (
                <tr><td colSpan={8}>{renderEmptyState(isRTL ? 'لا توجد نوايا دفع حالياً' : 'No payment intents found')}</td></tr>
              ) : (
                initialIntents.map((intent) => (
                  <tr key={intent.id}>
                    <td style={{ opacity: 0.5, fontSize: '0.7rem' }}>{intent.id.slice(0, 8)}</td>
                    <td>{intent.customer?.full_name || '-'}</td>
                    <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{intent.request?.request_code || 'N/A'}</code></td>
                    <td><span className="intent-type">{intent.intent_type}</span></td>
                    <td className="amount-cell">{intent.amount} {intent.currency_code}</td>
                    <td>
                      <span className="status-pill" style={{ background: `${getStatusColor(intent.status)}20`, color: getStatusColor(intent.status), border: `1px solid ${getStatusColor(intent.status)}40` }}>
                        {intent.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', opacity: 0.6 }}>{new Date(intent.created_at).toISOString().split('T')[0] + ' UTC'}</td>
                    <td style={{ textAlign: isRTL ? 'left' : 'right' }}>
                      <button className="action-btn" onClick={() => setSelectedIntent(intent)}>
                        {isRTL ? 'تفاصيل' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'ledger' && (
          <table className="payments-table">
            <thead>
              <tr>
                <th>{isRTL ? 'الطلب' : 'Request'}</th>
                <th>{isRTL ? 'النوع' : 'Type'}</th>
                <th>{isRTL ? 'المبلغ' : 'Amount'}</th>
                <th>{isRTL ? 'الطريقة' : 'Method'}</th>
                <th>{isRTL ? 'المرجع' : 'Reference'}</th>
                <th>{isRTL ? 'تم التأكيد' : 'Confirmed At'}</th>
              </tr>
            </thead>
            <tbody>
              {initialLedger.length === 0 ? (
                <tr><td colSpan={6}>{renderEmptyState(isRTL ? 'سجل المدفوعات فارغ' : 'Payments ledger is empty')}</td></tr>
              ) : (
                initialLedger.map((pay) => (
                  <tr key={pay.id}>
                    <td>
                      <div>{pay.customer?.full_name}</div>
                      <code style={{ opacity: 0.6, fontSize: '0.8rem' }}>{pay.request?.request_code || 'N/A'}</code>
                    </td>
                    <td><span className="intent-type">{pay.payment_type}</span></td>
                    <td className="amount-cell" style={{ color: '#10b981' }}>{pay.amount} {pay.currency_code}</td>
                    <td><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{pay.payment_method}</span></td>
                    <td><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{pay.external_reference || '-'}</span></td>
                    <td style={{ opacity: 0.6 }}>{new Date(pay.confirmed_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedIntent && (
        <div className="modal-overlay" onClick={() => setSelectedIntent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isRTL ? 'تفاصيل الدفعة' : 'Payment Details'}</h2>
              <button className="close-btn" onClick={() => setSelectedIntent(null)}>&times;</button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <label>{isRTL ? 'نوع الدفع' : 'Intent Type'}</label>
                <div>{selectedIntent.intent_type}</div>
              </div>
              <div className="detail-item">
                <label>{isRTL ? 'المبلغ' : 'Amount'}</label>
                <div className="amount-cell" style={{ color: '#f7d46b' }}>{selectedIntent.amount} {selectedIntent.currency_code}</div>
              </div>
              <div className="detail-item">
                <label>{isRTL ? 'العميل' : 'Customer'}</label>
                <div>{selectedIntent.customer?.full_name}</div>
              </div>
              <div className="detail-item">
                <label>{isRTL ? 'كود الطلب' : 'Request Code'}</label>
                <div>{selectedIntent.request?.request_code}</div>
              </div>
              <div className="detail-item">
                <label>{isRTL ? 'الحالة الحالية' : 'Current Status'}</label>
                <div style={{ color: getStatusColor(selectedIntent.status) }}>{selectedIntent.status}</div>
              </div>
              <div className="detail-item">
                <label>{isRTL ? 'مزود الخدمة' : 'Provider'}</label>
                <div>{selectedIntent.provider}</div>
              </div>
            </div>

            {selectedIntent.status !== 'confirmed' && selectedIntent.status !== 'rejected' && selectedIntent.status !== 'cancelled' && (
              <div className="modal-actions">
                <button 
                  className="confirm-btn" 
                  disabled={isProcessing}
                  onClick={() => handleAction(() => confirmPaymentAction(selectedIntent.id, 'Confirmed via Staff UI'))}
                >
                  {isRTL ? 'تأكيد الاستلام' : 'Confirm Payment'}
                </button>
                <button 
                  className="reject-btn" 
                  disabled={isProcessing}
                  onClick={() => handleAction(() => updatePaymentStatusAction(selectedIntent.id, 'rejected', 'Rejected via Staff UI'))}
                >
                  {isRTL ? 'رفض' : 'Reject'}
                </button>
              </div>
            )}

            {selectedIntent.status === 'confirmed' && selectedIntent.intent_type === 'report_unlock' && (
              <div className="modal-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                <button 
                  className="confirm-btn" 
                  style={{ background: '#3b82f6' }}
                  disabled={isProcessing}
                  onClick={() => handleAction(() => unlockReportAction({
                    requestId: selectedIntent.request_id,
                    customerId: selectedIntent.customer_id,
                    paymentIntentId: selectedIntent.id,
                    unlockType: 'report_full',
                    revealText: 'Report unlocked manually after payment'
                  }))}
                >
                  {isRTL ? 'فتح التقرير الكامل' : 'Unlock Full Report'}
                </button>
              </div>
            )}

            <div className="audit-list">
              <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase' }}>
                {isRTL ? 'سجل المراجعة' : 'Audit Trail'}
              </label>
              {(selectedIntent.audit_events || []).map((ev: any) => (
                <div key={ev.id} className="audit-item">
                  <span className="audit-date">{new Date(ev.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'}</span>
                  <span className="audit-event">{ev.event_type}</span>
                  <span style={{ margin: '0 10px', opacity: 0.5 }}>-</span>
                  <span>{ev.notes}</span>
                </div>
              ))}
              {(!selectedIntent.audit_events || selectedIntent.audit_events.length === 0) && (
                <div style={{ opacity: 0.4, fontSize: '0.8rem', padding: '10px 0' }}>{isRTL ? 'لا يوجد سجل' : 'No audit trail found'}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
