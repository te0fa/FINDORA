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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError(isAr ? 'برجاء إدخال البريد الإلكتروني' : 'Please enter your email address');
      return;
    }

    if (!password) {
      setError(isAr ? 'برجاء إدخال كلمة المرور' : 'Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من البيانات.' : 'Login failed. Please check your credentials.')
        );
      }

      setSuccessMsg(isAr ? 'تم تسجيل الدخول بنجاح! جاري التوجيه...' : 'Login successful! Redirecting...');
      setTimeout(() => {
        router.push(`/${locale}${data.redirectUrl || '/vendor/auctions'}`);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'hsl(220,25%,8%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Outfit','Cairo',sans-serif",
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 20,
          padding: 32,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'white' }}>
            {isAr ? 'تسجيل دخول الموردين' : 'Vendor Login'}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginTop: 6 }}>
            {isAr ? 'أدخل البريد الإلكتروني وكلمة المرور للمتابعة' : 'Enter your email and password to continue'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 10,
              color: '#10b981',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              disabled={loading}
              autoComplete="email"
              dir="ltr"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {isAr ? 'كلمة المرور *' : 'Password *'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              dir="ltr"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? isAr
                ? 'جاري التحقق...'
                : 'Signing in...'
              : isAr
              ? 'تسجيل الدخول'
              : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: 24,
            paddingTop: 20,
            textAlign: 'center',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isAr ? 'ليس لديك حساب بعد؟ ' : "Don't have an account? "}
          </span>
          <Link
            href={`/${locale}/vendor/register`}
            style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
          >
            {isAr ? 'سجّل كمورد الآن' : 'Register now'}
          </Link>
        </div>
      </div>
    </div>
  );
}
