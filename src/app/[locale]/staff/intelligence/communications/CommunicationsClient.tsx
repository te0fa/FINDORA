'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as actions from './actions';

type Message = {
  id: string;
  customer_id: string;
  customer_name: string;
  request_id: string;
  request_code: string;
  channel: string;
  recipient: string;
  template_code: string;
  rendered_subject: string;
  rendered_body: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  communication_preferences?: any;
};

export default function CommunicationsClient({ 
  initialMessages, 
  locale, 
  isRTL 
}: { 
  initialMessages: any[]; 
  locale: string;
  isRTL: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSkipOpen, setIsSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const handleViewDetails = async (messageId: string) => {
    // In a real app we might fetch details from a server action if not all data is in the list
    // But for now we'll assume the list has enough or we find it in initialMessages
    const msg = initialMessages.find(m => m.id === messageId);
    if (msg) {
      setSelectedMessage(msg);
      setIsDetailOpen(true);
    }
  };

  const handleEdit = (msg: Message) => {
    if (msg.status !== 'draft' && msg.status !== 'failed') return;
    setEditingMessage({ ...msg });
    setIsEditOpen(true);
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;

    startTransition(async () => {
      const res = await actions.updateMessageDraftAction({
        messageId: editingMessage.id,
        recipient: editingMessage.recipient,
        rendered_subject: editingMessage.rendered_subject,
        rendered_body: editingMessage.rendered_body,
        scheduled_at: editingMessage.scheduled_at
      });

      if (res.success) {
        setIsEditOpen(false);
        setEditingMessage(null);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const handleQueue = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من وضع هذه الرسالة في قائمة الانتظار؟' : 'Are you sure you want to queue this message?')) return;
    startTransition(async () => {
      const res = await actions.queueMessageAction(id);
      if (res.success) router.refresh();
      else alert(res.error);
    });
  };

  const handleMarkSentManual = async (id: string) => {
    const note = prompt(isRTL ? 'أدخل ملاحظة حول الإرسال اليدوي (اختياري):' : 'Enter manual sending note (optional):');
    if (note === null) return;
    
    startTransition(async () => {
      const res = await actions.markMessageSentManualAction(id, note || undefined);
      if (res.success) router.refresh();
      else alert(res.error);
    });
  };

  const handleSkip = (id: string) => {
    setSelectedMessage(initialMessages.find(m => m.id === id) || null);
    setIsSkipOpen(true);
  };

  const onConfirmSkip = async () => {
    if (!selectedMessage || !skipReason) return;
    startTransition(async () => {
      const res = await actions.skipMessageAction(selectedMessage.id, skipReason);
      if (res.success) {
        setIsSkipOpen(false);
        setSkipReason('');
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <>
      <div className="intel-table-wrap">
        <table className="intel-table">
          <thead>
            <tr>
              <th>{isRTL ? 'التاريخ' : 'Date'}</th>
              <th>{isRTL ? 'الحالة' : 'Status'}</th>
              <th>{isRTL ? 'القناة' : 'Channel'}</th>
              <th>{isRTL ? 'المستلم / العميل' : 'Recipient / Customer'}</th>
              <th>{isRTL ? 'المرجع' : 'Reference'}</th>
              <th>{isRTL ? 'القالب / الموضوع' : 'Template / Subject'}</th>
              <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {initialMessages.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleDateString(locale)}</div>
                  <div className="msg-meta">{new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td>
                  <span className={`status-pill status-${m.status}`}>
                    {m.status}
                  </span>
                </td>
                <td>
                  <span className="msg-badge">{m.channel}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 800 }}>{m.customers?.full_name || 'Guest'}</div>
                  <div className="msg-meta">{m.recipient}</div>
                </td>
                <td>
                  <div className="msg-meta">{isRTL ? 'طلب' : 'Req'}: {m.requests?.request_code || 'N/A'}</div>
                </td>
                <td>
                  <span className="msg-temp">{m.template_code}</span>
                  <div className="msg-meta" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.rendered_subject}
                  </div>
                </td>
                <td>
                  <div className="action-btns">
                    <button onClick={() => handleViewDetails(m.id)} className="action-btn-sm" title="View">👁️</button>
                    {(m.status === 'draft' || m.status === 'failed') && (
                      <>
                        <button onClick={() => handleEdit(m)} className="action-btn-sm" title="Edit">✏️</button>
                        <button onClick={() => handleQueue(m.id)} className="action-btn-sm" title="Queue">⏳</button>
                      </>
                    )}
                    {m.status !== 'sent' && (
                      <>
                        <button onClick={() => handleMarkSentManual(m.id)} className="action-btn-sm" title="Mark Sent">✅</button>
                        <button onClick={() => handleSkip(m.id)} className="action-btn-sm" title="Skip">🚫</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {initialMessages.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  {isRTL ? 'لا يوجد رسائل تطابق البحث.' : 'No messages found matching your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedMessage && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isRTL ? 'تفاصيل الرسالة' : 'Message Details'}</h3>
              <button className="close-btn" onClick={() => setIsDetailOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">{isRTL ? 'المستلم:' : 'Recipient:'}</span>
                <span>{selectedMessage.recipient}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{isRTL ? 'العميل:' : 'Customer:'}</span>
                <span>{selectedMessage.customer_name} ({selectedMessage.customer_id})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{isRTL ? 'كود الطلب:' : 'Request Code:'}</span>
                <span>{selectedMessage.request_code}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{isRTL ? 'القناة:' : 'Channel:'}</span>
                <span>{selectedMessage.channel}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{isRTL ? 'الحالة:' : 'Status:'}</span>
                <span className={`status-pill status-${selectedMessage.status}`}>{selectedMessage.status}</span>
              </div>
              <hr style={{ opacity: 0.1, margin: '20px 0' }} />
              <div className="detail-row-col">
                <span className="detail-label">{isRTL ? 'الموضوع:' : 'Subject:'}</span>
                <div className="text-area-box">{selectedMessage.rendered_subject}</div>
              </div>
              <div className="detail-row-col">
                <span className="detail-label">{isRTL ? 'المحتوى:' : 'Body:'}</span>
                <div className="text-area-box body-box">{selectedMessage.rendered_body}</div>
              </div>
              {selectedMessage.error_message && (
                <div className="detail-row-col" style={{ marginTop: '20px' }}>
                  <span className="detail-label" style={{ color: '#ef4444' }}>{isRTL ? 'ملاحظة / خطأ:' : 'Note / Error:'}</span>
                  <div className="text-area-box" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>{selectedMessage.error_message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editingMessage && (
        <div className="modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <form onSubmit={onSaveEdit}>
              <div className="modal-header">
                <h3>{isRTL ? 'تعديل المسودة' : 'Edit Draft'}</h3>
                <button type="button" className="close-btn" onClick={() => setIsEditOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>{isRTL ? 'المستلم:' : 'Recipient:'}</label>
                  <input 
                    type="text" 
                    value={editingMessage.recipient} 
                    onChange={e => setEditingMessage({...editingMessage, recipient: e.target.value})}
                    className="modal-input"
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'الموضوع:' : 'Subject:'}</label>
                  <input 
                    type="text" 
                    value={editingMessage.rendered_subject} 
                    onChange={e => setEditingMessage({...editingMessage, rendered_subject: e.target.value})}
                    className="modal-input"
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'المحتوى:' : 'Body:'}</label>
                  <textarea 
                    value={editingMessage.rendered_body} 
                    onChange={e => setEditingMessage({...editingMessage, rendered_body: e.target.value})}
                    className="modal-input"
                    rows={8}
                  />
                </div>
                <div className="form-group">
                  <label>{isRTL ? 'تاريخ الجدولة (اختياري):' : 'Scheduled At (Optional):'}</label>
                  <input 
                    type="datetime-local" 
                    value={editingMessage.scheduled_at ? new Date(editingMessage.scheduled_at).toISOString().slice(0, 16) : ''} 
                    onChange={e => setEditingMessage({...editingMessage, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="modal-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditOpen(false)} className="cancel-btn">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" disabled={isPending} className="save-btn">{isRTL ? 'حفظ التغييرات' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skip Modal */}
      {isSkipOpen && selectedMessage && (
        <div className="modal-overlay" onClick={() => setIsSkipOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{isRTL ? 'تجاوز الرسالة' : 'Skip Message'}</h3>
              <button className="close-btn" onClick={() => setIsSkipOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
                {isRTL ? 'يرجى إدخال سبب تجاوز هذه الرسالة:' : 'Please enter the reason for skipping this message:'}
              </p>
              <textarea 
                value={skipReason} 
                onChange={e => setSkipReason(e.target.value)}
                placeholder={isRTL ? 'مثال: تم التواصل هاتفياً...' : 'e.g. Already contacted by phone...'}
                className="modal-input"
                rows={3}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsSkipOpen(false)} className="cancel-btn">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={onConfirmSkip} disabled={isPending || !skipReason} className="save-btn" style={{ background: '#ef4444' }}>{isRTL ? 'تأكيد التجاوز' : 'Confirm Skip'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .action-btns { display: flex; gap: 6px; }
        .action-btn-sm {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .action-btn-sm:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 900; }
        .close-btn { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; opacity: 0.5; }
        .close-btn:hover { opacity: 1; }

        .modal-body { padding: 24px; }
        .detail-row { display: flex; gap: 15px; margin-bottom: 12px; font-size: 0.95rem; }
        .detail-label { font-weight: 800; color: rgba(255,255,255,0.4); min-width: 120px; }
        .detail-row-col { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .text-area-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          font-size: 0.95rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .body-box { font-family: monospace; font-size: 0.9rem; }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 800; color: rgba(255,255,255,0.4); margin-bottom: 8px; font-size: 0.85rem; }
        .modal-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-size: 0.95rem;
          outline: none;
        }
        .modal-input:focus { border-color: #8b5cf6; }

        .modal-footer {
          padding: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .cancel-btn {
          padding: 10px 20px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: white;
          cursor: pointer;
        }
        .save-btn {
          padding: 10px 24px;
          background: #8b5cf6;
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </>
  );
}
