import React from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/i18n/config";
import LandingHeader from "@/components/LandingHeader";
import Footer from "@/components/landing/Footer/Footer";

export const metadata = {
  title: "الضوابط القانونية | Findora",
  description: "الضوابط القانونية، سياسة الخصوصية، شروط الخدمة، وسياسة الاسترجاع الخاصة بمنصة فايندورا.",
};

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  const isRTL = locale === "ar";

  // Localized navigation header labels
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

  const content = {
    pageTitle: isRTL ? "الضوابط القانونية والمستندات" : "Legal Documentation",
    pageSubtitle: isRTL 
      ? "نلتزم في فايندورا بأعلى معايير الشفافية والموثوقية لحماية حقوق جميع الأطراف." 
      : "At Findora, we commit to the highest standards of transparency and reliability to protect all parties.",
    privacy: {
      title: isRTL ? "سياسة الخصوصية" : "Privacy Policy",
      text: isRTL ? (
        <>
          <p>توضح هذه السياسة كيفية جمعنا للمعلومات الشخصية واستخدامها وحمايتها في منصة فايندورا.</p>
          <h4 className="font-bold mt-4 mb-2">1. المعلومات التي نجمعها</h4>
          <p>نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند التسجيل، مثل الاسم، البريد الإلكتروني، رقم الهاتف، ومعلومات الشركة. كما نجمع بيانات الاستخدام والتصفح لتحسين تجربتك.</p>
          <h4 className="font-bold mt-4 mb-2">2. استخدام المعلومات</h4>
          <p>نستخدم معلوماتك لتوفير خدماتنا وتحسينها، وتخصيص تجربتك، وإرسال تنبيهات هامة حول عروض الأسعار والطلبات الخاصة بك، ولأغراض التسويق إذا وافقت على ذلك.</p>
          <h4 className="font-bold mt-4 mb-2">3. مشاركة المعلومات</h4>
          <p>قد نشارك معلوماتك الضرورية فقط مع الموردين أو الشركاء لضمان إتمام عملية التوريد بشكل ناجح. لن نقوم ببيع بياناتك الشخصية لأي طرف ثالث.</p>
          <h4 className="font-bold mt-4 mb-2">4. أمان البيانات</h4>
          <p>نتخذ إجراءات أمنية وتقنية صارمة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو التدمير.</p>
        </>
      ) : (
        <>
          <p>This policy explains how we collect, use, and protect personal information on the Findora platform.</p>
          <h4 className="font-bold mt-4 mb-2">1. Information We Collect</h4>
          <p>We collect information you provide directly to us when registering, such as name, email, phone number, and company information. We also collect usage data to improve your experience.</p>
          <h4 className="font-bold mt-4 mb-2">2. Use of Information</h4>
          <p>We use your information to provide and improve our services, personalize your experience, send important alerts about your quotes, and for marketing purposes if you opt-in.</p>
          <h4 className="font-bold mt-4 mb-2">3. Information Sharing</h4>
          <p>We may share strictly necessary information with suppliers or partners to ensure successful procurement. We will never sell your personal data to third parties.</p>
          <h4 className="font-bold mt-4 mb-2">4. Data Security</h4>
          <p>We implement rigorous technical and security measures to protect your data from unauthorized access, alteration, or destruction.</p>
        </>
      )
    },
    terms: {
      title: isRTL ? "شروط الخدمة" : "Terms of Service",
      text: isRTL ? (
        <>
          <p>مرحباً بك في فايندورا. باستخدامك للمنصة، فإنك توافق على الشروط والأحكام التالية:</p>
          <h4 className="font-bold mt-4 mb-2">1. استخدام المنصة</h4>
          <p>يجب أن تكون مؤهلاً قانونياً لإبرام العقود لاستخدام خدماتنا. يمنع استخدام المنصة لأي أغراض غير قانونية أو احتيالية.</p>
          <h4 className="font-bold mt-4 mb-2">2. مسؤولية المحتوى</h4>
          <p>أنت مسؤول عن صحة ودقة المعلومات التي تقدمها في طلبات التسعير أو التوريد. فايندورا تعمل كوسيط تقني ولا تتحمل مسؤولية جودة المنتجات الموردة من قبل أطراف ثالثة إلا في حال التعاقد المباشر الشامل.</p>
          <h4 className="font-bold mt-4 mb-2">3. الرسوم والمدفوعات</h4>
          <p>قد يتم تطبيق رسوم على بعض الخدمات المتقدمة، وسيتم توضيح ذلك لك قبل إتمام أي معاملة. جميع الرسوم تخضع للضرائب المحلية المطبقة.</p>
          <h4 className="font-bold mt-4 mb-2">4. إنهاء الحساب</h4>
          <p>يحق لفايندورا تعليق أو إنهاء حسابك في حال انتهاكك لهذه الشروط أو عند الاشتباه بوجود نشاط غير قانوني.</p>
        </>
      ) : (
        <>
          <p>Welcome to Findora. By using our platform, you agree to the following terms and conditions:</p>
          <h4 className="font-bold mt-4 mb-2">1. Use of Platform</h4>
          <p>You must be legally capable of entering into contracts to use our services. The platform may not be used for illegal or fraudulent purposes.</p>
          <h4 className="font-bold mt-4 mb-2">2. Content Responsibility</h4>
          <p>You are responsible for the accuracy of information provided in your requests. Findora acts as a technical intermediary and is not liable for third-party product quality unless under a comprehensive direct contract.</p>
          <h4 className="font-bold mt-4 mb-2">3. Fees & Payments</h4>
          <p>Fees may apply for advanced services, which will be clearly disclosed before transactions. All fees are subject to applicable local taxes.</p>
          <h4 className="font-bold mt-4 mb-2">4. Account Termination</h4>
          <p>Findora reserves the right to suspend or terminate your account if you violate these terms or for suspected illegal activities.</p>
        </>
      )
    },
    refund: {
      title: isRTL ? "سياسة الاسترجاع" : "Refund Policy",
      text: isRTL ? (
        <>
          <p>حرصاً منا على رضا عملائنا، نوضح هنا سياسة استرجاع الأموال وإلغاء الطلبات:</p>
          <h4 className="font-bold mt-4 mb-2">1. رسوم الخدمات والاشتراكات</h4>
          <p>رسوم الاشتراكات أو الخدمات التقنية التي تم تنفيذها غير قابلة للاسترداد بعد تفعيل الخدمة أو إرسال تقارير التسعير المنجزة، إلا في حال وجود خطأ تقني من جانبنا.</p>
          <h4 className="font-bold mt-4 mb-2">2. مبالغ التأمين أو الدفعات المقدمة</h4>
          <p>في حال التعامل مع الموردين عبر المنصة، تخضع سياسة استرجاع مبالغ البضائع لشروط المورد نفسه. تقوم فايندورا بتوضيح هذه الشروط في كل عرض أسعار قبل الموافقة عليه.</p>
          <h4 className="font-bold mt-4 mb-2">3. إجراءات طلب الاسترجاع</h4>
          <p>يمكن تقديم طلب استرجاع عبر التواصل مع الدعم الفني خلال 14 يوماً من العملية المسببة للنزاع. سيتم مراجعة الطلب والرد خلال 3 إلى 5 أيام عمل.</p>
        </>
      ) : (
        <>
          <p>To ensure customer satisfaction, our refund and cancellation policies are as follows:</p>
          <h4 className="font-bold mt-4 mb-2">1. Service & Subscription Fees</h4>
          <p>Fees for executed technical services or delivered pricing reports are non-refundable once activated, except in the event of a technical failure on our end.</p>
          <h4 className="font-bold mt-4 mb-2">2. Deposits & Down Payments</h4>
          <p>When dealing with suppliers, the refund policy for goods is governed by the specific supplier's terms. Findora ensures these terms are explicitly stated in every quote before your approval.</p>
          <h4 className="font-bold mt-4 mb-2">3. Refund Request Process</h4>
          <p>Refund requests can be submitted to support within 14 days of the disputed transaction. Requests will be reviewed and answered within 3-5 business days.</p>
        </>
      )
    }
  };

  return (
    <div className="legal-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* Scope-restricted styles to replicate the landing page and handle layout accurately without Tailwind */}
      <style>{`
        .legal-page {
          min-height: 100vh;
          background-color: #020617;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .legal-main {
          flex: 1;
          display: flex;
          gap: 48px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 160px 24px 96px 24px;
          position: relative;
          z-index: 10;
          box-sizing: border-box;
        }
        .legal-sidebar {
          width: 260px;
          flex-shrink: 0;
        }
        .legal-sidebar-sticky {
          position: sticky;
          top: 120px;
        }
        .legal-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 64px;
        }
        .legal-section {
          scroll-margin-top: 120px;
        }
        .legal-card {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .legal-title {
          font-size: 1.85rem;
          font-weight: 800;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .legal-nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #ffffff;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .legal-nav-link:hover {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .prose p {
          color: #94a3b8;
          line-height: 1.7;
          margin-bottom: 16px;
          font-size: 0.95rem;
        }
        .prose h4 {
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        @media (max-width: 768px) {
          .legal-main {
            flex-direction: column;
            padding-top: 120px;
            gap: 32px;
          }
          .legal-sidebar {
            width: 100%;
          }
          .legal-sidebar-sticky {
            position: relative;
            top: 0;
          }
          .legal-card {
            padding: 24px;
          }
        }
      `}</style>

      {/* Header */}
      <LandingHeader locale={locale} isRTL={isRTL} labels={headerLabels} />

      <main className="legal-main">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-[-1]" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "500px", pointerEvents: "none", zIndex: -1 }} />
        
        {/* Sticky Sidebar Navigation */}
        <aside className="legal-sidebar">
          <div className="legal-sidebar-sticky">
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: "8px", letterSpacing: "-0.03em" }}>{content.pageTitle}</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "32px", lineHeight: 1.5 }}>{content.pageSubtitle}</p>
            
            <nav style={{ display: "flex", flexDirection: "column" }}>
              <a href="#privacy" className="legal-nav-link">
                <span>{content.privacy.title}</span>
                <span>{isRTL ? "←" : "→"}</span>
              </a>
              <a href="#terms" className="legal-nav-link">
                <span>{content.terms.title}</span>
                <span>{isRTL ? "←" : "→"}</span>
              </a>
              <a href="#refund" className="legal-nav-link">
                <span>{content.refund.title}</span>
                <span>{isRTL ? "←" : "→"}</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <div className="legal-content">
          
          {/* Privacy Section */}
          <section id="privacy" className="legal-section">
            <div className="legal-card">
              <h2 className="legal-title" style={{ color: "#f59e0b" }}>
                <span>🔒</span> {content.privacy.title}
              </h2>
              <div className="prose">
                {content.privacy.text}
              </div>
            </div>
          </section>

          {/* Terms Section */}
          <section id="terms" className="legal-section">
            <div className="legal-card">
              <h2 className="legal-title" style={{ color: "#3b82f6" }}>
                <span>⚖️</span> {content.terms.title}
              </h2>
              <div className="prose">
                {content.terms.text}
              </div>
            </div>
          </section>

          {/* Refund Section */}
          <section id="refund" className="legal-section">
            <div className="legal-card">
              <h2 className="legal-title" style={{ color: "#10b981" }}>
                <span>💸</span> {content.refund.title}
              </h2>
              <div className="prose">
                {content.refund.text}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <Footer dict={dict} locale={locale} isRTL={isRTL} />
    </div>
  );
}
