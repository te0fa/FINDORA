import React from 'react'
import Link from 'next/link'
import { getEconomyConfig } from '@/lib/contributors/config'
import ContributorAnnouncementBar from '@/components/contributors/ContributorAnnouncementBar'
import { fetchPageContent } from '@/lib/cms/actions'
import EditableText from '@/components/cms/EditableText'

export const metadata = {
  title: 'Work With Us — FINDORA',
}

export default async function ContributorsLandingPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const isAr = locale === 'ar'
  
  // Fetch dynamic landing settings
  const settings = await getEconomyConfig('landing_page_settings') || {
    open_slots_scout: 23,
    open_slots_insider: 10,
    closing_date: null,
    banner_active: true
  }

  // Fetch CMS Content
  const cmsContent = await fetchPageContent('/contributors')

  return (
    <div className="min-h-screen bg-[hsl(220,20%,12%)] font-sans text-[hsl(220,15%,95%)]">
      
      {/* 1. ANNOUNCEMENT BAR */}
      {settings.banner_active && (
        <ContributorAnnouncementBar
          locale={locale}
          openSlots={settings.open_slots_scout}
          closingDate={settings.closing_date}
          message={isAr ? `متبقي ${settings.open_slots_scout} مكان للمندوبين` : `${settings.open_slots_scout} Scout slots remaining`}
        />
      )}

      {/* 2. HERO SECTION */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <EditableText 
          as="h1"
          blockId="hero-title"
          serverContent={cmsContent['hero-title']}
          defaultText={isAr ? 'اشتغل معانا وابدأ تكسب 💰' : 'Work With Us & Start Earning 💰'}
          className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-6xl inline-block"
        />
        <br/>
        <EditableText 
          as="p"
          blockId="hero-desc"
          serverContent={cmsContent['hero-desc']}
          defaultText={isAr 
            ? 'سواء كنت بتفهم في السوق أو شغال في معرض أو حتى بتعرف تدور كويس… تقدر تكسب معانا بكل بساطة.' 
            : 'Whether you know the market well, work at a store, or just know how to find good deals… you can earn with us easily.'}
          className="mx-auto mb-10 max-w-2xl text-lg text-[hsl(220,10%,60%)] md:text-xl block"
        />
        <Link
          href={`/${locale}/contributors/apply`}
          className="inline-block rounded-full bg-[hsl(258,89%,66%)] px-8 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-105 hover:bg-[hsl(258,89%,70%)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
        >
          {isAr ? 'ابدأ دلوقتي' : 'Start Now'}
        </Link>
      </section>

      {/* 3. ROLE SELECTION UI */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          {isAr ? 'اختار دورك وابدأ' : 'Choose Your Role & Start'}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {/* Field Scout */}
          <div className="relative overflow-hidden rounded-2xl border border-[hsl(258,89%,66%,0.3)] bg-black/20 p-8 shadow-xl backdrop-blur-md">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(258,89%,66%)] opacity-10 blur-3xl"></div>
            <div className="mb-6 inline-flex rounded-xl bg-[hsl(258,89%,66%,0.2)] p-4 text-4xl">👨‍🔧</div>
            <h3 className="mb-4 text-2xl font-bold text-white">{isAr ? 'مندوب سوق (Field Scout)' : 'Field Scout'}</h3>
            <p className="mb-6 text-[hsl(220,10%,60%)]">
              {isAr ? 'اكسب فلوس مقابل البحث في السوق وتوفير أسعار حقيقية وتصوير المنتجات.' : 'Earn cash by researching the market, providing real prices, and taking product photos.'}
            </p>
            <div className="rounded-lg bg-black/40 p-4">
              <span className="block text-sm font-bold text-[hsl(152,69%,51%)]">{isAr ? '💰 كاش أساسي + بونص' : '💰 Base Cash + Bonus'}</span>
            </div>
          </div>

          {/* Store Insider */}
          <div className="relative overflow-hidden rounded-2xl border border-[hsl(43,96%,56%,0.3)] bg-black/20 p-8 shadow-xl backdrop-blur-md">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(43,96%,56%)] opacity-10 blur-3xl"></div>
            <div className="mb-6 inline-flex rounded-xl bg-[hsl(43,96%,56%,0.2)] p-4 text-4xl">🏪</div>
            <h3 className="mb-4 text-2xl font-bold text-white">{isAr ? 'موظف معرض (Store Insider)' : 'Store Insider'}</h3>
            <p className="mb-6 text-[hsl(220,10%,60%)]">
              {isAr ? 'زود مبيعاتك وخد عمولة، احنا بنوفرلك عملاء جاهزين يشتروا من محلك.' : 'Increase your sales and earn commission. We bring ready-to-buy customers to your store.'}
            </p>
            <div className="rounded-lg bg-black/40 p-4">
              <span className="block text-sm font-bold text-[hsl(43,96%,56%)]">{isAr ? '💸 عمولة مبيعات + نقاط' : '💸 Sales Commission + Points'}</span>
            </div>
          </div>

          {/* Casual User */}
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-black/20 p-8 shadow-xl backdrop-blur-md">
            <div className="mb-6 inline-flex rounded-xl bg-white/5 p-4 text-4xl">👤</div>
            <h3 className="mb-4 text-2xl font-bold text-white">{isAr ? 'مستخدم عادي (Casual User)' : 'Casual User'}</h3>
            <p className="mb-6 text-[hsl(220,10%,60%)]">
              {isAr ? 'شاركنا بعروض أو أسعار من حولك واكسب نقاط تستبدلها بخدمات أو خصومات.' : 'Share deals or prices around you and earn points to redeem for services or discounts.'}
            </p>
            <div className="rounded-lg bg-black/40 p-4">
              <span className="block text-sm font-bold text-white">{isAr ? '🎯 نقاط وخصومات داخل المنصة' : '🎯 Platform Points & Discounts'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TEAM LEADER TRACK SECTION (NEW) */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-[hsl(258,89%,66%,0.2)] to-black border border-[hsl(258,89%,66%,0.3)] p-10 text-center md:p-16">
          <EditableText 
            as="h2"
            blockId="team-leader-title"
            serverContent={cmsContent['team-leader-title']}
            defaultText={isAr ? 'مسار الإدارة: ابني فريقك وضاعف أرباحك 👑' : 'Team Leader Track: Build Your Team, Multiply Earnings 👑'}
            className="mb-6 text-3xl font-extrabold text-white md:text-5xl inline-block"
          />
          <EditableText 
            as="p"
            blockId="team-leader-desc"
            serverContent={cmsContent['team-leader-desc']}
            defaultText={isAr ? 'ابدأ العمل واكسب العمولات فوراً. لكن إذا أردت مضاعفة دخلك وفتح صلاحيات حصرية، قم ببناء وإدارة فريقك للارتقاء في سلم الإدارة.' : 'Start working and earning immediately. But if you want to multiply your income and unlock exclusive perks, build and manage a team to climb the management ladder.'}
            className="mx-auto mb-12 max-w-2xl text-[hsl(220,10%,70%)] text-lg block"
          />
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-black/40 p-6 backdrop-blur border border-white/5 text-left rtl:text-right">
              <h3 className="text-xl font-bold text-white mb-2">1️⃣ {isAr ? 'اكسب من اليوم الأول' : 'Earn From Day 1'}</h3>
              <p className="text-sm text-slate-400">{isAr ? 'لا يوجد شروط للبدء. نفذ المهام واكسب عمولاتك المباشرة فور الموافقة.' : 'No conditions to start. Complete tasks and earn direct commissions upon approval.'}</p>
            </div>
            <div className="rounded-2xl bg-black/40 p-6 backdrop-blur border border-[hsl(43,96%,56%,0.2)] text-left rtl:text-right">
              <h3 className="text-xl font-bold text-[hsl(43,96%,56%)] mb-2">2️⃣ {isAr ? 'مكافآت الإدارة (L2)' : 'Management Bonus (L2)'}</h3>
              <p className="text-sm text-slate-400">{isAr ? 'كلما دربت فريقك ووجهتهم لإتمام المهام، زادت مكافآتك السلبية من إنتاجيتهم.' : 'As you train and guide your team to complete tasks, your passive bonus from their productivity grows.'}</p>
            </div>
            <div className="rounded-2xl bg-[hsl(258,89%,66%,0.2)] p-6 backdrop-blur border border-[hsl(258,89%,66%,0.4)] text-left rtl:text-right">
              <h3 className="text-xl font-bold text-white mb-2">👑 {isAr ? 'ترقيات المدراء' : 'Manager Promotions'}</h3>
              <p className="text-sm text-slate-200">{isAr ? 'ارتقِ في المستويات بناءً على نشاط فريقك، جودتك، ونقاط الثقة لفتح سقف الأرباح.' : 'Level up based on your team\'s activity, your quality, and trust score to unlock profit caps.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REALISTIC EXAMPLES */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-black/60 to-black/30 p-8 ring-1 ring-white/10">
          <h2 className="mb-6 border-b border-white/10 pb-4 text-2xl font-bold text-white">
            {isAr ? 'مثال واقعي للربح' : 'Realistic Earnings Example'}
          </h2>
          <p className="mb-8 text-[hsl(220,10%,60%)]">
            {isAr ? 'لو عميل طلب موبايل وقيمة خدمتنا 100 جنيه، دي طريقة تقسيم الأرباح حسب دورك:' : 'If a customer requests a mobile phone and our service fee is 100 EGP, here is how you earn based on your role:'}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[hsl(258,89%,66%,0.1)] p-4 border border-[hsl(258,89%,66%,0.2)]">
              <div className="flex items-center gap-4">
                <span className="text-3xl">👨‍🔧</span>
                <div>
                  <p className="font-bold text-white">{isAr ? 'Field Scout' : 'Field Scout'}</p>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'سعر واتقبل + العميل اشترى' : 'Price accepted + Customer bought'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[hsl(152,69%,51%)]">+30 {isAr ? 'جنيه' : 'EGP'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[hsl(43,96%,56%,0.1)] p-4 border border-[hsl(43,96%,56%,0.2)]">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🏪</span>
                <div>
                  <p className="font-bold text-white">{isAr ? 'Store Insider' : 'Store Insider'}</p>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'وفرت العرض والعميل اشترى منك' : 'Provided offer and customer bought'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[hsl(43,96%,56%)]">+20 {isAr ? 'جنيه' : 'EGP'}</p>
                <p className="text-xs text-[hsl(43,96%,56%)]">+ {isAr ? 'عمولة المحل' : 'Store Commission'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center gap-4">
                <span className="text-3xl">👤</span>
                <div>
                  <p className="font-bold text-white">{isAr ? 'Casual User' : 'Casual User'}</p>
                  <p className="text-sm text-[hsl(220,10%,60%)]">{isAr ? 'رفعت سعر او عرض مفيد' : 'Uploaded useful price/offer'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-white">+10 {isAr ? 'رصيد' : 'Points'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
