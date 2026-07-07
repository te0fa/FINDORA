export const dynamic = 'force-dynamic'

import React from 'react'
import Link from 'next/link'
import { getRegistrationAvailability } from '@/lib/contributors/scarcity'
import { fetchPageContent } from '@/lib/cms/actions'
import EditableText from '@/components/cms/EditableText'
import HeaderLogo from '@/components/HeaderLogo'
import EarningsCalculator from '@/components/contributors/EarningsCalculator'

export const metadata = {
  title: 'Work With Us — FINDORA Partners',
  description: 'Join the Findora Scouts and Partners network and start earning.',
}

export default async function ContributorsLandingPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'
  
  // Fetch real database recruitment status
  const availability = await getRegistrationAvailability()
  const hasSlots = availability.has_slots
  const openSlots = availability.open_slots
  const isActive = availability.is_active

  // Fetch CMS Content
  const cmsContent = await fetchPageContent('/contributors')

  // Language switch
  const otherLocale = locale === 'ar' ? 'en' : 'ar'
  const otherLocaleLabel = locale === 'ar' ? 'English' : 'العربية'

  // Standard premium styled header styles
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: 'rgba(2, 6, 23, 0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  }

  return (
    <div className="min-h-screen bg-[hsl(220,25%,7%)] font-sans text-[hsl(220,15%,95%)]" dir={isAr ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .lang-switch-btn {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.2s;
        }
        .lang-switch-btn:hover {
          color: #fff !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        .role-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 32px;
          margin-top: 48px;
        }
        .role-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.35);
          padding: 32px;
          backdrop-filter: blur(20px);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .role-card:hover {
          transform: translateY(-6px);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }
        .badge-box {
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
          padding: 16px;
          margin-top: auto;
        }
        .team-leader-container {
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(2, 6, 23, 0.5));
          border: 1px solid rgba(139, 92, 246, 0.2);
          padding: 48px 40px;
          text-align: center;
          margin-top: 40px;
        }
        .track-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-top: 40px;
        }
        .track-card {
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.3);
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: inherit;
        }
        .hero-title {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1.2;
          color: #fff;
          margin-bottom: 24px;
          display: inline-block;
        }
        .hero-desc {
          font-size: 1.2rem;
          color: hsl(220,10%,65%);
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        .team-leader-title {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 16px;
          display: inline-block;
        }
        .team-leader-desc {
          font-size: 1rem;
          color: hsl(220,10%,70%);
          line-height: 1.6;
          margin-bottom: 32px;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        .apply-now-btn {
          display: inline-block;
          border-radius: 999px;
          background: hsl(258,89%,66%);
          padding: 16px 40px;
          font-size: 1.1rem;
          font-weight: 800;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(139,92,246,0.3);
          transition: all 0.2s;
        }
        .apply-now-btn:hover {
          background: hsl(258,89%,70%) !important;
          box-shadow: 0 8px 30px rgba(139,92,246,0.5) !important;
        }
      `.replace(/\r\n/g, '\n') }} />
      
      {/* 1. PREMIUM STYLED HEADER WITH LOGO & LANG SELECTOR */}
      <header style={headerStyle} dir="ltr">
        <div style={{ width: 140 }}>
          <HeaderLogo locale={locale} href={`/${locale}`} />
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            href={`/${otherLocale}/contributors`}
            className="lang-switch-btn"
          >
            {otherLocaleLabel}
          </Link>
          <Link
            href={`/${locale}/auth/login`}
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fff',
              textDecoration: 'none',
              background: 'hsl(258,89%,66%)',
              padding: '8px 18px',
              borderRadius: '999px',
              boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </header>

      {/* 2. RECRUITMENT STATUS BANNER */}
      <div style={{
        background: isActive ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(168,85,247,0.15))' : 'linear-gradient(90deg, rgba(234,179,8,0.15), rgba(220,15,95,0.05))',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <span style={{
          background: isActive ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
          color: isActive ? '#4ade80' : '#fbbf24',
          padding: '2px 10px',
          borderRadius: 999,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 900
        }}>
          {isActive ? (isAr ? '🟢 نشط الآن' : '🟢 Active') : (isAr ? '⏳ قريباً' : '⏳ Coming Soon')}
        </span>
        <span>
          {isActive 
            ? (isAr 
                ? `فرص التسجيل مفتوحة حالياً: متبقي ${openSlots} مكان شاغر ومعتمد للمناديب!` 
                : `Recruitment campaign is active: only ${openSlots} slots remaining for verification!`)
            : (isAr 
                ? 'حملة التسجيل الرسمية تبدأ قريباً. سجل الآن للانضمام إلى قائمة الانتظار HR والمراجعة المبكرة.' 
                : 'Official recruitment opens soon. Register now to join the HR priority waiting list.')}
        </span>
        {!isActive && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            ({isAr ? 'المقاعد المطلوبة: 15 مندوب، 5 موظفي معارض' : 'Required: 15 Field Scouts, 5 Store Insiders'})
          </span>
        )}
      </div>

      {/* 3. HERO SECTION */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <EditableText 
          as="h1"
          blockId="hero-title"
          serverContent={cmsContent['hero-title']}
          defaultText={isAr ? 'اشتغل معانا وابدأ تكسب 💰' : 'Work With Us & Start Earning 💰'}
          className="hero-title"
        />
        <br/>
        <EditableText 
          as="p"
          blockId="hero-desc"
          serverContent={cmsContent['hero-desc']}
          defaultText={isAr 
            ? 'سواء كنت بتفهم في السوق أو شغال في معرض أو بتعرف تدور كويس… تقدر تكسب معانا بكل بساطة وسهولة.' 
            : 'Whether you know the market well, work at a store, or just know how to find good deals… you can earn with us easily.'}
          className="hero-desc"
        />
        <Link
          href={`/${locale}/contributors/apply`}
          className="apply-now-btn"
        >
          {isActive ? (isAr ? 'قدّم طلب انضمام الآن' : 'Apply to Join Now') : (isAr ? 'انضم لقائمة الانتظار' : 'Join the Waiting List')}
        </Link>
      </section>

      {/* 4. INTERACTIVE CALCULATOR SECTION */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <EarningsCalculator locale={locale} />
      </section>

      {/* 5. ROLE SELECTION UI */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>
          {isAr ? 'اختار دورك وابدأ معنا' : 'Choose Your Role & Start'}
        </h2>
        
        <div className="role-grid">
          {/* Field Scout */}
          <div className="role-card">
            <div style={{ position: 'absolute', right: -40, top: -40, width: 120, height: 120, borderRadius: '50%', background: 'hsl(258,89%,66%)', opacity: 0.1, filter: 'blur(30px)' }}></div>
            <div style={{ marginBottom: 20, display: 'inline-flex', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', padding: '12px', fontSize: '2rem' }}>👨‍🔧</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{isAr ? 'مندوب سوق (Field Scout)' : 'Field Scout'}</h3>
            <p style={{ fontSize: '0.9rem', color: 'hsl(220,10%,65%)', lineHeight: 1.6, marginBottom: 24 }}>
              {isAr ? 'احصل على مكافآت مقابل النزول للبحث في السوق وتوفير أسعار حقيقية وتصوير المنتجات المطلوبة.' : 'Earn cash by researching the market, providing real prices, and taking product photos.'}
            </p>
            <div className="badge-box">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>{isAr ? '💰 كاش أساسي + بونص إضافي' : '💰 Base Cash + Bonus'}</span>
            </div>
          </div>

          {/* Store Insider */}
          <div className="role-card">
            <div style={{ position: 'absolute', right: -40, top: -40, width: 120, height: 120, borderRadius: '50%', background: 'hsl(43,96%,56%)', opacity: 0.1, filter: 'blur(30px)' }}></div>
            <div style={{ marginBottom: 20, display: 'inline-flex', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', padding: '12px', fontSize: '2rem' }}>🏪</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{isAr ? 'موظف معرض (Store Insider)' : 'Store Insider'}</h3>
            <p style={{ fontSize: '0.9rem', color: 'hsl(220,10%,65%)', lineHeight: 1.6, marginBottom: 24 }}>
              {isAr ? 'ضاعف مبيعات معرضك واحصل على عمولات حصرية، نحن نوفر لك عملاء جاهزين للشراء مباشرة من محلك.' : 'Increase your sales and earn commission. We bring ready-to-buy customers to your store.'}
            </p>
            <div className="badge-box">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>{isAr ? '💸 عمولة مبيعات + نقاط وهدايا' : '💸 Sales Commission + Points'}</span>
            </div>
          </div>

          {/* Casual User */}
          <div className="role-card">
            <div style={{ marginBottom: 20, display: 'inline-flex', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', padding: '12px', fontSize: '2rem' }}>👤</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{isAr ? 'مستخدم عادي (Casual User)' : 'Casual User'}</h3>
            <p style={{ fontSize: '0.9rem', color: 'hsl(220,10%,65%)', lineHeight: 1.6, marginBottom: 24 }}>
              {isAr ? 'شارك عروض الأسعار والمنتجات المتاحة من حولك واجمع نقاط تستبدلها بخدمات بالمنصة. لتشجيعك، بمجرد إتمام 10 مهام معتمدة، ستتمكن من تحويل نقاطك لكاش حقيقي!' : 'Share deals or prices around you and earn points. Complete 10 verified tasks to unlock points to real cash conversion!'}
            </p>
            <div className="badge-box">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>{isAr ? '🎯 نقاط تسوق + كاش حقيقي بعد 10 مهام' : '🎯 Points + Cash Payout after 10 tasks'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TEAM LEADER / AFFILIATE REFERRAL SECTION */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
        <div className="team-leader-container">
          <EditableText 
            as="h2"
            blockId="team-leader-title"
            serverContent={cmsContent['team-leader-title']}
            defaultText={isAr ? '🔗 برنامج الـ Affiliate وتكوين الفريق: شارك كودك وضاعف أرباحك 🚀' : '🔗 Affiliate & Team Building: Share Your Code, Multiply Earnings 🚀'}
            className="team-leader-title"
          />
          <EditableText 
            as="p"
            blockId="team-leader-desc"
            serverContent={cmsContent['team-leader-desc']}
            defaultText={isAr ? 'ابدأ العمل واكسب العمولات فوراً. ولكن إذا أردت دخلاً مستمراً دون مجهود إضافي، قم بدعوة أصدقائك للتسجيل بكود الإحالة الخاص بك وابنِ فريقك الخاص!' : 'Earn direct commission on your tasks. But if you want a passive, recurring income, invite friends using your referral code and build your sourcing team!'}
            className="team-leader-desc"
          />
          
          <div className="track-grid">
            <div className="track-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>1️⃣ {isAr ? 'كود الإحالة (Referral Code)' : 'Referral Code'}</h3>
              <p style={{ fontSize: '0.82rem', color: 'hsl(220,10%,60%)', lineHeight: 1.5 }}>{isAr ? 'شارك كود الإحالة الفريد الخاص بك مع مناديب ميدان أو أصحاب معارض جدد ليسجلوا من خلاله.' : 'Share your unique referral code with new scouts or store insiders during signup.'}</p>
            </div>
            <div className="track-card" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>2️⃣ {isAr ? 'بونص ترحيبي كاش' : 'EGP Welcome Bonus'}</h3>
              <p style={{ fontSize: '0.82rem', color: 'hsl(220,10%,60%)', lineHeight: 1.5 }}>{isAr ? 'احصل على 50 جنيه كاش فوراً بمجرد إتمام أي عضو يسجل بكودك لأول مهمة معتمدة له بالمنصة.' : 'Get 50 EGP cash instantly as soon as any member invited by you completes their first verified task.'}</p>
            </div>
            <div className="track-card" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>3️⃣ {isAr ? 'عمولة مستمرة مدى الحياة L2' : '5% Lifetime Commission'}</h3>
              <p style={{ fontSize: '0.82rem', color: 'hsl(220,10%,60%)', lineHeight: 1.5 }}>{isAr ? 'تكسب عمولة نسبية قدرها 5% من أرباح كل عضو في فريقك على كل مهمة ينجزها مدى الحياة، دون أن ينقص من مستحقاتهم شيء!' : 'Earn a recurring 5% commission on all earnings made by your referred team members, forever.'}</p>
            </div>
            <div className="track-card" style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>👑 {isAr ? 'ترقيات قائد فريق' : 'Team Leader Rank'}</h3>
              <p style={{ fontSize: '0.82rem', color: 'hsl(220,10%,80%)', lineHeight: 1.5 }}>{isAr ? 'عندما يضم فريقك 5 أعضاء نشطين، ستحصل على مضاعف أرباح 1.15x إضافي على مهامك الشخصية وميزات رتبة القائد!' : 'When your team reaches 5 active members, unlock a permanent 1.15x multiplier on your personal tasks!'}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
