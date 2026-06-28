import React, { useState } from 'react';
import { Modal, Alert, Tooltip } from './Overlays';
import { Button } from './Button';

export default {
  title: 'Design System/UI/Overlays',
};

export const ModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="primary" onClick={() => setIsOpen(true)}>افتح النافذة / Open Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="تأكيد الطلب / Confirm Request">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-16)' }}>
          هل أنت متأكد من رغبتك في إرسال طلب عرض السعر هذا للموردين؟
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
          <Button variant="primary" onClick={() => setIsOpen(false)}>نعم، أرسل</Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
        </div>
      </Modal>
    </div>
  );
};

export const Alerts = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
    <Alert type="success" title="تم بنجاح / Succeeded">
      تم إرسال طلبك بنجاح للموردين. سيتم الرد خلال ساعات.
    </Alert>
    <Alert type="warning" title="تحذير / Warning">
      قد يتأخر الرد بسبب العطلة الرسمية الحالية.
    </Alert>
    <Alert type="danger" title="خطأ / Error">
      فشل الاتصال بالخادم. يرجى إعادة المحاولة.
    </Alert>
  </div>
);

export const Tooltips = () => (
  <div style={{ padding: '40px' }}>
    <Tooltip content="هذا السعر شامل ضريبة القيمة المضافة">
      <span style={{ cursor: 'pointer', borderBottom: '1px dotted var(--accent)' }}>شاهد تفاصيل السعر / Hover Me</span>
    </Tooltip>
  </div>
);
