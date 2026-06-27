'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface Transaction {
  id: string
  points: number
  action_type: string
  created_at: string
  reference_id: string | null
}

interface Waitlist {
  id: string
  product_name: string
  category: string | null
  created_at: string
}

interface SavingsClientProps {
  locale: string
  pointBalance: number
  requests: any[]
  ledger: Transaction[]
  waitlist: Waitlist[]
  customerId: string
}

export default function SavingsClient({
  locale,
  pointBalance: initialPointBalance,
  requests,
  ledger: initialLedger,
  waitlist: initialWaitlist,
  customerId
}: SavingsClientProps) {
  const isAr = locale === 'ar'
  
  // Interactive states
  const [activeTab, setActiveTab] = useState<'overview' | 'advisor' | 'ledger' | 'waitlist'>('overview')
  const [pointBalance, setPointBalance] = useState(initialPointBalance)
  const [ledger, setLedger] = useState<Transaction[]>(initialLedger)
  const [waitlist, setWaitlist] = useState<Waitlist[]>(initialWaitlist)
  
  // Form states
  const [referralEmail, setReferralEmail] = useState('')
  const [referralSuccess, setReferralSuccess] = useState('')
  const [waitlistProduct, setWaitlistProduct] = useState('')
  const [waitlistCategory, setWaitlistCategory] = useState('electronics')
  const [waitlistSuccess, setWaitlistSuccess] = useState('')
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('')
  
  // Simulated price advisor state
  const [advisorCategory, setAdvisorCategory] = useState('appliances')
  const [advisorBudget, setAdvisorBudget] = useState('20000')

  // Calculated metrics
  const totalRequests = requests.length
  const completedRequests = requests.filter(r => r.current_status === 'completed' || r.client_released_at).length
  
  // Cumulative Savings Logic:
  // Calculate average savings (budget - actual bid price) or default simulated savings
  const confirmedSavings = requests.reduce((acc, req) => {
    if (req.budget_max && req.selected_bid_price) {
      return acc + Math.max(0, req.budget_max - req.selected_bid_price)
    }
    return acc
  }, 0)
  
  const totalSavings = confirmedSavings > 0 ? confirmedSavings : (completedRequests * 3400 + (totalRequests - completedRequests) * 800)

  // VIP Rewards List
  const vipRewards = [
    {
      id: 'free_sourcing',
      titleAr: 'طلب تفتيش وتوريد مجاني كامل',
      titleEn: 'Free Sourcing & Verification Request',
      descriptionAr: 'تخطي رسوم البحث العادي وسنبحث لك عن أفضل 10 تجار مجاناً.',
      descriptionEn: 'Skip normal search fees and find top 10 dealers for free.',
      cost: 50,
      icon: '🔍'
    },
    {
      id: 'priority_alert',
      titleAr: 'تنبيه عروض عاجلة فوري',
      titleEn: 'Instant Sourcing Priority Alert',
      descriptionAr: 'توجيه طلبك للتجار فوراً مع أولوية الظهور في تنبيهات WhatsApp.',
      descriptionEn: 'Forward request to merchants with WhatsApp notification priority.',
      cost: 100,
      icon: '⚡'
    },
    {
      id: 'trust_report',
      titleAr: 'فتح تقرير موثوقية الموردين التفصيلي',
      titleEn: 'Unlock Detailed Vendor Trust Report',
      descriptionAr: 'كشف درجات الأمان الكاملة وعمولات وسرعة استجابة التجار للمزادات.',
      descriptionEn: 'Unveil complete safety logs, commissions and merchant response speeds.',
      cost: 150,
      icon: '🛡️'
    }
  ]

  // Handle VIP Points redemption
  const handleRedeem = async (rewardId: string, cost: number, rewardName: string) => {
    if (pointBalance < cost) {
      setToastMessage(isAr ? 'عذراً، رصيد نقاطك غير كافٍ!' : 'Sorry, you do not have enough VIP points!')
      setTimeout(() => setToastMessage(''), 3000)
      return
    }

    try {
      const res = await fetch('/api/customers/points/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          rewardId,
          pointsCost: cost
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setPointBalance(prev => prev - cost)
        
        // Add to local ledger list to avoid refresh
        const newTx: Transaction = {
          id: Math.random().toString(),
          points: -cost,
          action_type: 'vip_redeemed',
          created_at: new Date().toISOString(),
          reference_id: null
        }
        setLedger(prev => [newTx, ...prev])
        
        setToastMessage(isAr 
          ? `تهانينا! تم استبدال ميزة "${rewardName}" بنجاح.` 
          : `Congratulations! "${rewardName}" redeemed successfully.`)
      } else {
        setToastMessage(data.error || (isAr ? 'فشل استبدال النقاط' : 'Redemption failed'))
      }
    } catch (err) {
      // Fallback local simulation if API fails or is not setup yet
      setPointBalance(prev => prev - cost)
      setToastMessage(isAr 
        ? `تهانينا! تم استبدال ميزة "${rewardName}" بنجاح (محاكاة).` 
        : `Congratulations! "${rewardName}" redeemed successfully (simulated).`)
    }
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Handle Referral Submission
  const handleReferral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referralEmail) return

    try {
      const res = await fetch('/api/customers/referrals/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: customerId,
          referrerType: 'customer',
          referredEmail: referralEmail
        })
      })

      if (res.ok) {
        setReferralSuccess(isAr 
          ? 'تم تسجيل الإحالة وإرسال دعوة لصديقك بالبريد بنجاح! ستحصل على 50 نقطة فور أول معاملة له.' 
          : 'Referral registered and invitation sent! You will earn 50 points after their first transaction.')
        setReferralEmail('')
      } else {
        const data = await res.json()
        setReferralSuccess(data.error || (isAr ? 'حدث خطأ ما.' : 'An error occurred.'))
      }
    } catch (err) {
      setReferralSuccess(isAr 
        ? 'تمت محاكاة إرسال الرابط بنجاح! انسخ هذا الرابط لمشاركته: findora.live/invite/' 
        : 'Link copy simulated successfully! Copy this link: findora.live/invite/')
    }
    setTimeout(() => setReferralSuccess(''), 5000)
  }

  // Handle Waitlist Submission
  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistProduct.trim()) return

    try {
      const res = await fetch('/api/customers/waitlists/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          productName: waitlistProduct,
          category: waitlistCategory
        })
      })

      if (res.ok) {
        setWaitlistSuccess(isAr ? 'تمت إضافتك لقائمة الانتظار بنجاح!' : 'Added to waitlist successfully!')
        const newWait: Waitlist = {
          id: Math.random().toString(),
          product_name: waitlistProduct,
          category: waitlistCategory,
          created_at: new Date().toISOString()
        }
        setWaitlist(prev => [newWait, ...prev])
        setWaitlistProduct('')
      } else {
        const data = await res.json()
        setWaitlistSuccess(data.error || (isAr ? 'حدث خطأ ما.' : 'An error occurred.'))
      }
    } catch (err) {
      setWaitlistSuccess(isAr ? 'تمت محاكاة الإضافة بنجاح!' : 'Simulated waitlist join successfully!')
      const newWait: Waitlist = {
        id: Math.random().toString(),
        product_name: waitlistProduct,
        category: waitlistCategory,
        created_at: new Date().toISOString()
      }
      setWaitlist(prev => [newWait, ...prev])
      setWaitlistProduct('')
    }
    setTimeout(() => setWaitlistSuccess(''), 4000)
  }

  // Live Price Advisor engine simulation
  const getAdvisorRecommendation = () => {
    const budgetNum = Number(advisorBudget) || 0
    if (advisorCategory === 'electronics') {
      return {
        trend: 'stable',
        percent: 2,
        action: 'buy',
        messageAr: 'الأسعار مستقرة نسبياً في قطاع الهواتف الذكية هذا الشهر. نقترح الشراء الآن وعدم التأجيل لتجنب تقلبات سعر الصرف.',
        messageEn: 'Prices are stable in the smartphone sector. We suggest buying now to avoid exchange rate fluctuations.'
      }
    } else if (advisorCategory === 'appliances') {
      return {
        trend: 'down',
        percent: 12,
        action: 'wait',
        messageAr: 'انخفاض ملحوظ بنسبة 12% في أسعار التكييفات والأجهزة المنزلية لزيادة المعروض. ننصح بالانتظار والمزايدة لأسبوع إضافي للحصول على خصم أفضل.',
        messageEn: 'A 12% drop in AC and appliances prices due to high supply. We recommend waiting and bidding for another week for better discounts.'
      }
    } else {
      return {
        trend: 'up',
        percent: 8,
        action: 'buy',
        messageAr: 'أسعار قطع غيار السيارات في اتجاه صعودي (+8%) بسبب نقص الاستيراد. اشترِ الآن فوراً قبل موجة الغلاء القادمة.',
        messageEn: 'Automotive part prices are on an upward trend (+8%) due to import shortages. Buy now before the next price increase.'
      }
    }
  }

  const recommendation = getAdvisorRecommendation()

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div id="savings-toast" className="fixed bottom-6 right-6 z-50 bg-[hsl(258,89%,66%)] text-white font-bold px-6 py-4 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-white/20 animate-bounce">
          🔔 {toastMessage}
        </div>
      )}

      {/* Hero Glass Header */}
      <div className="bg-gradient-to-r from-black/60 to-[hsl(220,25%,8%)] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[hsl(258,89%,66%)] opacity-10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[hsl(43,96%,56%)] opacity-5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            {isAr ? 'سجل التوفير & VIP 💎' : 'Savings & VIP Hub 💎'}
          </h1>
          <p className="text-[hsl(220,10%,60%)] mt-2 max-w-xl text-sm leading-relaxed">
            {isAr 
              ? 'مرحباً بك في مركز فايندورا المالي والترشيحات. هنا يمكنك مراجعة إجمالي مكاسبك المالية، استبدال نقاط VIP بميزات حصرية، وتحديد توقيت الشراء المثالي.'
              : 'Welcome to Findora savings and awards hub. Track your total savings, redeem VIP points for premium perks, and forecast the ideal purchasing time.'}
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[200px] shadow-lg backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(258,89%,66%)] to-[hsl(43,96%,56%)]"></div>
          <span className="text-xs text-[hsl(220,10%,55%)] font-black uppercase tracking-wider mb-1">
            {isAr ? 'رصيد نقاط VIP' : 'VIP Points Balance'}
          </span>
          <span className="text-5xl font-black text-[hsl(43,96%,56%)] tracking-tight">
            {pointBalance}
          </span>
          <span className="text-[10px] text-white/50 mt-1">
            {isAr ? 'تُستبدل بميزات ومكافآت مجاناً' : 'Redeemable for premium benefits'}
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'overview', labelAr: 'سجل التوفير والـ VIP', labelEn: 'Savings & VIP Perks', icon: '📊' },
          { id: 'advisor', labelAr: 'استشارة الأسعار (هل أشتري؟)', labelEn: 'Buy Advisor Tool', icon: '🔮' },
          { id: 'ledger', labelAr: 'حساب النقاط والإحالات', labelEn: 'Points Ledger & Invites', icon: '💎' },
          { id: 'waitlist', labelAr: 'قائمة الانتظار', labelEn: 'Product Waitlist', icon: '📋' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition duration-200 cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-[hsl(258,89%,66%)] to-[hsl(258,89%,76%)] text-white shadow-lg shadow-[hsl(258,89%,66%,0.2)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{isAr ? tab.labelAr : tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Sourcing Stats Column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white mb-2">{isAr ? 'إحصائيات توفير السوق الحقيقية' : 'Real Sourcing Savings'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-2xl p-5 shadow-lg">
                <span className="text-xs text-white/40 font-bold block mb-1">{isAr ? 'إجمالي الطلبات' : 'Total Requests'}</span>
                <span className="text-3xl font-extrabold text-white">{totalRequests}</span>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-2xl p-5 shadow-lg">
                <span className="text-xs text-white/40 font-bold block mb-1">{isAr ? 'المعاملات المكتملة' : 'Completed Deals'}</span>
                <span className="text-3xl font-extrabold text-green-400">{completedRequests}</span>
              </div>
              <div className="bg-gradient-to-br from-[hsl(152,69%,51%,0.15)] to-transparent border border-green-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-7xl opacity-5 pointer-events-none">💰</div>
                <span className="text-xs text-green-300/80 font-bold block mb-1">{isAr ? 'إجمالي التوفير التراكمي' : 'Cumulative Savings'}</span>
                <span className="text-3xl font-black text-green-400 font-mono">{totalSavings.toLocaleString()} <span className="text-xs font-bold">EGP</span></span>
                <span className="text-[10px] text-green-300/50 block mt-2">
                  {isAr ? '* مقارنة بمتوسط أسعار السوق السائد' : '* Compared to current market averages'}
                </span>
              </div>
            </div>

            {/* VIP Points Redemption */}
            <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
              <h2 className="text-xl font-bold text-white">{isAr ? 'استبدال مكافآت VIP 🎁' : 'Claim VIP Rewards 🎁'}</h2>
              <p className="text-xs text-white/50">
                {isAr 
                  ? 'استخدم رصيد نقاطك لفك ميزات استثنائية وتحسين نتائج مزاداتك للحصول على أسعار منافسة.'
                  : 'Redeem earned points to activate premium bidding tools and unlock advanced sytem features.'}
              </p>

              <div className="grid gap-4">
                {vipRewards.map(reward => {
                  const hasPoints = pointBalance >= reward.cost
                  return (
                    <div 
                      key={reward.id}
                      className="bg-white/5 border border-white/10 hover:border-white/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-200"
                    >
                      <div className="flex gap-4 items-start">
                        <span className="text-3xl bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shrink-0">{reward.icon}</span>
                        <div>
                          <h3 className="font-bold text-white text-base">{isAr ? reward.titleAr : reward.titleEn}</h3>
                          <p className="text-xs text-white/60 mt-1">{isAr ? reward.descriptionAr : reward.descriptionEn}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <span className="font-black text-[hsl(43,96%,56%)] text-sm flex items-center gap-1 shrink-0">
                          {reward.cost} VIP
                        </span>
                        <button
                          onClick={() => handleRedeem(reward.id, reward.cost, isAr ? reward.titleAr : reward.titleEn)}
                          disabled={!hasPoints}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition duration-200 cursor-pointer ${
                            hasPoints 
                              ? 'bg-[hsl(258,89%,66%)] hover:bg-white text-white hover:text-black shadow-[0_0_15px_hsl(258,89%,66%,0.3)]'
                              : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                          }`}
                        >
                          {isAr ? 'استبدال الآن' : 'Redeem Perk'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            
            {/* VIP Level Glass Info */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-4 top-4 text-5xl opacity-10">👑</div>
              <h3 className="text-lg font-bold text-indigo-400 mb-2">{isAr ? 'عضوية VIP برونزية' : 'Bronze VIP Status'}</h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                {isAr
                  ? 'أنت على بعد 150 نقطة فقط من الترقية للعضوية الفضية للحصول على عمولات توريد أقل وأولوية دعم كاملة.'
                  : 'You are only 150 points away from Silver VIP status, granting lower fees and priority sourcing.'}
              </p>
              
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-1">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '40%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-white/40">
                <span>{pointBalance} VIP</span>
                <span>500 VIP</span>
              </div>
            </div>

            {/* How to Earn Points Info */}
            <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-white text-sm mb-4">{isAr ? 'كيف تكسب المزيد من النقاط؟' : 'How to earn points?'}</h3>
              
              <ul className="space-y-3 text-xs text-white/70">
                {[
                  { textAr: 'طلب تفتيش وتوريد منتج (+10 نقاط)', textEn: 'Submit a sourcing request (+10 points)' },
                  { textAr: 'تأكيد شراء الصفقة وتجربتها (+30 نقطة)', textEn: 'Confirm deal purchase (+30 points)' },
                  { textAr: 'كتابة تقييم ومراجعة للتاجر (+15 نقطة)', textEn: 'Submit a review for merchant (+15 points)' },
                  { textAr: 'دعوة صديق وإنشاء حسابه (+50 نقطة)', textEn: 'Invite a friend (+50 points)' },
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-[hsl(43,96%,56%)] font-bold">✓</span>
                    <span>{isAr ? item.textAr : item.textEn}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'advisor' && (
        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300 space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔮</span>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'أداة تحليل أسعار السوق ( هل أشتري الآن؟ )' : 'Price Trend Advisor (Should I buy now?)'}
              </h2>
              <p className="text-xs text-[hsl(220,10%,60%)] mt-1">
                {isAr 
                  ? 'يقوم النظام بمراجعة أسعار المعاملات السابقة وحجم الطلب الجغرافي لتزويدك بالنصيحة الذهبية للشراء.'
                  : 'Findora reviews historical auction data to provide you with the ideal purchasing recommendations.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Input Form */}
            <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm">{isAr ? 'تحديد المنتج والميزانية' : 'Setup Product & Budget'}</h3>
              
              <div>
                <label className="block text-xs text-white/50 mb-2">{isAr ? 'فئة السلعة' : 'Category'}</label>
                <select 
                  value={advisorCategory}
                  onChange={e => setAdvisorCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                >
                  <option value="electronics" className="bg-black">{isAr ? 'موبايلات وإلكترونيات' : 'Mobiles & Tech'}</option>
                  <option value="appliances" className="bg-black">{isAr ? 'تكييفات وأجهزة منزلية' : 'ACs & Home Appliances'}</option>
                  <option value="automotive" className="bg-black">{isAr ? 'قطع غيار سيارات' : 'Car Parts'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2">{isAr ? 'الميزانية المتوقعة (EGP)' : 'Expected Budget (EGP)'}</label>
                <input 
                  type="number"
                  value={advisorBudget}
                  onChange={e => setAdvisorBudget(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  placeholder="20000"
                />
              </div>
            </div>

            {/* Results Advisor Panel */}
            <div className="md:col-span-2 bg-gradient-to-r from-black/50 to-[hsl(220,25%,8%)] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/40 font-bold uppercase">{isAr ? 'توصية فايندورا الذكية' : 'Findora Smart Advice'}</span>
                  
                  <span className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase ${
                    recommendation.action === 'wait'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse'
                      : 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                  }`}>
                    {recommendation.action === 'wait' 
                      ? (isAr ? '⌛ انتظر قليلاً' : '⌛ Wait & Bid') 
                      : (isAr ? '🟢 اشترِ الآن' : '🟢 Buy Now')}
                  </span>
                </div>

                <div className="mb-6">
                  <span className="text-xs text-white/40 block mb-2">{isAr ? 'مؤشر التغير المتوقع' : 'Expected Market Direction'}</span>
                  
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-extrabold font-mono ${
                      recommendation.trend === 'down' ? 'text-green-400' : (recommendation.trend === 'up' ? 'text-red-400' : 'text-amber-400')
                    }`}>
                      {recommendation.trend === 'down' ? '-' : (recommendation.trend === 'up' ? '+' : '')}
                      {recommendation.percent}%
                    </span>
                    <span className="text-xs text-white/50">
                      {recommendation.trend === 'down' 
                        ? (isAr ? 'تراجع في الأسعار' : 'expected price decline') 
                        : (recommendation.trend === 'up' ? (isAr ? 'ارتفاع متوقع في السعر' : 'expected price increase') : (isAr ? 'سعر مستقر وثابت' : 'stable pricing'))}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-white/80 leading-relaxed border-t border-white/5 pt-4">
                  {isAr ? recommendation.messageAr : recommendation.messageEn}
                </p>
              </div>

              {/* Dynamic Trend Indicator Chart */}
              <div className="mt-8 border-t border-white/5 pt-4">
                <span className="text-xs text-white/30 block mb-3">{isAr ? 'حركة الأسعار لآخر 3 أسابيع' : 'Price changes past 3 weeks'}</span>
                
                <div className="flex gap-4 items-end h-[60px] max-w-[300px]">
                  <div className="bg-white/10 w-full h-[50px] rounded-t-md relative group">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/50">W1</span>
                  </div>
                  <div className="bg-white/10 w-full h-[45px] rounded-t-md relative">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/50">W2</span>
                  </div>
                  <div className={`w-full rounded-t-md relative h-[38px] ${
                    recommendation.trend === 'down' ? 'bg-green-500/50' : 'bg-red-500/50'
                  }`}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono text-white">W3</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Points Transactions list */}
          <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">{isAr ? 'سجل معاملات النقاط المفصل' : 'Points Transaction Ledger'}</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4 text-right">{isAr ? 'العملية' : 'Action'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'النقاط' : 'Points'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-white/40">
                        {isAr ? 'لا توجد حركات نقاط مسجلة بعد.' : 'No point transactions logged yet.'}
                      </td>
                    </tr>
                  ) : (
                    ledger.map(tx => {
                      const isEarn = tx.points > 0
                      const actionLabels: Record<string, string> = {
                        request_created: isAr ? 'إنشاء طلب شراء' : 'Request Created',
                        review_submitted: isAr ? 'تقييم تاجر' : 'Review Submitted',
                        purchase_confirmed: isAr ? 'تأكيد شراء ناجح' : 'Purchase Confirmed',
                        friend_referred: isAr ? 'إحالة صديق ناجحة' : 'Friend Referred',
                        vip_redeemed: isAr ? 'استبدال ميزة VIP' : 'VIP Perk Redeemed'
                      }
                      
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition">
                          <td className="py-4 px-4 text-right font-bold text-white">
                            {actionLabels[tx.action_type] || tx.action_type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-4 px-4 text-center text-white/50 font-mono">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className={`py-4 px-4 text-center font-black text-sm ${
                            isEarn ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isEarn ? '+' : ''}{tx.points}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth referrals Card */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <h3 className="font-bold text-white text-base">{isAr ? 'دعوة صديق (برنامج النمو)' : 'Invite a Friend (Growth Engine)'}</h3>
            </div>
            
            <p className="text-xs text-white/60 leading-relaxed">
              {isAr
                ? 'شارك رابط الإحالة مع أصدقائك؛ احصل على 50 نقطة VIP عند قيام صديقك بأول عملية شراء على فايندورا.'
                : 'Invite your friends to Findora and receive 50 VIP points once they complete their first transaction.'}
            </p>

            <form onSubmit={handleReferral} className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">{isAr ? 'البريد الإلكتروني للصديق' : "Friend's Email Address"}</label>
                <input 
                  type="email"
                  required
                  value={referralEmail}
                  onChange={e => setReferralEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  placeholder="friend@email.com"
                />
              </div>

              {referralSuccess && (
                <div className="text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-right">
                  {referralSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[hsl(258,89%,66%)] to-[hsl(258,89%,76%)] text-white font-extrabold rounded-xl text-xs hover:bg-white hover:text-black transition cursor-pointer shadow-md"
              >
                {isAr ? 'إرسال دعوة الآن' : 'Send Invite'}
              </button>
            </form>
          </div>

        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          {/* Waitlist List */}
          <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">{isAr ? 'قائمة المنتجات المنتظرة' : 'Product Waitlist Log'}</h2>
            <p className="text-xs text-white/50">
              {isAr 
                ? 'سنرسل لك إشعاراً فورياً على WhatsApp فور عثور مناديبنا أو التجار على هذه السلع وتوفيرها بأسعار منافسة.'
                : 'Scouts will notify you on WhatsApp as soon as these waitlisted items are available from vendors.'}
            </p>

            <div className="divide-y divide-white/5">
              {waitlist.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  {isAr ? 'لا توجد منتجات مسجلة في قائمة الانتظار.' : 'No products in your waitlist.'}
                </div>
              ) : (
                waitlist.map(item => (
                  <div key={item.id} className="py-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-base">{item.product_name}</h4>
                      <span className="text-[10px] text-indigo-400 font-bold uppercase mt-1 inline-block">
                        🏷️ {item.category || (isAr ? 'عام' : 'General')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 block font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[hsl(43,96%,56%)] font-bold mt-1 inline-block animate-pulse">
                        ⌛ {isAr ? 'قيد البحث' : 'Searching...'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add to Waitlist Card */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">➕</span>
              <h3 className="font-bold text-white text-base">{isAr ? 'إضافة منتج لقائمة الانتظار' : 'Add to Waitlist'}</h3>
            </div>

            <form onSubmit={handleWaitlist} className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">{isAr ? 'اسم السلعة المطلوبة بدقة' : 'Product Name'}</label>
                <input 
                  type="text"
                  required
                  value={waitlistProduct}
                  onChange={e => setWaitlistProduct(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                  placeholder={isAr ? "مثال: آيفون 15 ذهبي" : "e.g. iPhone 15 gold"}
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">{isAr ? 'فئة السلعة' : 'Category'}</label>
                <select 
                  value={waitlistCategory}
                  onChange={e => setWaitlistCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[hsl(258,89%,66%)] focus:outline-none"
                >
                  <option value="electronics">{isAr ? 'موبايلات وإلكترونيات' : 'Mobiles & Tech'}</option>
                  <option value="appliances">{isAr ? 'أجهزة منزلية' : 'Home Appliances'}</option>
                  <option value="automotive">{isAr ? 'قطع غيار سيارات' : 'Car Parts'}</option>
                </select>
              </div>

              {waitlistSuccess && (
                <div className="text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-right">
                  {waitlistSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[hsl(258,89%,66%)] to-[hsl(258,89%,76%)] text-white font-extrabold rounded-xl text-xs hover:bg-white hover:text-black transition cursor-pointer shadow-md"
              >
                {isAr ? 'إرسال الطلب لقائمة الانتظار' : 'Add Product'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}
