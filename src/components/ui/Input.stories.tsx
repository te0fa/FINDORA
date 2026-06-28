import React from 'react';
import { Input, Textarea, Select, OTPInput, Checkbox, Toggle } from './Input';

export default {
  title: 'Design System/UI/Inputs',
};

export const TextInput = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
    <Input label="الاسم بالكامل / Full Name" placeholder="أدخل اسمك هنا" />
    <Input label="البريد الإلكتروني / Email Address" placeholder="name@domain.com" error="يرجى إدخال بريد إلكتروني صحيح" />
    <Input label="رقم الهاتف / Phone" placeholder="+201..." success={true} />
  </div>
);

export const AdvancedFields = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
    <Textarea label="وصف الطلب / Request Description" placeholder="اكتب تفاصيل طلبك..." />
    <Select
      label="الفئة / Category"
      options={[
        { label: 'سوبرماركت / Supermarket', value: 'grocery' },
        { label: 'أدوات منزلية / Home Appliances', value: 'home' },
      ]}
    />
  </div>
);

export const OTPField = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
    <p>أدخل رمز التحقق / OTP Verification</p>
    <OTPInput length={4} onChange={(val) => console.log(val)} />
  </div>
);

export const SelectionFields = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <Checkbox label="أوافق على الشروط والأحكام / Agree to terms" />
    <Toggle label="تفعيل التنبيهات الذكية / Enable smart alerts" />
  </div>
);
