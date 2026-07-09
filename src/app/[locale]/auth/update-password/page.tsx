import { updatePassword } from "../actions";
import Link from "next/link";
import { Locale } from "@/lib/i18n/config";
import HeaderLocaleDropdown from "@/components/HeaderLocaleDropdown";
import HeaderLogo from "@/components/HeaderLogo";

export default async function UpdatePasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';

  return (
    <div className="auth-page premium-gradient">
      <header className="auth-header">
        <div className="auth-header-inner">
          <HeaderLogo locale={locale} />
          <HeaderLocaleDropdown currentLocale={locale as Locale} />
        </div>
      </header>

      <main className="auth-main animate-in">
        <div className="auth-card-container">
          <div className="auth-glow" />

          <div className="card glass-card auth-card">
            <div className="auth-form-header">
              <div className="portal-badge">
                <span className="badge-icon">🔒</span>
                <span className="badge-text">{isAr ? "تعيين كلمة المرور" : "Set Password"}</span>
              </div>
              <h1>{isAr ? "تغيير كلمة المرور" : "Change Password"}</h1>
              <p className="muted-foreground">
                {isAr 
                  ? "أدخل كلمة المرور الجديدة لتحديث حسابك والتمكن من الدخول." 
                  : "Enter your new password to update your account and login."}
              </p>
            </div>

            {sp.error && <div className="alert alert-error">{decodeURIComponent(sp.error)}</div>}

            <form action={updatePassword} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder={isAr ? '6 أحرف على الأقل' : 'At least 6 characters'}
                  required
                  className="premium-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder={isAr ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                  required
                  className="premium-input"
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                <Link href={`/${locale}/auth/login`} className="link">
                  {isAr ? "← العودة لتسجيل الدخول" : "← Back to Login"}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .auth-page {
          --gold: #d4a63c;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle at 20% 10%, rgba(212, 166, 60, 0.08), transparent 30%),
            radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1), transparent 28%),
            #020617;
          color: #ffffff;
        }

        .auth-header {
          width: 100%;
          padding: 1.4rem 2rem 0.8rem;
          position: relative;
          z-index: 10;
        }

        .auth-header-inner {
          max-width: 1380px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          direction: ltr !important;
        }

        .auth-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
        }

        .auth-card-container {
          width: 100%;
          max-width: 375px;
          position: relative;
          transform: translateY(-10%);
        }

        .auth-glow {
          position: absolute;
          width: 150%;
          height: 150%;
          top: -25%;
          left: -25%;
          background: radial-gradient(circle, rgba(212, 166, 60, 0.1), transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .auth-card {
          position: relative;
          z-index: 1;
          padding: 2.25rem 1.85rem;
          border-radius: 28px;
          background: rgba(15, 23, 42, 0.7) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        }

        .auth-form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-form-header h1 {
          font-size: 2.25rem;
          margin: 0 0 0.65rem;
          letter-spacing: -0.04em;
          font-weight: 900;
          color: #ffffff;
        }

        .auth-form-header p {
          font-size: 0.95rem;
          opacity: 0.75;
          margin: 0;
          line-height: 1.5;
        }

        .portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(212,166,60,0.15);
          border: 1px solid rgba(212,166,60,0.3);
          padding: 0.4rem 1rem;
          border-radius: 20px;
          margin-bottom: 1.25rem;
        }

        .portal-badge .badge-icon {
          font-size: 1.1rem;
        }

        .portal-badge .badge-text {
          color: #fcd34d;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          text-align: start;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.92);
        }

        .premium-input {
          background: rgba(2, 6, 23, 0.65) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 0.95rem 1rem !important;
          border-radius: 14px !important;
          font-size: 1rem !important;
          transition: all 0.2s !important;
          color: #ffffff !important;
        }

        .premium-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .premium-input:focus {
          border-color: rgba(212, 166, 60, 0.42) !important;
          box-shadow: 0 0 0 4px rgba(212, 166, 60, 0.1) !important;
          outline: none;
        }

        .auth-submit-btn {
          margin-top: 0.75rem;
          background: var(--gold);
          color: #020617;
          font-weight: 900;
          padding: 1rem !important;
          border-radius: 14px !important;
          font-size: 1rem !important;
          box-shadow: 0 10px 28px rgba(212, 166, 60, 0.2);
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }

        .auth-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 34px rgba(212, 166, 60, 0.28);
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .auth-footer p {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.55);
          margin: 0;
        }

        .link {
          color: #f7d46b;
          font-weight: 800;
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          text-align: start;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        @media (max-width: 768px) {
          .auth-header {
            padding: 1rem 1.25rem 0.5rem;
          }

          .auth-header-inner {
            flex-wrap: nowrap;
            justify-content: space-between;
          }

          .auth-main {
            padding: 1rem;
          }

          .auth-card-container {
            transform: none;
            margin-top: 1rem;
            margin-left: auto;
            margin-right: auto;
          }

          .auth-card {
            padding: 1.85rem 1.25rem;
          }

          .auth-form-header h1 {
            font-size: 1.9rem;
          }
        }
      `}</style>
    </div>
  );
}
