'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VendorLoginClientProps {
  locale: string;
}

export default function VendorLoginClient({ locale }: VendorLoginClientProps) {
  const isAr = locale === 'ar';
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1); // 1: phone, 2: OTP code
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError(isAr ? 'برجاء إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }

    const phoneRegex = /^01[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError(isAr ? 'رقم الهاتف المصري غير صحيح' : 'Invalid Egyptian phone number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, purpose: 'vendor_auth' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      setStep(2);
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setSuccessMsg(isAr ? 'تم إرسال كود التحقق بنجاح!' : 'Verification code sent successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError(isAr ? 'كود التحقق يجب أن يتكون من 6 أرقام' : 'Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      setSuccessMsg(isAr ? 'تم تسجيل الدخول بنجاح! جاري التوجيه...' : 'Login successful! Redirecting...');
      setTimeout(() => {
        router.push(`/${locale}/vendor/auctions`);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,25%,8%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Outfit','Cairo',sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      <div style={{ width: '100%', maxWidth: 440, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'white' }}>
            {isAr ? 'تسجيل دخول الموردين' : 'Vendor Login'}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginTop: 6 }}>
            {isAr ? 'أدخل رقم هاتفك لتلقي كود تسجيل الدخول' : 'Enter your phone to receive access code'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, color: '#ef4444', fontSize: '0.85rem', marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, color: '#10b981', fontSize: '0.85rem', marginBottom: 20 }}>
            ✅ {successMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>
                {isAr ? 'رقم الهاتف (الأساسي) *' : 'Phone Number (Primary) *'}
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 01009998877"
                disabled={loading}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال كود التحقق' : 'Send Verification Code')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>
                {isAr ? 'كود التحقق المتلقى *' : 'Verification Code *'}
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                disabled={loading}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '1.25rem', letterSpacing: '0.5em', textAlign: 'center', outline: 'none' }}
              />
              {devCode && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.4)', borderRadius: 6, fontSize: '0.8rem', color: '#818cf8', textAlign: 'center' }}>
                  {isAr ? `رمز التجريب المستلم: ${devCode}` : `Development Code: ${devCode}`}
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تسجيل الدخول' : 'Verify & Login')}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              {isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}
            </button>
          </form>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 24, paddingTop: 20, textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isAr ? 'ليس لديك حساب بعد؟ ' : "Don't have an account? "}
          </span>
          <Link href={`/${locale}/vendor/register`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
            {isAr ? 'سجّل كمورد الآن' : 'Register now'}
          </Link>
        </div>
      </div>
    </div>
  );
}
