import React from 'react';
import { Avatar, ProfileCard, EmptyState, LoadingSkeleton, ErrorState, SuccessState } from './States';
import { Button } from './Button';

export default {
  title: 'Design System/UI/States',
};

export const AvatarDemo = () => (
  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
    <Avatar size="sm" name="Ahmed Ali" />
    <Avatar size="md" name="Omar Hassan" />
    <Avatar size="lg" name="Fatma Ibrahim" />
  </div>
);

export const Profile = () => (
  <div style={{ maxWidth: '300px' }}>
    <ProfileCard name="كريم محمود / Karim Mahmoud" role="مسؤول المشتريات / Procurement Officer" email="karim@findora.app" />
  </div>
);

export const Empty = () => (
  <EmptyState
    title="لا توجد طلبات بعد / No requests yet"
    description="لم تقم بإرسال أي طلب لعروض الأسعار حتى الآن. ابدأ بإرسال أول طلب الآن."
    action={<Button variant="primary">أرسل طلبك الأول / Submit Request</Button>}
  />
);

export const Skeleton = () => (
  <div style={{ maxWidth: '400px' }}>
    <LoadingSkeleton rows={3} />
  </div>
);

export const ErrorDemo = () => (
  <div style={{ maxWidth: '400px' }}>
    <ErrorState message="حدث خطأ أثناء تحميل البيانات من السيرفر." onRetry={() => alert('Retrying...')} />
  </div>
);

export const SuccessDemo = () => (
  <div style={{ maxWidth: '400px' }}>
    <SuccessState message="تم تسجيل الحساب الجديد بنجاح!" action={<Button variant="secondary">انتقل للوحة التحكم</Button>} />
  </div>
);
