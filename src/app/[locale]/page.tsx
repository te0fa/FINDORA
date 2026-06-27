import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/i18n/config";
import LandingHeader from "@/components/LandingHeader";
import { getActiveServicePricing, getActiveHomepageAnnouncements, getFeaturedFindoraDeals, getPublishedContentBlocks } from "@/lib/dal/marketing";
import FloatingHighlightsHub from "@/components/marketing/FloatingHighlightsHub";
import { resolvePricing } from "@/lib/pricing/resolver";
import { createClient } from "@/lib/supabase/server";


export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";
  const supabase = await createClient();

  let configData: any[] | null = null;
  try {
    const { data } = await supabase
      .from('economy_config')
      .select('config_key, value')
      .like('config_key', 'flag_%');
    configData = data;
  } catch (err) {
    console.warn('Failed to fetch economy config flags:', err);
  }

  const flags: Record<string, boolean> = {};
  if (configData) {
    configData.forEach((f: any) => {
      flags[f.config_key] = f.value === 'true' || f.value === true;
    });
  }

  const announcements = await getActiveHomepageAnnouncements()
  const featuredDeals = await getFeaturedFindoraDeals(3)


  // Dynamic Pricing Engine Resolution with Safe Baseline Fallbacks
  const [everydayPricing, highValuePricing, projectPricing] = await Promise.all([
    resolvePricing('everyday_purchase'),
    resolvePricing('high_value_deals'),
    resolvePricing('projects_supplies')
  ])
  
  const cmsBlocks = await getPublishedContentBlocks([
    'homepage_hero',
    'homepage_how_it_works',
    'homepage_faq',
    'service_everyday_purchase_copy'
  ])

  const getCms = (key: string) => cmsBlocks?.find((b: any) => b.block_key === key)?.content_json
  const heroCms = getCms('homepage_hero')
  const howCms = getCms('homepage_how_it_works')
  const faqCms = getCms('homepage_faq')
  const serviceCms = getCms('service_everyday_purchase_copy')

  const headerLabels = {
    home: isRTL ? "الرئيسية" : "Home",
    how: isRTL ? "كيف نعمل" : "How It Works",
    why: isRTL ? "لماذا فايندورا" : "Why Findora",
    categories: isRTL ? "التصنيفات" : "Categories",
    flow: isRTL ? "آلية الطلب" : "Process",
    pricing: isRTL ? "الأسعار" : "Pricing",
    faq: isRTL ? "الأسئلة الشائعة" : "FAQ",
    deals: isRTL ? "عروض فايندورا" : "Findora Deals",
    start: isRTL ? "ابدأ طلبك الآن" : "Start Your Request",
    track: isRTL ? "تتبع طلبك" : "Track Your Request",
    login: dict.navigation.login,
    signup: dict.navigation.signup,
  };

  const howSteps = [
    {
      num: "01",
      title: isRTL ? "أرسل طلبك" : "Submit Your Request",
      desc: isRTL
        ? "صف ما تبحث عنه بالتفصيل — المنتج، الميزانية، والأولوية، وأي ملاحظات مهمة."
        : "Describe what you need in detail — the product, budget, priorities, and any important notes.",
    },
    {
      num: "02",
      title: isRTL ? "نراجع ونبحث" : "We Review & Research",
      desc: isRTL
        ? "فريقنا يراجع الطلب ويبدأ البحث والمقارنة والتأكد من الخيارات المتاحة."
        : "Our team reviews the request and starts researching, comparing, and validating available options.",
    },
    {
      num: "03",
      title: isRTL ? "نرسل لك النتيجة" : "We Send the Result",
      desc: isRTL
        ? "نقدم لك تقريرًا واضحًا أو ترشيحًا مناسبًا حسب نوع الخدمة ونطاق الطلب."
        : "We provide a clear report or recommendation based on the service type and request scope.",
    },
  ];

  const whyCards = [
    {
      title: isRTL ? "توفير الوقت" : "Save Time",
      desc: isRTL
        ? "بدل ما تضيع وقتك بين خيارات كثيرة، نحن نقوم بالفرز والبحث نيابةً عنك."
        : "Instead of wasting time across too many options, we do the filtering and research for you.",
    },
    {
      title: isRTL ? "أفضل قيمة" : "Better Value",
      desc: isRTL
        ? "لا نبحث فقط عن الأرخص، بل عن أفضل توازن بين السعر والجودة والموثوقية."
        : "We do not only look for the cheapest option, but the best balance of price, quality, and reliability.",
    },
    {
      title: isRTL ? "وضوح وشفافية" : "Clarity & Transparency",
      desc: isRTL
        ? "نعرض لك الخيارات بشكل واضح، وما يدخل ضمن الخدمة وما لا يدخل ضمنها."
        : "We present the options clearly, including what is included in the service and what is not.",
    },
    {
      title: isRTL ? "مرونة حسب الطلب" : "Flexible by Scope",
      desc: isRTL
        ? "لدينا طلبات يومية بسيطة، وطلبات أكبر تحتاج مراجعة وتسعير حسب النطاق."
        : "We support simple everyday requests as well as larger requests that need review and scoped pricing.",
    },
  ];

  const categories = [
    isRTL ? "💻 أجهزة وإلكترونيات" : "💻 Electronics & Devices",
    isRTL ? "🏠 أجهزة منزلية ومستلزمات" : "🏠 Home Appliances & Goods",
    isRTL ? "🚗 سيارات وأصول مرتفعة القيمة" : "🚗 Cars & High-Value Assets",
    isRTL ? "🪑 فرش وتجهيز وتأثيث" : "🪑 Furnishing & Setup",
    isRTL ? "📦 توريد وشراء متعدد البنود" : "📦 Supply & Multi-Item Procurement",
    isRTL ? "🔧 خدمات وتجهيزات خاصة" : "🔧 Specialized Services & Setup",
  ];

  const flowItems = [
    {
      step: "1",
      title: isRTL ? "استلام الطلب" : "Request Intake",
      desc: isRTL
        ? "نراجع الطلب ونتأكد أنه واضح ومسموح ويمكن العمل عليه."
        : "We review the request and confirm that it is clear, allowed, and workable.",
    },
    {
      step: "2",
      title: isRTL ? "تحديد نوع الخدمة" : "Service Classification",
      desc: isRTL
        ? "نحدد هل هو شراء عادي، أصل كبير، أو مشروع/توريد."
        : "We classify whether it is an everyday purchase, a high-value asset, or a project/supply request.",
    },
    {
      step: "3",
      title: isRTL ? "البحث والمقارنة" : "Research & Comparison",
      desc: isRTL
        ? "نقوم بالبحث، الفرز، والمقارنة بين الخيارات المتاحة."
        : "We research, filter, and compare the available options.",
    },
    {
      step: "4",
      title: isRTL ? "التوصية أو التقرير" : "Recommendation or Report",
      desc: isRTL
        ? "نقدم لك التوصية أو التقرير المناسب حسب طبيعة الخدمة."
        : "We provide the appropriate recommendation or report depending on the service type.",
    },
    {
      step: "5",
      title: isRTL ? "التنفيذ أو المتابعة" : "Execution or Follow-Up",
      desc: isRTL
        ? "إذا احتجت، يمكن إضافة التنفيذ أو المتابعة أو الإشراف كخدمة مستقلة."
        : "If needed, execution, follow-up, or supervision can be added as a separate service.",
    },
  ];

  const pricingCards = [
    {
      title: isRTL ? "المشتريات العادية" : "Everyday Purchases",
      desc: isRTL
        ? "مناسب لطلبات مثل: موبايل، لابتوب، ثلاجة، غسالة، تكييف، وأجهزة مشابهة."
        : "Suitable for requests such as smartphones, laptops, refrigerators, washing machines, air conditioners, and similar items.",
      bullets: isRTL
        ? [
          "فهم احتياجك وميزانيتك",
          "ترشيح أفضل الخيارات المناسبة",
          "تحديد أفضل سعر متاح",
          "ترشيح أفضل مكان شراء موثوق",
          "ملاحظات مهمة مثل الضمان والتوافر",
        ]
        : [
          "Understanding your needs and budget",
          "Recommending the best matching options",
          "Finding the best available price",
          "Recommending the most reliable place to buy",
          "Important notes such as warranty and availability",
        ],
      price: isRTL ? `${everydayPricing.price} جنيه` : `EGP ${everydayPricing.price}`,
      originalPrice: (everydayPricing.original_price && Number(everydayPricing.original_price) !== Number(everydayPricing.price)) ? everydayPricing.original_price : null,
      promoLabel: (everydayPricing.promo_label_ar || everydayPricing.promo_label_en) ? (isRTL ? everydayPricing.promo_label_ar : everydayPricing.promo_label_en) : null,
      currency: 'EGP',
      note: isRTL
        ? "خدمة تنفيذ الشراء والمتابعة متاحة كإضافة اختيارية."
        : "Purchase execution and follow-up are available as optional add-ons.",
      cta: isRTL ? "ابدأ طلب شراء عادي" : "Start an Everyday Purchase",
      serviceKey: 'everyday_purchase'
    },
    {
      title: isRTL ? "الأصول الكبيرة" : "High-Value Assets",
      desc: isRTL
        ? "مناسب لطلبات مثل: سيارة، شقة، منزل، مكتب، محل، أو أي قرار شرائي كبير."
        : "Suitable for requests such as cars, apartments, houses, offices, shops, or any major high-value purchase.",
      bullets: isRTL
        ? [
          "فهم دقيق للااحتياج",
          "مراجعة الخيارات المناسبة",
          "مقارنة بين البدائل",
          "دعم في التقييم والاختيار",
          "تقليل احتمالات القرار الخاطئ",
        ]
        : [
          "Careful understanding of your needs",
          "Reviewing relevant options",
          "Comparing alternatives",
          "Supporting evaluation and selection",
          "Reducing the risk of the wrong decision",
        ],
      price: isRTL ? `${highValuePricing.price} جنيه` : `EGP ${highValuePricing.price}`,
      originalPrice: (highValuePricing.original_price && Number(highValuePricing.original_price) !== Number(highValuePricing.price)) ? highValuePricing.original_price : null,
      promoLabel: (highValuePricing.promo_label_ar || highValuePricing.promo_label_en) ? (isRTL ? highValuePricing.promo_label_ar : highValuePricing.promo_label_en) : null,
      currency: 'EGP',
      note: isRTL
        ? "قد تشمل بعض الطلبات رسوم تنفيذ إضافية عند التفاوض أو إتمام الصفقة."
        : "Some requests may include additional execution fees for negotiation or deal completion.",
      cta: isRTL ? "اطلب مراجعة أصل كبير" : "Request Asset Review",
      serviceKey: 'high_value_deals'
    },
    {
      title: isRTL ? "المشاريع والتوريد" : "Projects & Supply",
      desc: isRTL
        ? "مناسب لطلبات مثل: تشطيب، فرش، تجهيز مكتب أو محل، توريد متعدد البنود، أو تجهيز مساحة كاملة."
        : "Suitable for requests such as finishing, furnishing, office or shop setup, multi-item supply, or full-space preparation.",
      bullets: isRTL
        ? [
          "فهم المطلوب والنطاق",
          "تنظيم الأولويات والخطة",
          "جمع أو مقارنة عروض مبدئية",
          "التوصية أو المتابعة حسب الحاجة",
          "تسعير حسب النطاق وحجم المجهود",
        ]
        : [
          "Understanding the request and scope",
          "Organizing priorities and plan",
          "Collecting or comparing initial offers",
          "Recommendation or follow-up as needed",
          "Priced according to scope and effort",
        ],
      price: null,  // No fixed price - by agreement
      originalPrice: null,
      promoLabel: null,
      byAgreement: true,
      currency: 'EGP',
      note: isRTL
        ? "خدمات التنفيذ، الإشراف، أو المتابعة الميدانية يتم تسعيرها بشكل مستقل عند الحاجة."
        : "Execution, supervision, or field follow-up services are priced separately when needed.",
      cta: isRTL ? "اطلب مشروع أو توريد" : "Request a Project or Supply Service",
      serviceKey: 'projects_supplies'
    },
  ];

  const addOns = isRTL
    ? [
      "تنفيذ الشراء",
      "المتابعة بعد التوصية",
      "الإشراف أو الزيارات",
      "البحث الموسع أو المقارنات الإضافية",
    ]
    : [
      "Purchase execution",
      "Follow-up after recommendation",
      "Supervision or visits",
      "Extended research or deeper comparison",
    ];

  const pricingFactors = isRTL
    ? [
      "نوع الطلب",
      "حجم المجهود المطلوب",
      "هل الخدمة تشمل التوصية فقط أم التنفيذ أو المتابعة أيضًا",
    ]
    : [
      "Type of request",
      "Level of effort required",
      "Whether the service includes recommendation only or also execution and follow-up",
    ];

  const prohibitedItems = isRTL
    ? [
      "أي طلب غير قانوني أو مخالف للأنظمة",
      "الأسلحة، الذخائر، أو المواد الخطرة والمحظورة",
      "المخدرات أو المواد الممنوعة أو المقيدة قانونيًا",
      "البضائع المسروقة أو المقلدة أو مجهولة المصدر",
      "الخدمات أو المنتجات المحرمة أو غير الأخلاقية",
      "أي طلب يتطلب خداعًا أو انتحالًا أو تجاوزًا قانونيًا",
    ]
    : [
      "Any illegal or non-compliant request",
      "Weapons, ammunition, or hazardous prohibited materials",
      "Drugs or legally restricted substances",
      "Stolen, counterfeit, or unknown-source goods",
      "Unethical or prohibited services or products",
      "Any request involving deception, impersonation, or legal evasion",
    ];

  const legalPoints = isRTL
    ? [
      "نحتفظ بحق قبول أو رفض أي طلب وفقًا لطبيعته ومدى ملاءمته.",
      "Findora تقدم خدمة بحث وترشيح ومقارنة، وليست طرفًا تلقائيًا في أي صفقة ما لم يتم الاتفاق على خدمة تنفيذ مستقلة.",
      "الأسعار والتوافر والعروض قد تتغير من السوق أو الموردين في أي وقت.",
      "العميل مسؤول عن القرار النهائي قبل الشراء أو التعاقد.",
      "قد نطلب معلومات إضافية قبل البدء في بعض الطلبات الكبيرة أو الحساسة.",
    ]
    : [
      "We reserve the right to accept or reject any request based on its nature and suitability.",
      "Findora provides research, recommendation, and comparison services and is not automatically a direct party to any transaction unless a separate execution service is agreed.",
      "Prices, availability, and offers may change at any time depending on the market or suppliers.",
      "The client remains responsible for the final purchase or contracting decision.",
      "We may request additional information before starting certain large or sensitive requests.",
    ];

  const faqs = [
    {
      q: isRTL ? dict.landing.faq_q1 : "Is Findora just a price comparison site?",
      a: isRTL ? dict.landing.faq_a1 : "No. Findora helps with research, comparison, negotiation support, and decision clarity. Price matters, but our focus is on best value, not just the cheapest.",
    },
    {
      q: isRTL ? dict.landing.faq_q2 : "Do you guarantee the lowest price?",
      a: isRTL ? dict.landing.faq_a2 : "We do not promise the lowest price in all cases. Our goal is to help you get the best value by comparing price, quality, availability, and risks.",
    },
    {
      q: isRTL ? dict.landing.faq_q3 : "Does Findora perform finishing or works directly?",
      a: isRTL ? dict.landing.faq_a3 : "At this stage, Findora helps you compare choices, suppliers, prices, and offers. Execution is handled by the chosen supplier or service arrangement.",
    },
    {
      q: isRTL ? dict.landing.faq_q4 : "Who makes the final purchase decision?",
      a: isRTL ? dict.landing.faq_a4 : "Findora provides research, comparison, and recommendation support, but the final purchase decision and execution approval remains with the client.",
    },
    {
      q: isRTL ? dict.landing.faq_q5 : "What makes Findora different?",
      a: isRTL ? dict.landing.faq_a5 : "We combine research, comparison, negotiation support, order follow-up, and decision summarization into one organized process.",
    },
  ];

  return (
    <div className="landing-page" dir={isRTL ? "rtl" : "ltr"}>
      <LandingHeader locale={locale} isRTL={isRTL} labels={headerLabels} />

      <FloatingHighlightsHub 
        offers={announcements} 
        deals={featuredDeals} 
        locale={locale} 
        dict={dict} 
      />

      <section id="home" className="hero-section" data-testid="homepage-cms-hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-content animate-in">
          <h1 className="hero-title">
            {isRTL
              ? (heroCms?.title_ar || "خدمة البحث عن المشتريات الأكثر ذكاءً")
              : (heroCms?.title_en || "The Smarter Way to Source Anything")}
          </h1>

          <p className="hero-desc">
            {isRTL
              ? (heroCms?.subtitle_ar || "نحن نبحث، نفاوض، ونقدم لك أفضل الخيارات المتاحة في السوق. احصل على ما تريده بأفضل الأسعار.")
              : (heroCms?.subtitle_en || "We hunt, negotiate, and present you with the best market options available. Get what you want at the best prices.")}
          </p>

          <div className="hero-ctas">
            <Link href={`/${locale}/start-request`} className="hero-cta-primary">
              {isRTL ? (heroCms?.cta_primary_ar || "ابدأ طلبك الآن") : (heroCms?.cta_primary_en || "Start Your Request")}
            </Link>
            <Link href={`/${locale}/track-request`} className="hero-cta-secondary">
              {isRTL ? (heroCms?.cta_secondary_ar || "تتبع طلبك") : (heroCms?.cta_secondary_en || "Track Your Request")}
            </Link>
          </div>

          <div className="hero-free-trial-banner animate-in">
            <div className="banner-icon">🎁</div>
            <div className="banner-content">
              <h4>{isRTL ? "طلبك الأول من المشتريات اليومية — مجاناً بالكامل" : "Your First Everyday Purchase Request — 100% FREE"}</h4>
              <p>{isRTL ? "بعد التحقق من رقم الهاتف. أرسل طلبك الآن أو سجل دخولك لمتابعة طلباتك." : "After mobile verification. Start your request now or log in to track your requests."}</p>
              <div className="banner-actions">
                <Link href={`/${locale}/auth/signup`} className="btn-start">
                  {isRTL ? "تفعيل العرض برقم الهاتف" : "Activate via Mobile"}
                </Link>
                <span className="banner-divider">{isRTL ? "أو" : "or"}</span>
                <Link href={`/${locale}/auth/login`} className="btn-login">
                  {isRTL ? "تسجيل الدخول" : "Log In"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-deal-engine-section">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? dict.landing.trust_title : "Not Just Price Comparison — A Trust Engine for Buying & Supply"}
          </h2>
          <p className="section-subtitle">
            {isRTL ? dict.landing.trust_subtitle : "Findora helps you reach the best choice, compare true value, negotiate smarter, and reduce the risk of choosing an unsuitable supplier or offer."}
          </p>

          <div className="trust-grid">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="glass-card trust-card">
                <div className="trust-icon-box">
                  <div className="trust-icon-dot" />
                </div>
                <h3 className="card-title">
                  {isRTL ? (dict.landing as any)[`trust_card${num}_t`] : [
                    "Finding the Right Supplier",
                    "Value vs Price",
                    "Smarter Negotiation",
                    "Risk Reduction",
                    "Order Tracking",
                    "Clearer Decisions"
                  ][num - 1]}
                </h3>
                <p className="card-desc">
                  {isRTL ? (dict.landing as any)[`trust_card${num}_b`] : [
                    "We help you reduce random searching and reach suppliers or offers suitable for your request.",
                    "We compare price, quality, availability, risk, and how well the offer matches your needs.",
                    "We help you clarify offers and reach better terms whenever possible.",
                    "We highlight differences and risks before you pay or commit.",
                    "We help you organize and follow up on order details based on the service type.",
                    "We summarize the strongest choices and explain which is best and why."
                  ][num - 1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="how-section" data-testid="homepage-cms-how-it-works">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? (howCms?.section_title_ar || "كيف يعمل فايندورا؟") : (howCms?.section_title_en || "How Findora Works")}
          </h2>

          <div className="how-steps">
            {(howCms?.steps || howSteps).map((step: any, idx: number) => (
              <div key={step.num || idx} className="glass-card how-step">
                <div className="how-step-num">{step.num || `0${idx + 1}`}</div>
                <h3 className="card-title">{isRTL ? (step.title_ar || step.title) : (step.title_en || step.title)}</h3>
                <p className="card-desc">{isRTL ? (step.description_ar || step.desc) : (step.description_en || step.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="why-section">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? "لماذا تختار فايندورا؟" : "Why Choose Findora?"}
          </h2>

          <div className="why-grid">
            {whyCards.map((item, index) => (
              <div key={index} className="glass-card why-card">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="categories-section">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? "ماذا يمكننا أن نوفر لك؟" : "What Can We Source?"}
          </h2>

          <p className="section-subtitle">
            {isRTL
              ? "طلبات يومية، قرارات شراء كبيرة، ومشاريع وتوريد حسب النطاق."
              : "Everyday requests, high-value decisions, and projects or supply based on scope."}
          </p>

          <div className="categories-grid">
            {categories.map((item) => (
              <div key={item} className="category-pill">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="flow" className="flow-section">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? "كيف تتم معالجة طلبك" : "How Your Request is Processed"}
          </h2>

          <div className="flow-timeline">
            {flowItems.map((item) => (
              <div key={item.step} className="flow-item">
                <div className="flow-dot">{item.step}</div>
                <div className="flow-content glass-card">
                  <h4 className="flow-title">{item.title}</h4>
                  <p className="flow-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? "الأسعار والخدمات" : "Pricing & Services"}
          </h2>

          <p className="section-subtitle narrow">
            {isRTL
              ? "تسعير واضح وعادل حسب نوع الطلب وحجم المجهود المطلوب. بعض الخدمات لها سعر ثابت، والطلبات الأكبر يتم تسعيرها بعد مراجعة التفاصيل."
              : "Clear and fair pricing based on the type of request and the level of effort required. Some services come with a fixed price, while larger requests are priced after review."}
          </p>

          <div className="pricing-grid">
            {pricingCards.map((card: any, index) => (
              <div key={index} className="glass-card pricing-card" data-testid={card.serviceKey ? `homepage-service-card-${card.serviceKey}` : undefined}>
                <h3 className="pricing-card-title">{card.title}</h3>
                <p className="pricing-card-desc">{card.desc}</p>

                <ul className="pricing-list">
                  {card.bullets.map((bullet: string, bulletIndex: number) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>

                <div className="pricing-price-box">
                  {card.byAgreement ? (
                    // Projects & Supply: no fixed price — show by-agreement block
                    <div className="pricing-by-agreement">
                      <div className="pricing-starting-label">
                        {isRTL ? 'التسعير حسب المشروع' : 'Project-Based Pricing'}
                      </div>
                      <div className="pricing-agreement-text">
                        {isRTL ? 'بالاتفاق' : 'By Agreement'}
                      </div>
                      <div className="pricing-agreement-sub">
                        {isRTL
                          ? 'يتم تحديد السعر بعد مراجعة تفاصيل المشروع والنطاق المطلوب'
                          : 'Price is determined after reviewing project details and scope'}
                      </div>
                    </div>
                  ) : (
                    // Everyday & High-Value: show "Starting from" label above price
                    <>
                      <div className="pricing-starting-label">
                        {isRTL ? 'يبدأ من' : 'Starting from'}
                      </div>
                      {card.originalPrice && (
                        <div className="pricing-original-price" data-testid={card.serviceKey === 'everyday_purchase' ? "homepage-everyday-original-price" : undefined}>
                          {card.originalPrice} {card.currency}
                        </div>
                      )}
                      <div className="pricing-price" data-testid={card.serviceKey === 'everyday_purchase' ? "homepage-everyday-current-price" : undefined}>
                        {card.price}
                      </div>
                      {card.promoLabel && (
                        <div className="pricing-promo-label" data-testid={card.serviceKey === 'everyday_purchase' ? "homepage-everyday-limited-offer" : undefined}>
                          {card.promoLabel}
                        </div>
                      )}
                      <div className="pricing-extra-fees-note">
                        {isRTL
                          ? '* قد تُضاف رسوم إضافية للطلبات الأكثر تعقيداً'
                          : '* additional fees may apply for more complex requests'}
                      </div>
                    </>
                  )}
                </div>
                <p className="pricing-note">{card.note}</p>

                <Link href={`/${locale}/start-request`} className="pricing-cta">
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="split-grid">
            <div className="glass-card info-card">
              <h3 className="subsection-title">
                {isRTL ? "خدمات إضافية" : "Additional Services"}
              </h3>

              <div className="tag-list">
                {addOns.map((item) => (
                  <span key={item} className="soft-tag">
                    {item}
                  </span>
                ))}
              </div>

              <p className="small-note">
                {isRTL
                  ? "يتم تسعير الخدمات الإضافية بشكل مستقل حسب نطاقها."
                  : "Additional services are priced separately based on scope."}
              </p>
            </div>

            <div className="glass-card info-card">
              <h3 className="subsection-title">
                {isRTL ? "كيف نحدد السعر؟" : "How Pricing Works"}
              </h3>

              <ul className="simple-list">
                {pricingFactors.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="rules-section">
        <div className="section-shell">
          <div className="split-grid">
            <div className="glass-card info-card warning-card">
              <h3 className="subsection-title">
                {isRTL ? "طلبات لا نقبلها" : "Requests We Do Not Accept"}
              </h3>

              <ul className="simple-list">
                {prohibitedItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="glass-card info-card">
              <h3 className="subsection-title">
                {isRTL ? "ضوابط قانونية وحماية الخدمة" : "Legal & Service Protection"}
              </h3>

              <ul className="simple-list">
                {legalPoints.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {flags.flag_marketplace_deals && featuredDeals && featuredDeals.length > 0 && (
        <section id="deals" className="deals-preview-section" data-testid="homepage-deals-section">
          <div className="section-shell">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="section-title text-left mb-2">
                  {dict.staff_dashboard.deals_title}
                </h2>
                <p className="text-muted text-sm">{dict.staff_dashboard.deals_subtitle}</p>
              </div>
              <Link href={`/${locale}/deals`} className="text-brand-gold text-sm font-bold hover:underline mb-2" data-testid="homepage-deals-view-all">
                {dict.staff_dashboard.deals_view_all} →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredDeals.map((deal: any) => (
                <Link 
                  key={deal.id} 
                  href={`/${locale}/deals`} 
                  className="glass-card p-6 flex flex-col group transition-all hover:border-brand-gold/30" 
                  data-testid="homepage-deal-card"
                >
                  <div className="mb-4 text-[10px] uppercase tracking-widest text-brand-gold font-bold opacity-80">{deal.category}</div>
                  <h3 className="font-bold mb-2 group-hover:text-brand-gold transition-colors" data-testid="homepage-deal-title">
                    {isRTL ? deal.title_ar : deal.title_en}
                  </h3>
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white" data-testid="homepage-deal-price">
                      {deal.deal_price} <span className="text-[10px]">{deal.currency_code}</span>
                    </span>
                    {deal.original_price && (
                      <span className="text-xs text-muted line-through">
                        {deal.original_price}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="faq" className="faq-section" data-testid="homepage-cms-faq">
        <div className="section-shell">
          <h2 className="section-title">
            {isRTL ? (faqCms?.section_title_ar || "الأسئلة الشائعة") : (faqCms?.section_title_en || "Frequently Asked Questions")}
          </h2>

          <div className="faq-list">
            {(faqCms?.items || [
              {
                q: isRTL ? "كيف تضمنون جودة المنتج؟" : "How do you ensure product quality?",
                a: isRTL ? "نقوم بفحص المنتج ميدانياً قبل الشراء ونرسل لك الصور والتفاصيل." : "We inspect the product on-ground before purchase and send you photos/details.",
              },
              {
                q: isRTL ? "هل هناك عمولة إضافية؟" : "Is there an extra commission?",
                a: isRTL ? "نحن نتقاضى رسوماً ثابتة أو نسبة بسيطة يتم الاتفاق عليها مسبقاً." : "We charge a flat fee or a small percentage agreed upon in advance.",
              },
              {
                q: isRTL ? "ماذا لو لم تجدوا المنتج؟" : "What if you can't find the product?",
                a: isRTL ? "سنخبرك بذلك فوراً ولن تتحمل أي تكاليف غير المتفق عليها." : "We'll inform you immediately and you won't bear any unagreed costs.",
              }
            ]).map((faq: any, index: number) => (
              <div key={index} className="glass-card faq-item">
                <h4 className="faq-q">{isRTL ? (faq.question_ar || faq.q) : (faq.question_en || faq.q)}</h4>
                <p className="faq-a">{isRTL ? (faq.answer_ar || faq.a) : (faq.answer_en || faq.a)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Spotlight Section */}
      {flags.flag_engine_ai_pricing && (
        <section className="ai-spotlight-section">
          <div className="section-shell">
            <div className="glass-card ai-spotlight-card">
              <div className="ai-icon">🤖</div>
              <div className="ai-text">
                <h3>{isRTL ? "مساعد التفاوض والبحث الذكي بالذكاء الاصطناعي" : "AI Sourcing & Negotiation Assistant"}</h3>
                <p>
                  {isRTL 
                    ? "الآن يمكنك مقارنة وتحليل عروض الأسعار والتفاوض مع الموردين من خلال مساعدنا الذكي المدمج في التقارير لمساعدتك في اتخاذ قرارات مدروسة."
                    : "Compare options, analyze prices, and negotiate with suppliers using our context-aware AI assistant integrated directly inside your sourcing reports."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Scout Network Section */}
      {flags.flag_contributor_wallets && (
        <section className="scout-banner-section">
          <div className="section-shell">
            <div className="glass-card scout-card">
              <div className="scout-text">
                <h3>{isRTL ? "انضم لشبكة مناديب فايندورا الميدانيين" : "Join Findora's Field Scout Network"}</h3>
                <p>
                  {isRTL 
                    ? "هل تحب استكشاف الأسواق؟ اجمع بيانات السلع والمتاجر في منطقتك واحصل على مكافآت مالية فورية تُحول لمحفظتك الإلكترونية."
                    : "Love exploring local markets? Gather pricing and store details in your city, submit verification tasks offline or online, and earn rewards paid directly to your wallet."}
                </p>
              </div>
              <Link href={`/${locale}/contributors/apply`} className="scout-cta" style={{ width: 'auto' }}>
                {isRTL ? "قدم كمنسق ميداني" : "Apply as a Scout"}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Customer Reviews Section */}
      {flags.flag_customer_reviews && (
        <section className="reviews-section">
          <div className="section-shell">
            <h2 className="section-title">{isRTL ? "تقييمات وتجارب عملائنا" : "What Our Customers Say"}</h2>
            <div className="reviews-grid">
              <div className="glass-card review-card">
                <p className="review-quote">"{isRTL ? "فايندورا وفرت عليا يومين كود لف في العتبة وجابتلي الأجهزة بأرخص سعر بضمان حقيقي." : "Findora saved me days of searching in local markets. They got me exactly what I wanted at the best price."}"</p>
                <h4 className="review-author">{isRTL ? "محمد أ." : "Mohamed A."}</h4>
                <span className="review-meta">{isRTL ? "مشتريات منزلية" : "Home Appliances"}</span>
              </div>
              <div className="glass-card review-card">
                <p className="review-quote">"{isRTL ? "التقرير كان منظم جداً والذكاء الاصطناعي جاوب على كل أسئلتي بخصوص فترة الضمان والمقارنة." : "The report was extremely organized and the AI assistant answered all my questions about warranty comparisons."}"</p>
                <h4 className="review-author">{isRTL ? "سارة م." : "Sarah M."}</h4>
                <span className="review-meta">{isRTL ? "أجهزة إلكترونية" : "Electronics Sourcing"}</span>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* Roadmap Features Spotlight Grid */}
      {(flags.flag_merchant_bidding || flags.flag_support_chatbot || flags.flag_founder_dashboard) && (
        <section className="roadmap-spotlight-section" style={{ padding: '80px 0', background: '#020617' }}>
          <div className="section-shell">
            <h2 className="section-title">
              {isRTL ? "مزايا التوسع والتطوير النشطة 🛠️" : "Active Scaling & Expansion Features 🛠️"}
            </h2>
            <p className="section-subtitle" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '30px' }}>
              {isRTL 
                ? "الخدمات والأنظمة التي تم تفعيلها لخدمة ملايين العملاء والتجار بأقصى كفاءة."
                : "Operational subsystems activated to support millions of concurrent buyers and sellers."}
            </p>
            
            <div className="roadmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginTop: '40px' }}>
              
              {flags.flag_merchant_bidding && (
                <div className="glass-card roadmap-card" style={{ padding: '30px', borderRadius: '20px', border: '1px solid rgba(200, 151, 59, 0.2)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🤝</div>
                  <h3 style={{ fontSize: '1.3rem', color: '#fcd34d', marginBottom: '10px', fontWeight: 900 }}>
                    {isRTL ? "نظام المزايدة المؤتمتة للتجار" : "Outbound Merchant Bidding"}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    {isRTL
                      ? "يتيح للتجار تقديم عروض أسعارهم مباشرة للمهام والطلبات عبر روابط مشفرة آمنة تماماً ودون حاجة لتسجيل الدخول."
                      : "Allows merchants to submit bids directly via cryptographically signed tokens securely without requiring vendor logins."}
                  </p>
                </div>
              )}

              {flags.flag_support_chatbot && (
                <div className="glass-card roadmap-card" style={{ padding: '30px', borderRadius: '20px', border: '1px solid rgba(200, 151, 59, 0.2)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🤖</div>
                  <h3 style={{ fontSize: '1.3rem', color: '#fcd34d', marginBottom: '10px', fontWeight: 900 }}>
                    {isRTL ? "فض النزاعات والدعم الذكي بالذكاء الاصطناعي" : "AI Dispute & Support Bot"}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    {isRTL
                      ? "وكيل ذكاء اصطناعي تفاعلي يساعد العملاء في تتبع الطلبات، حل نزاعات التوريد مع التجار، وطلب استرجاع العربون تلقائياً."
                      : "An interactive AI agent helping customers track orders, resolve merchant disputes, and request refunds instantly."}
                  </p>
                </div>
              )}

              {flags.flag_founder_dashboard && (
                <div className="glass-card roadmap-card" style={{ padding: '30px', borderRadius: '20px', border: '1px solid rgba(200, 151, 59, 0.2)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📈</div>
                  <h3 style={{ fontSize: '1.3rem', color: '#fcd34d', marginBottom: '10px', fontWeight: 900 }}>
                    {isRTL ? "لوحة تحليلات الأداء والنمو الفورية" : "Live Operational Analytics Dashboard"}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    {isRTL
                      ? "لوحة إحصاءات متطورة للمؤسسين لمتابعة حجم الطلبات، كثافة وتفاعل المناديب النشطين، وعمليات التوريد الحية في مصر."
                      : "Live KPIs screen tracking request volume, scout activity, active densities, and live sourcing stats."}
                  </p>
                </div>
              )}

            </div>
          </div>
        </section>
      )}

      <section className="cta-section">
        <div className="section-shell cta-inner">
          <h2 className="cta-title">
            {isRTL
              ? "غير متأكد أي خدمة تناسبك؟"
              : "Not sure which service fits your request?"}
          </h2>

          <p className="cta-desc">
            {isRTL
              ? "أرسل طلبك وسنراجع التفاصيل ونقترح عليك أنسب نوع خدمة وتسعير واضح قبل البدء."
              : "Send us your request and we’ll review the details, suggest the right service type, and share clear pricing before we start."}
          </p>

          <Link href={`/${locale}/start-request`} className="hero-cta-primary">
            {isRTL ? "أرسل طلبك الآن" : "Submit Your Request"}
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Image
          src="/logo-2-processed.png"
          alt="Findora"
          width={250}
          height={175}
          className="footer-logo"
        />
        <p className="footer-text">
          {isRTL
            ? "© 2026 فايندورا. جميع الحقوق محفوظة."
            : "© 2026 Findora. All rights reserved."}
        </p>
      </footer>

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .ai-spotlight-section, .scout-banner-section, .reviews-section {
          padding: 80px 0;
          background: #020617;
        }
        .ai-spotlight-card {
          display: flex;
          align-items: center;
          gap: 30px;
          padding: 40px;
          border-radius: 24px;
        }
        @media (max-width: 768px) {
          .ai-spotlight-card { flex-direction: column; text-align: center; }
        }
        .ai-icon {
          font-size: 3.5rem;
        }
        .ai-text h3 {
          font-size: 1.8rem;
          color: white;
          margin-bottom: 12px;
        }
        .ai-text p {
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.6;
        }
        
        .scout-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
          padding: 40px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(200, 151, 59, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(200, 151, 59, 0.2);
        }
        @media (max-width: 768px) {
          .scout-card { flex-direction: column; text-align: center; }
        }
        .scout-text h3 { font-size: 1.8rem; color: #fcd34d; margin-bottom: 12px; }
        .scout-text p { color: rgba(248, 250, 252, 0.72); line-height: 1.6; }
        .scout-cta {
          background: #d4a63c;
          color: #020617;
          font-weight: 900;
          padding: 1rem 2rem;
          border-radius: 12px;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .scout-cta:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(212,166,60,0.4); }
        
        .reviews-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 40px;
        }
        @media (max-width: 768px) {
          .reviews-grid { grid-template-columns: 1fr; }
        }
        .review-card {
          padding: 30px;
          border-radius: 20px;
        }
        .review-quote {
          font-style: italic;
          color: rgba(248, 250, 252, 0.8);
          font-size: 1.05rem;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .review-author {
          font-weight: 900;
          color: white;
          margin-bottom: 4px;
        }
        .review-meta {
          font-size: 0.8rem;
          color: #d4a63c;
          font-weight: 800;
        }

        .landing-page {
          --header-height: 132px;
          --accent: #d4a63c;
          background: #020617;
          color: #f8fafc;
          min-height: 100vh;
          overflow-x: hidden;
        }


        #home,
        #how,
        #why,
        #categories,
        #flow,
        #pricing,
        #faq {
          scroll-margin-top: calc(var(--header-height) + 24px);
        }

        .section-shell {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
        }

        .glass-card {
          background: linear-gradient(
            145deg,
            rgba(15, 23, 42, 0.72),
            rgba(15, 23, 42, 0.42)
          );
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 14px 34px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .announcements-outer {
          position: relative;
          z-index: 20;
          margin-top: calc(var(--header-height) + 1.5rem);
          margin-bottom: -4rem;
        }

        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          overflow: hidden;
          /* 118px header + 40px gap above content */
          padding: calc(var(--header-height) + 40px) 24px 96px;
          box-sizing: border-box;
          background: radial-gradient(
            circle at 50% 0%,
            rgba(200, 151, 59, 0.05),
            transparent 50%
          );
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        .hero-glow-1 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(200, 151, 59, 0.12), transparent 70%);
          top: -220px;
          left: 50%;
          transform: translateX(-50%);
        }

        .hero-glow-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.08), transparent 70%);
          bottom: 5%;
          right: 2%;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 1000px;
        }

        .hero-title {
          font-size: clamp(2.7rem, 6vw, 4.7rem);
          line-height: 1.08;
          margin: 0 0 1.6rem;
          font-weight: 900;
          background: linear-gradient(to bottom, #ffffff 40%, rgba(255, 255, 255, 0.66));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-desc {
          font-size: clamp(1.08rem, 2vw, 1.35rem);
          color: rgba(248, 250, 252, 0.72);
          margin: 0 auto 3rem;
          max-width: 780px;
          line-height: 1.75;
        }

        .hero-ctas {
          display: flex;
          gap: 1.1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .hero-cta-primary {
          background: var(--accent);
          color: #081018;
          font-weight: 900;
          font-size: 1.02rem;
          padding: 1rem 2.4rem;
          border-radius: 14px;
          text-decoration: none;
          transition: all 0.28s ease;
          box-shadow: 0 10px 30px rgba(200, 151, 59, 0.22);
        }

        .hero-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(200, 151, 59, 0.3);
        }

        .hero-cta-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-weight: 800;
          font-size: 1.02rem;
          padding: 1rem 2.4rem;
          border-radius: 14px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.28s ease;
        }

        .hero-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-2px);
        }

        .hero-free-trial-banner {
          margin: 3rem auto 0;
          max-width: 650px;
          background: linear-gradient(135deg, rgba(212,166,60,0.15) 0%, rgba(212,166,60,0.05) 100%);
          border: 1px solid rgba(212,166,60,0.3);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.2rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          text-align: start;
        }

        .hero-free-trial-banner .banner-icon {
          font-size: 2.5rem;
          line-height: 1;
          flex-shrink: 0;
          animation: bounce 2s infinite;
        }

        .hero-free-trial-banner .banner-content {
          flex: 1;
        }

        .hero-free-trial-banner h4 {
          margin: 0 0 0.4rem;
          color: #fcd34d;
          font-size: 1.1rem;
          font-weight: 800;
        }

        .hero-free-trial-banner p {
          margin: 0 0 1rem;
          font-size: 0.9rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.4;
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .banner-actions .btn-start {
          background: #d4a63c;
          color: #020617;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        
        .banner-actions .btn-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(212,166,60,0.4);
        }

        .banner-actions .banner-divider {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
        }

        .banner-actions .btn-login {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s;
        }

        .banner-actions .btn-login:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .how-section,
        .why-section,
        .categories-section,
        .flow-section,
        .pricing-section,
        .rules-section,
        .faq-section,
        .trust-deal-engine-section,
        .cta-section {
          padding: 7rem 0;
          position: relative;
        }

        .trust-deal-engine-section {
          background: #020617;
        }

        .trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .trust-card {
          padding: 2.5rem 2rem;
          border-radius: 28px;
          transition: all 0.3s ease;
        }

        .trust-card:hover {
          transform: translateY(-5px);
          border-color: rgba(212, 166, 60, 0.25);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .trust-icon-box {
          margin-bottom: 1.5rem;
        }

        .trust-icon-dot {
          width: 12px;
          height: 12px;
          background: var(--accent);
          border-radius: 50%;
          box-shadow: 0 0 15px var(--accent);
        }

        .how-section,
        .categories-section,
        .pricing-section,
        .deals-preview-section {
          padding: 100px 0;
          background: linear-gradient(to bottom, #020617, #01040a);
        }

        .faq-section {
          background: #01040f;
        }

        .why-section,
        .flow-section,
        .rules-section,
        .cta-section {
          background: #020617;
        }

        .section-title {
          text-align: center;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 900;
          margin: 0 0 1.4rem;
          color: #fff;
        }

        .section-subtitle {
          text-align: center;
          color: rgba(255, 255, 255, 0.66);
          margin: 0 auto 3rem;
          font-size: 1.12rem;
          line-height: 1.8;
          max-width: 900px;
        }

        .section-subtitle.narrow {
          max-width: 980px;
        }

        .card-title,
        .pricing-card-title,
        .subsection-title,
        .flow-title,
        .faq-q {
          color: #fff;
          font-weight: 800;
        }

        .card-desc,
        .flow-desc,
        .faq-a,
        .small-note {
          color: rgba(255, 255, 255, 0.62);
          line-height: 1.7;
        }

        .how-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.5rem;
        }

        .how-step {
          border-radius: 24px;
          padding: 2.5rem 2rem;
          position: relative;
          overflow: hidden;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.75rem;
          text-align: center;
        }

        .how-step .card-title {
          margin: 0;
        }

        .how-step .card-desc {
          margin: 0;
        }

        .how-step-num {
          font-size: 4.5rem;
          font-weight: 950;
          color: var(--accent);
          opacity: 0.15;
          position: absolute;
          top: 0.5rem;
          right: 1.2rem;
          line-height: 1;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .why-card {
          border-radius: 22px;
          padding: 2rem 1.5rem;
          border-inline-start: 2px solid rgba(212, 166, 60, 0.55);
        }

        .categories-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
        }

        .category-pill {
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.86);
          transition: all 0.25s ease;
        }

        .category-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(212, 166, 60, 0.35);
          color: #fff;
        }

        .flow-timeline {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
          max-width: 880px;
          margin: 0 auto;
        }

        .flow-item {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: 1rem;
          align-items: start;
        }

        .flow-dot {
          width: 54px;
          height: 54px;
          background: rgba(212, 166, 60, 0.1);
          color: var(--accent);
          border: 1px solid rgba(212, 166, 60, 0.28);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.12rem;
        }

        .flow-content {
          border-radius: 20px;
          padding: 1.35rem 1.4rem;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.3rem;
          margin-top: 2rem;
        }

        .pricing-card {
          border-radius: 24px;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }

        .pricing-card-title {
          font-size: 1.45rem;
          margin: 0 0 0.8rem;
        }

        .pricing-card-desc {
          color: rgba(255, 255, 255, 0.66);
          line-height: 1.75;
          margin: 0 0 1.1rem;
        }

        .pricing-list {
          margin: 0 0 1.4rem;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.72rem;
        }

        .pricing-list li,
        .simple-list li {
          position: relative;
          padding-inline-start: 1.15rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.7;
        }

        .pricing-list li::before,
        .simple-list li::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0.72rem;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          transform: translateY(-50%);
        }

        .pricing-price-box {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .pricing-original-price {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.4);
          text-decoration: line-through;
        }

        .pricing-price {
          font-size: 1.45rem;
          font-weight: 900;
          color: var(--accent);
        }

        .pricing-promo-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: #081018;
          background: var(--accent);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }

        /* "Starting from" label above price */
        .pricing-starting-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.55);
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin-bottom: 0.15rem;
        }

        /* Small footnote under price for extra fees */
        .pricing-extra-fees-note {
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.32);
          margin-top: 0.3rem;
          font-style: italic;
          line-height: 1.4;
        }

        /* Projects & Supply - by agreement block */
        .pricing-by-agreement {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .pricing-agreement-text {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--accent);
          letter-spacing: -0.01em;
        }

        .pricing-agreement-sub {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.5;
          margin-top: 0.15rem;
        }

        .pricing-note {
          margin: 0.7rem 0 1.2rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.65;
        }

        .pricing-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 800;
          color: #081018;
          background: var(--accent);
          transition: transform 0.22s ease, opacity 0.22s ease;
        }

        .pricing-cta:hover {
          transform: translateY(-1px);
          opacity: 0.97;
        }

        .split-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
          margin-top: 1.4rem;
        }

        .info-card {
          border-radius: 22px;
          padding: 1.8rem 1.5rem;
        }

        .warning-card {
          border: 1px solid rgba(212, 166, 60, 0.2);
        }

        .subsection-title {
          font-size: 1.35rem;
          margin: 0 0 1rem;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin-bottom: 1rem;
        }

        .soft-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.8rem 1rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.88);
          font-weight: 700;
        }

        .simple-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .faq-list {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .faq-item {
          border-radius: 18px;
          padding: 1.6rem;
        }

        .faq-q {
          font-size: 1.14rem;
          margin: 0 0 0.75rem;
        }

        .cta-section {
          text-align: center;
        }

        .cta-inner {
          max-width: 900px;
        }

        .cta-title {
          font-size: clamp(2rem, 4vw, 2.8rem);
          font-weight: 900;
          margin: 0 0 1rem;
          color: #fff;
        }

        .cta-desc {
          font-size: 1.12rem;
          color: rgba(255, 255, 255, 0.66);
          margin: 0 auto 2.5rem;
          line-height: 1.8;
          max-width: 780px;
        }

        .landing-footer {
          padding: 4rem 2rem;
          text-align: center;
          background: #01040f;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .footer-logo {
          opacity: 0.55;
          margin-bottom: 1.2rem;
          width: auto;
          height: auto;
          max-width: 220px;
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.32);
          font-size: 0.92rem;
        }

        @media (max-width: 1180px) {
          .how-steps,
          .pricing-grid,
          .why-grid,
          .trust-grid,
          .split-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .landing-page {
            /* matches mobile header height */
            --header-height: 84px;
          }

          .hero-section {
            padding: calc(var(--header-height) + 3rem) 16px 5rem;
          }

          .hero-title {
            font-size: clamp(2.1rem, 10vw, 3.3rem);
          }

          .hero-desc {
            font-size: 1rem;
          }

          .hero-ctas {
            flex-direction: column;
            align-items: center;
          }

          .hero-cta-primary,
          .hero-cta-secondary {
            width: 100%;
            max-width: 320px;
          }

          .how-steps,
          .pricing-grid,
          .why-grid,
          .trust-grid,
          .split-grid {
            grid-template-columns: 1fr;
          }

          .flow-item {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .flow-dot {
            margin: 0 auto;
          }

          .section-title {
            margin-bottom: 1rem;
          }

          .section-subtitle {
            margin-bottom: 2rem;
          }

          .how-section,
          .why-section,
          .categories-section,
          .flow-section,
          .pricing-section,
          .rules-section,
          .faq-section,
          .trust-deal-engine-section,
          .cta-section {
            padding: 4.5rem 0;
          }

          .category-pill {
            width: 100%;
            text-align: center;
          }

          .section-shell {
            width: min(1240px, calc(100% - 24px));
          }
        }
      `}</style>
    </div>
  );
}