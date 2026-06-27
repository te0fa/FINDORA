'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { toggleCustomerSegmentAction } from '../actions';

interface CustomerDetailsClientProps {
  locale: string;
  customer: any;
  segments: string[];
  requests: any[];
  messages: any[];
  scores: any;
  interviews?: any[];
  trackingEvents?: any[];
}

export default function CustomerDetailsClient({
  locale,
  customer,
  segments: initialSegments,
  requests,
  messages,
  scores,
  interviews = [],
  trackingEvents = []
}: CustomerDetailsClientProps) {
  const isRTL = locale === 'ar';
  const [segments, setSegments] = useState<string[]>(initialSegments);
  const [isPending, startTransition] = useTransition();

  const availableSegments = [
    { code: 'WHALE', label_ar: '🐳 عميل ضخم (Whale)', label_en: '🐳 Whale Client', color: '#3b82f6' },
    { code: 'VIP', label_ar: '👑 عميل مميز (VIP)', label_en: '👑 VIP Customer', color: '#f59e0b' },
    { code: 'REPEAT', label_ar: '🔄 عميل متكرر (Repeat)', label_en: '🔄 Repeat Customer', color: '#10b981' },
    { code: 'CHURN_RISK', label_ar: '⚠️ مخاطر الخروج', label_en: '⚠️ Churn Risk', color: '#ef4444' }
  ];

  const handleToggleSegment = (code: string) => {
    const isActive = segments.includes(code);
    const updated = isActive ? segments.filter(s => s !== code) : [...segments, code];

    startTransition(async () => {
      setSegments(updated);
      await toggleCustomerSegmentAction(customer.id, code, !isActive, locale);
    });
  };

  return (
    <div className="customer-details-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .customer-details-page {
          color: #e2e8f0;
          font-family: 'Outfit', 'Inter', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .back-link {
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255,255,255,0.02);
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .back-link:hover {
          background: rgba(255,255,255,0.05);
          color: #ffffff;
        }

        .c-profile-card {
          background: linear-gradient(135deg, rgba(20, 30, 55, 0.5) 0%, rgba(10, 15, 30, 0.7) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 30px;
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 30px;
        }

        @media (max-width: 800px) {
          .c-profile-card { grid-template-columns: 1fr; }
        }

        .c-avatar-wrap {
          text-align: center;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        [dir="rtl"] .c-avatar-wrap {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 0;
          padding-left: 30px;
        }

        @media (max-width: 800px) {
          .c-avatar-wrap {
            border: none !important;
            padding: 0 0 20px 0 !important;
          }
        }

        .c-avatar {
          width: 80px;
          height: 80px;
          background: rgba(59, 130, 246, 0.1);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          margin-bottom: 15px;
        }

        .c-fullname {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 6px;
        }

        .c-code-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          color: #94a3b8;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 800;
          text-transform: uppercase;
        }

        .info-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
        }

        /* Segment manager panel */
        .segments-control-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 30px;
        }

        .segment-toggles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 15px;
        }

        .segment-toggle-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 800;
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.2s;
        }

        .segment-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .segment-toggle-btn.active {
          color: #ffffff;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.05);
        }

        .toggle-switch {
          width: 36px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          position: relative;
          transition: background 0.3s;
        }

        .segment-toggle-btn.active .toggle-switch {
          background: #10b981;
        }

        .toggle-dot {
          width: 14px;
          height: 14px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .segment-toggle-btn.active .toggle-dot {
          transform: translateX(16px);
        }
        
        [dir="rtl"] .segment-toggle-btn.active .toggle-dot {
          transform: translateX(-16px);
        }

        /* Intelligence metrics */
        .intel-scores-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        @media (max-width: 600px) {
          .intel-scores-row { grid-template-columns: 1fr; }
        }

        .score-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px 20px;
          text-align: center;
        }

        .score-val {
          font-size: 2rem;
          font-weight: 900;
          color: #f7d46b;
          font-family: monospace;
          margin-bottom: 6px;
        }

        .score-lbl {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.45);
          font-weight: 800;
          text-transform: uppercase;
        }

        /* Lists */
        .details-sections-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 30px;
        }

        @media (max-width: 900px) {
          .details-sections-grid { grid-template-columns: 1fr; }
        }

        .table-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 30px;
        }

        .card-title {
          font-size: 1.15rem;
          font-weight: 900;
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 10px;
        }

        .list-table {
          width: 100%;
          border-collapse: collapse;
        }

        .list-table th {
          text-align: left;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          font-size: 0.72rem;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
        }

        [dir="rtl"] .list-table th { text-align: right; }

        .list-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.88rem;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          background: rgba(255,255,255,0.05);
        }

        /* Discovery styles */
        .discovery-section-card {
          background: linear-gradient(135deg, rgba(20, 25, 45, 0.4) 0%, rgba(10, 12, 25, 0.6) 100%);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 24px;
          padding: 26px;
          margin-bottom: 30px;
        }
        .discovery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 15px;
        }
        .discovery-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .discovery-stat-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
        }
        .discovery-stat-val {
          font-size: 1.6rem;
          font-weight: 900;
          color: #60a5fa;
        }
        .discovery-stat-lbl {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 850;
        }
        .add-discovery-btn {
          width: 100%;
          padding: 14px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px dashed rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          color: #60a5fa;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-discovery-btn:hover {
          background: rgba(59, 130, 246, 0.18);
          border-color: #60a5fa;
        }
        .discovery-form {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 6px;
          font-weight: 800;
        }
        .form-group input[type="text"], .form-group input[type="number"], .form-group textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          font-size: 0.9rem;
        }
        .form-group input:focus, .form-group textarea:focus {
          border-color: #3b82f6;
          outline: none;
        }
        .disabled-input {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .save-btn {
          padding: 10px 20px;
          background: #3b82f6;
          border: none;
          color: white;
          font-weight: 800;
          border-radius: 10px;
          cursor: pointer;
        }
        .cancel-btn {
          padding: 10px 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          font-weight: 800;
          border-radius: 10px;
          cursor: pointer;
        }
        .empty-discovery {
          text-align: center;
          padding: 30px;
          color: rgba(255,255,255,0.4);
          font-size: 0.95rem;
        }
        .empty-discovery span {
          font-size: 2rem;
          margin-bottom: 10px;
          display: block;
        }
        .interviews-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }
        .interview-item-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 18px;
        }
        .interview-item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.8rem;
        }
        .interview-date {
          color: rgba(255,255,255,0.4);
        }
        .pay-badge {
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 800;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .pay-badge.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .interview-item-body p {
          margin: 6px 0;
          font-size: 0.88rem;
          color: rgba(255,255,255,0.8);
        }
        .interview-item-tracking {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed rgba(255,255,255,0.05);
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Timeline styles */
        .timeline-section-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 30px;
        }
        .journey-timeline {
          position: relative;
          padding-left: 20px;
          margin-top: 15px;
        }
        [dir="rtl"] .journey-timeline {
          padding-left: 0;
          padding-right: 20px;
        }
        .journey-timeline::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 5px;
          bottom: 5px;
          width: 2px;
          background: rgba(255, 255, 255, 0.05);
        }
        [dir="rtl"] .journey-timeline::before {
          left: auto;
          right: 5px;
        }
        .timeline-event-item {
          position: relative;
          margin-bottom: 25px;
          padding-left: 15px;
        }
        [dir="rtl"] .timeline-event-item {
          padding-left: 0;
          padding-right: 15px;
        }
        .timeline-event-dot {
          position: absolute;
          left: -4px;
          top: 6px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        [dir="rtl"] .timeline-event-dot {
          left: auto;
          right: -4px;
        }
        .timeline-event-content {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .timeline-event-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }
        .timeline-event-date {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
        }
        .timeline-event-meta {
          margin: 8px 0 0;
          font-size: 0.75rem;
          background: rgba(0,0,0,0.15);
          padding: 8px;
          border-radius: 6px;
          overflow-x: auto;
          font-family: monospace;
          color: rgba(255,255,255,0.6);
        }
      ` }} />

      <header className="page-header">
        <Link href={`/${locale}/staff/intelligence/customers`} className="back-link">
          {isRTL ? '← عودة لقائمة العملاء' : '← Back to Directory'}
        </Link>
        {isPending && <span style={{ color: '#f7d46b', fontWeight: 'bold' }}>⏳ Saving...</span>}
      </header>

      {/* Profile summary */}
      <section className="c-profile-card">
        <div className="c-avatar-wrap">
          <div className="c-avatar">
            {segments.includes('WHALE') ? '🐳' : '👤'}
          </div>
          <h2 className="c-fullname">{customer.full_name}</h2>
          <span className="c-code-badge">{customer.customer_code}</span>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '15px' }}>
            {segments.map(s => {
              const seg = availableSegments.find(as => as.code === s);
              return (
                <span
                  key={s}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: seg ? `${seg.color}15` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${seg ? `${seg.color}30` : 'rgba(255,255,255,0.1)'}`,
                    color: seg ? seg.color : '#ffffff'
                  }}
                >
                  {isRTL ? seg?.label_ar.split(' ')[1] || s : seg?.label_en.split(' ')[1] || s}
                </span>
              );
            })}
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</span>
            <span className="info-value">{customer.email || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</span>
            <span className="info-value">{customer.phone_number_normalized || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isRTL ? 'اللغة المفضلة' : 'Preferred Language'}</span>
            <span className="info-value" style={{ textTransform: 'uppercase' }}>{customer.preferred_language || 'ar'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isRTL ? 'تاريخ التسجيل' : 'Registered At'}</span>
            <span className="info-value">
              {customer.created_at ? new Date(customer.created_at).toLocaleDateString(locale) : '-'}
            </span>
          </div>
        </div>
      </section>

      {/* Control Segment toggles */}
      <section className="segments-control-card">
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
          🐳 {isRTL ? 'التحكم الاستراتيجي في تصنيف العميل' : 'Customer Strategic Segment Controls'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '5px 0 0' }}>
          {isRTL 
            ? 'تعديل مستوى العميل وتصنيفه كعميل ضخم (Whale) لتطبيق استراتيجيات البيع وتوجيه عروض B2B المناسبة.'
            : 'Toggle customer priority level to tag high-ticket VIP clients (Whales) for enterprise sourcing workflows.'}
        </p>

        <div className="segment-toggles-grid">
          {availableSegments.map(seg => {
            const isActive = segments.includes(seg.code);
            return (
              <button
                key={seg.code}
                className={`segment-toggle-btn ${isActive ? 'active' : ''}`}
                style={{
                  borderColor: isActive ? seg.color : undefined,
                  background: isActive ? `${seg.color}08` : undefined
                }}
                onClick={() => handleToggleSegment(seg.code)}
              >
                <span style={{ color: isActive ? seg.color : undefined }}>
                  {isRTL ? seg.label_ar : seg.label_en}
                </span>
                <div className="toggle-switch">
                  <div className="toggle-dot" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live intelligence metrics */}
      <section className="intel-scores-row">
        <div className="score-box">
          <div className="score-val">{scores.seriousness_score || 85}%</div>
          <div className="score-lbl">{isRTL ? 'معدل الجدية' : 'Seriousness Score'}</div>
        </div>
        <div className="score-box">
          <div className="score-val">{scores.loyalty_score || 75}%</div>
          <div className="score-lbl">{isRTL ? 'معدل الولاء والتكرار' : 'Loyalty Score'}</div>
        </div>
        <div className="score-box">
          <div className="score-val">{scores.conversion_score || 60}%</div>
          <div className="score-lbl">{isRTL ? 'معدل التحويل المتوقع' : 'Expected Conversion'}</div>
        </div>
      </section>

      {/* Customer Discovery Section */}
      <CustomerDiscoverySection
        customer={customer}
        interviews={interviews}
        locale={locale}
        isRTL={isRTL}
      />

      {/* Customer Journey / Activity Timeline */}
      <section className="timeline-section-card">
        <h3 className="card-title">👣 {isRTL ? 'تتبع نشاط العميل وحركته على المنصة' : 'Customer Platform Activity Journey'}</h3>
        {trackingEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
            {isRTL ? 'لا يوجد أحداث تتبع مسجلة لهذا العميل بعد.' : 'No tracking events logged for this customer yet.'}
          </div>
        ) : (
          <div className="journey-timeline">
            {trackingEvents.map((evt: any) => {
              let label = evt.event_type;
              let color = '#3b82f6';
              if (evt.event_type === 'request_created') { label = isRTL ? 'أنشأ طلباً جديداً' : 'Created a new request'; color = '#f59e0b'; }
              else if (evt.event_type === 'request_completed') { label = isRTL ? 'اكتمل الطلب' : 'Request completed'; color = '#10b981'; }
              else if (evt.event_type === 'payment_made') { label = isRTL ? 'أتم عملية دفع' : 'Completed a payment'; color = '#10b981'; }
              else if (evt.event_type === 'contact_interaction') { label = isRTL ? 'تواصل مع الدعم/المبيعات' : 'Contacted support/sales'; color = '#8b5cf6'; }
              else if (evt.event_type === 'visitor_landed') { label = isRTL ? 'دخل للموقع' : 'Visited platform'; color = '#64748b'; }

              return (
                <div key={evt.id} className="timeline-event-item">
                  <div className="timeline-event-dot" style={{ backgroundColor: color }} />
                  <div className="timeline-event-content">
                    <div className="timeline-event-title">
                      <strong>{label}</strong>
                      <span className="timeline-event-date">{new Date(evt.occurred_at).toLocaleString(locale)}</span>
                    </div>
                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <pre className="timeline-event-meta">{JSON.stringify(evt.metadata, null, 2)}</pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="details-sections-grid">
        {/* Sourcing requests list */}
        <section className="table-card">
          <h3 className="card-title">📋 {isRTL ? 'سجل طلبات البحث عن المنتجات' : 'Sourcing Request History'}</h3>
          <table className="list-table">
            <thead>
              <tr>
                <th>{isRTL ? 'كود الطلب' : 'Code'}</th>
                <th>{isRTL ? 'العنوان' : 'Title'}</th>
                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 800 }}>{req.request_code}</td>
                  <td>{req.title}</td>
                  <td>
                    <span className="status-badge">{req.current_status}</span>
                  </td>
                  <td>{new Date(req.created_at).toLocaleDateString(locale)}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                    {isRTL ? 'لا يوجد طلبات لهذا العميل.' : 'No requests logged for this customer.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Messaging logs */}
        <section className="table-card">
          <h3 className="card-title">✉️ {isRTL ? 'سجل الاتصالات والرسائل الصادرة' : 'Outbound Messaging Log'}</h3>
          <table className="list-table">
            <thead>
              <tr>
                <th>{isRTL ? 'القناة' : 'Channel'}</th>
                <th>{isRTL ? 'القالب' : 'Template'}</th>
                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(msg => (
                <tr key={msg.id}>
                  <td style={{ textTransform: 'capitalize', fontWeight: 800 }}>{msg.channel}</td>
                  <td>{msg.template_code || '-'}</td>
                  <td>
                    <span className="status-badge" style={{ color: msg.status === 'sent' ? '#10b981' : undefined }}>
                      {msg.status}
                    </span>
                  </td>
                  <td>{new Date(msg.created_at).toLocaleDateString(locale)}</td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                    {isRTL ? 'لا يوجد رسائل مسجلة.' : 'No messages sent to this customer.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function CustomerDiscoverySection({
  customer,
  interviews,
  locale,
  isRTL
}: {
  customer: any;
  interviews: any[];
  locale: string;
  isRTL: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    what_wanted_to_buy: '',
    how_searches_currently: '',
    biggest_frustration: '',
    will_pay: false,
    potential_commission_egp: 0,
    additional_notes: '',
    visited_pages: '',
    used_features: ''
  });
  const [savingInterview, setSavingInterview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate discovery stats
  const totalInterviews = interviews.length;
  const willPayCount = interviews.filter((i: any) => i.will_pay).length;
  const avgCommission = totalInterviews > 0 
    ? Math.round(interviews.reduce((sum: number, i: any) => sum + Number(i.potential_commission_egp || 0), 0) / totalInterviews)
    : 0;

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInterview(true);
    setErrorMsg('');
    try {
      const { saveCustomerDiscoveryInterviewAction } = await import('../actions');
      await saveCustomerDiscoveryInterviewAction(customer.id, formData, locale);
      setShowAddForm(false);
      setFormData({
        what_wanted_to_buy: '',
        how_searches_currently: '',
        biggest_frustration: '',
        will_pay: false,
        potential_commission_egp: 0,
        additional_notes: '',
        visited_pages: '',
        used_features: ''
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving interview');
    } finally {
      setSavingInterview(false);
    }
  };

  return (
    <section className="discovery-section-card">
      <div className="discovery-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🎤</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
              {isRTL ? 'Customer Discovery — التعرف على العملاء' : 'Customer Discovery'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '3px 0 0' }}>
              {isRTL ? 'أهم صفحة في المشروع – أهم من أي Feature (بعد 50 مقابلة ستتعلم أكثر من سنة تخطيط)' : 'Understand your customer to plan features effectively.'}
            </p>
          </div>
        </div>
      </div>

      {/* Discovery Stats Row */}
      <div className="discovery-stats-row">
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{totalInterviews}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'مقابلة' : 'Interviews'}</div>
        </div>
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{willPayCount}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'سيدفع' : 'Will Pay'}</div>
        </div>
        <div className="discovery-stat-box">
          <div className="discovery-stat-val">{avgCommission} {isRTL ? 'جنيه' : 'EGP'}</div>
          <div className="discovery-stat-lbl">{isRTL ? 'متوسط الدفع' : 'Avg Pay'}</div>
        </div>
      </div>

      {!showAddForm ? (
        <button className="add-discovery-btn" onClick={() => setShowAddForm(true)}>
          + {isRTL ? 'إضافة مقابلة عميل' : 'Add Customer Interview'}
        </button>
      ) : (
        <form className="discovery-form" onSubmit={handleSaveInterview}>
          <h4 style={{ margin: '0 0 20px', fontWeight: 900, color: '#3b82f6' }}>
            {isRTL ? 'مقابلة عميل جديدة' : 'New Customer Discovery Interview'}
          </h4>

          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px', fontWeight: 750 }}>⚠️ {errorMsg}</div>}

          <div className="form-group">
            <label>{isRTL ? 'اسم العميل' : 'Customer Name'}</label>
            <input type="text" value={customer.full_name} disabled className="disabled-input" />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'ماذا أراد شراؤه؟' : 'What did they want to buy?'}</label>
            <input 
              type="text" 
              required
              value={formData.what_wanted_to_buy} 
              onChange={e => setFormData({ ...formData, what_wanted_to_buy: e.target.value })} 
              placeholder={isRTL ? 'مثال: ملابس جملة، خامات مصانع...' : 'e.g. bulk clothes, factory materials...'} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'كيف يبحث حالياً؟ (واتساب، دونجار، إلخ)' : 'How do they currently search?'}</label>
            <input 
              type="text" 
              required
              value={formData.how_searches_currently} 
              onChange={e => setFormData({ ...formData, how_searches_currently: e.target.value })} 
              placeholder={isRTL ? 'مثال: جروبات واتساب، تجار الموسكي...' : 'e.g. WhatsApp groups, local market...'} 
            />
          </div>

          <div className="form-group">
            <label>{isRTL ? 'ما أكثر شيء يضايقه في الشراء الحالي؟' : 'What is their biggest frustration?'}</label>
            <textarea 
              required
              rows={3}
              value={formData.biggest_frustration} 
              onChange={e => setFormData({ ...formData, biggest_frustration: e.target.value })} 
              placeholder={isRTL ? 'مثال: عدم وضوح الأسعار، صعوبة الشحن، التجار غير موثوقين...' : 'e.g. pricing lack of clarity, shipping difficulties...'} 
            />
          </div>

          <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="will_pay" 
              checked={formData.will_pay} 
              onChange={e => setFormData({ ...formData, will_pay: e.target.checked })} 
            />
            <label htmlFor="will_pay" style={{ cursor: 'pointer', fontWeight: 800 }}>{isRTL ? 'سيدفع' : 'Will Pay'}</label>
          </div>

          {formData.will_pay && (
            <div className="form-group">
              <label>{isRTL ? 'كم سيدفع عمولة؟ (جنيه)' : 'How much commission will they pay? (EGP)'}</label>
              <input 
                type="number" 
                value={formData.potential_commission_egp} 
                onChange={e => setFormData({ ...formData, potential_commission_egp: Number(e.target.value) })} 
                placeholder="0" 
              />
            </div>
          )}

          <div className="form-group">
            <label>{isRTL ? 'ملاحظات إضافية / أهم شيء قاله...' : 'Additional notes / key takeaways...'}</label>
            <textarea 
              rows={3}
              value={formData.additional_notes} 
              onChange={e => setFormData({ ...formData, additional_notes: e.target.value })} 
            />
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px', marginTop: '15px' }}>
            <h5 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              {isRTL ? 'تتبع نشاط العميل على الموقع (اختياري):' : 'Client Activity Tracking (Optional):'}
            </h5>
            <div className="form-group">
              <label>{isRTL ? 'الصفحات التي زارها (مثال: الرئيسية، إرسال طلب)' : 'Pages Visited (e.g. Home, Submit Request)'}</label>
              <input 
                type="text" 
                value={formData.visited_pages} 
                onChange={e => setFormData({ ...formData, visited_pages: e.target.value })} 
                placeholder={isRTL ? 'الرئيسية، إرسال طلب' : 'Home, Submit request'} 
              />
            </div>
            <div className="form-group">
              <label>{isRTL ? 'الميزات التي استخدمها' : 'Features Used'}</label>
              <input 
                type="text" 
                value={formData.used_features} 
                onChange={e => setFormData({ ...formData, used_features: e.target.value })} 
                placeholder={isRTL ? 'طلب تسعير، تتبع الشحنة' : 'Price request, order tracking'} 
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={savingInterview} className="save-btn">
              {savingInterview ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ المقابلة 💾' : 'Save Interview 💾')}
            </button>
            <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Interviews List */}
      <div className="interviews-list" style={{ marginTop: '25px' }}>
        <h4 style={{ margin: '0 0 15px', fontWeight: 800 }}>
          {isRTL ? `المقابلات المسجلة (${totalInterviews})` : `Logged Interviews (${totalInterviews})`}
        </h4>
        {interviews.length === 0 ? (
          <div className="empty-discovery">
            <span>🎤</span>
            <p>{isRTL ? 'لا توجد مقابلات بعد — ابدأ بأول عميل' : 'No interviews logged yet — start with the first client.'}</p>
          </div>
        ) : (
          <div className="interviews-grid">
            {interviews.map((item: any) => (
              <div key={item.id} className="interview-item-card">
                <div className="interview-item-header">
                  <span className="interview-date">{new Date(item.created_at).toLocaleString(locale)}</span>
                  {item.will_pay ? (
                    <span className="pay-badge active">{isRTL ? 'سيدفع' : 'Will Pay'}</span>
                  ) : (
                    <span className="pay-badge">{isRTL ? 'سيدفع' : 'Will Pay'}</span>
                  )}
                </div>
                <div className="interview-item-body">
                  <p><strong>{isRTL ? 'ماذا أراد شراءه:' : 'What they wanted:'}</strong> {item.what_wanted_to_buy}</p>
                  <p><strong>{isRTL ? 'كيف يبحث حالياً:' : 'How they search:'}</strong> {item.how_searches_currently}</p>
                  <p><strong>{isRTL ? 'المشكلة الكبرى:' : 'Biggest frustration:'}</strong> {item.biggest_frustration}</p>
                  {item.potential_commission_egp > 0 && (
                    <p><strong>{isRTL ? 'العمولة المتوقعة:' : 'Expected Commission:'}</strong> <span style={{ color: '#10b981', fontWeight: 900 }}>{item.potential_commission_egp} EGP</span></p>
                  )}
                  {item.additional_notes && (
                    <p><strong>{isRTL ? 'ملاحظات:' : 'Notes:'}</strong> {item.additional_notes}</p>
                  )}
                  {(item.visited_pages || item.used_features) && (
                    <div className="interview-item-tracking">
                      {item.visited_pages && <div><strong>{isRTL ? 'الصفحات:' : 'Pages:'}</strong> {item.visited_pages}</div>}
                      {item.used_features && <div><strong>{isRTL ? 'الميزات:' : 'Features:'}</strong> {item.used_features}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
