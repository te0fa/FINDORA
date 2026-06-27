'use client'

import { useState } from 'react'
import { updateProfile, updatePassword } from './actions'

interface SettingsClientProps {
  customer: {
    id: string
    full_name: string
    email: string | null
    phone_number_raw: string | null
  }
  locale: string
}

export default function SettingsClient({ customer, locale }: SettingsClientProps) {
  const isAr = locale === 'ar'

  // State for Profile update
  const [fullName, setFullName] = useState(customer.full_name || '')
  const [phone, setPhone] = useState(customer.phone_number_raw || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // State for Password update
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)

    try {
      const res = await updateProfile(customer.id, fullName, phone)
      if (res.success) {
        setProfileMsg({
          type: 'success',
          text: isAr ? 'تم تحديث البيانات الشخصية بنجاح' : 'Profile updated successfully.'
        })
      } else {
        setProfileMsg({
          type: 'error',
          text: res.error || (isAr ? 'حدث خطأ أثناء تحديث البيانات' : 'An error occurred while updating profile.')
        })
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMsg(null)

    try {
      const res = await updatePassword(password, confirmPassword)
      if (res.success) {
        setPassword({ password: '' } as any) // Reset values
        setPassword('')
        setConfirmPassword('')
        setPasswordMsg({
          type: 'success',
          text: isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password updated successfully.'
        })
      } else {
        setPasswordMsg({
          type: 'error',
          text: res.error || (isAr ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'An error occurred while updating password.')
        })
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Account summary cards */}
      <div className="md:col-span-1 space-y-6">
        <div className="card glass-card p-6 border border-white/5 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px'
        }}>
          {/* Decorative glowing gradient circle */}
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-accent/10 blur-xl"></div>
          
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-amber-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-[0_0_20px_rgba(212,166,60,0.25)]" style={{ background: 'linear-gradient(135deg, #d4a63c, #f59e0b)' }}>
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{fullName || (isAr ? 'عميل فايندورا' : 'Findora Client')}</h3>
            <p className="text-xs text-white/40 mb-3">{customer.email}</p>
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-accent">
              {isAr ? 'حساب نشط' : 'Active Account'}
            </span>
          </div>

          <div className="border-t border-white/10 mt-6 pt-6 space-y-4 text-sm text-white/60">
            <div className="flex justify-between">
              <span>{isAr ? 'معرف العميل' : 'Client ID'}</span>
              <span className="font-mono text-white/80">{customer.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'اللغة المفضلة' : 'Language'}</span>
              <span className="text-white/80">{isAr ? 'العربية' : 'English'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings Forms */}
      <div className="md:col-span-2 space-y-8">
        {/* Profile Card */}
        <div className="card glass-card p-8 border border-white/5 relative overflow-hidden" style={{
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px'
        }}>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {isAr ? 'معلومات الملف الشخصي' : 'Profile Settings'}
          </h2>
          <p className="text-sm text-white/40 mb-6 border-b border-white/5 pb-4">
            {isAr ? 'تحديث اسمك وبيانات الاتصال الخاصة بك' : 'Update your public name and contact details.'}
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {profileMsg && (
              <div className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                profileMsg.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {profileMsg.type === 'success' ? '✓' : '⚠️'}
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  {isAr ? 'الاسم بالكامل' : 'Full Name'}
                </label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field" 
                  placeholder={isAr ? 'أدخل اسمك بالكامل' : 'Enter your full name'}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  {isAr ? 'رقم الهاتف المحمول' : 'Phone Number'}
                </label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field" 
                  placeholder="+201XXXXXXXXX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {isAr ? 'البريد الإلكتروني (غير قابل للتعديل)' : 'Email Address (Non-editable)'}
              </label>
              <input 
                type="email" 
                disabled
                defaultValue={customer.email || ''} 
                className="input-field opacity-50 cursor-not-allowed bg-white/5" 
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit" 
                disabled={profileLoading} 
                className="btn-accent py-3 px-8 text-sm font-bold shadow-[0_4px_20px_rgba(212,166,60,0.15)] transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ width: 'auto' }}
              >
                {profileLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>
          </form>
        </div>

        {/* Security Card */}
        <div className="card glass-card p-8 border border-white/5 relative overflow-hidden" style={{
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px'
        }}>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            {isAr ? 'تغيير كلمة المرور' : 'Update Password'}
          </h2>
          <p className="text-sm text-white/40 mb-6 border-b border-white/5 pb-4">
            {isAr ? 'تأمين حسابك بكلمة مرور جديدة قوية' : 'Secure your account with a strong new password.'}
          </p>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {passwordMsg && (
              <div className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                passwordMsg.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {passwordMsg.type === 'success' ? '✓' : '⚠️'}
                {passwordMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field" 
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field" 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit" 
                disabled={passwordLoading} 
                className="btn-secondary py-3 px-8 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ width: 'auto', background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {passwordLoading ? (isAr ? 'جاري التحديث...' : 'Updating...') : (isAr ? 'تحديث كلمة المرور' : 'Update Password')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
