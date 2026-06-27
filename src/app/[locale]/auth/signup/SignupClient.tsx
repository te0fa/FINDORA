'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { sendSignupOtp, verifySignupOtp, signup } from '../actions'

interface SignupClientProps {
  locale: string
  dict: any
  errorMsg?: string
}

export default function SignupClient({ locale, dict, errorMsg }: SignupClientProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(errorMsg || null)
  
  // Form Data
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')

  const isRTL = locale === 'ar'

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError(null)
    setLoading(true)

    try {
      const res = await sendSignupOtp(phone)
      if (res.error) {
        if (res.error === 'phone_in_use') setClientError(isRTL ? 'رقم الهاتف مستخدم بالفعل.' : 'Phone number is already in use.')
        else if (res.error === 'invalid_phone') setClientError(isRTL ? 'رقم الهاتف غير صحيح.' : 'Invalid phone number.')
        else setClientError(isRTL ? 'حدث خطأ في الإرسال.' : 'Error sending OTP.')
        setLoading(false)
        return
      }

      setStep(2)
    } catch (err) {
      setClientError(isRTL ? 'حدث خطأ في النظام.' : 'System error.')
    }
    setLoading(false)
  }

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError(null)
    setLoading(true)

    try {
      const res = await verifySignupOtp(phone, otp)
      if (res.error) {
        setClientError(isRTL ? 'رمز التفعيل غير صحيح.' : 'Invalid verification code.')
        setLoading(false)
        return
      }

      // Proceed to signup
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('email', email)
      formData.append('phone', phone)
      formData.append('password', password)

      // The server action handles redirect on success or error on failure
      await signup(formData)
    } catch (err) {
      setClientError(isRTL ? 'حدث خطأ أثناء التسجيل.' : 'Error during signup.')
      setLoading(false)
    }
  }

  return (
    <div className="card glass-card auth-card">
      <div className="auth-form-header">
        <h1>{dict.auth.get_started}</h1>
        <p className="muted-foreground">
          {step === 1 ? dict.auth.sign_up_desc : (isRTL ? 'تأكيد رقم الهاتف' : 'Verify Phone Number')}
        </p>
      </div>

      {clientError && <div className="alert alert-error">{clientError}</div>}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="auth-form">
          <div className="form-group">
            <label htmlFor="fullName">{dict.auth.full_name}</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={dict.auth.name_placeholder}
              required
              className="premium-input"
              data-testid="signup-name-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{dict.auth.email}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.auth.email_placeholder}
              required
              className="premium-input"
              data-testid="signup-email-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isRTL ? '01xxxxxxxxx' : 'Phone number'}
              required
              className="premium-input"
              dir="ltr"
              data-testid="signup-phone-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{dict.auth.password}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={dict.auth.password_placeholder}
              required
              minLength={6}
              className="premium-input"
              data-testid="signup-password-input"
            />
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn" data-testid="signup-submit">
            {loading ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'متابعة' : 'Continue')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp">{isRTL ? 'رمز التفعيل' : 'Verification Code'}</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="premium-input text-center text-xl tracking-widest"
              dir="ltr"
              maxLength={6}
            />
            <p className="text-xs text-white/50 mt-2 text-center">
              {isRTL ? `تم إرسال كود التفعيل إلى ${phone}` : `Code sent to ${phone}`}
            </p>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (isRTL ? 'جاري التأكيد...' : 'Verifying...') : (isRTL ? 'تأكيد وإنشاء الحساب' : 'Verify & Sign Up')}
          </button>

          <button 
            type="button" 
            onClick={() => setStep(1)} 
            className="mt-4 text-sm text-brand-gold hover:underline bg-transparent border-none cursor-pointer"
          >
            {isRTL ? 'تعديل البيانات' : 'Edit details'}
          </button>
        </form>
      )}

      <div className="auth-footer">
        <p>
          {dict.auth.already_have}{" "}
          <Link href={`/${locale}/auth/login`} className="link">
            {dict.auth.log_in}
          </Link>
        </p>
      </div>
    </div>
  )
}
