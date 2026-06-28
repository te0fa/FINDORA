import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { locales, type Locale } from "@/lib/i18n/config";
import CMSLayoutWrapper from "@/components/cms/CMSLayoutWrapper";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/Toast";
import { Suspense } from "react";
import PWARegistration from "@/components/PWARegistration";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";


const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://findora.app'),
  title: {
    default: 'Findora — خدمة البحث والتوريد الذكي',
    template: '%s | Findora',
  },
  description:
    'Findora هي منصة تسوق ذكية مصرية — أرسل طلبك، وسنبحث لك عن أفضل الأسعار والموردين. Findora is Egypt\'s smart sourcing platform — submit your request and we find the best prices.',
  keywords: [
    'Findora', 'فايندورا', 'تسوق ذكي', 'بحث موردين', 'أسعار', 'sourcing Egypt',
    'شراء', 'عروض أسعار', 'smart shopping', 'procurement', 'Egypt',
  ],
  authors: [{ name: 'Findora', url: 'https://findora.app' }],
  creator: 'Findora',
  publisher: 'Findora',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: 'en_US',
    url: 'https://findora.app',
    siteName: 'Findora',
    title: 'Findora — خدمة البحث والتوريد الذكي',
    description: 'أرسل طلبك، وسنبحث لك عن أفضل الأسعار والموردين في مصر.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Findora — Smart Sourcing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Findora — خدمة البحث والتوريد الذكي',
    description: 'أرسل طلبك، وسنبحث لك عن أفضل الأسعار والموردين في مصر.',
    images: ['/og-image.png'],
    creator: '@findora_app',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category: 'shopping',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? cairo.className : inter.className;

  // Check CMS Edit Permissions
  let canEdit = false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: staffData } = await (supabase
      .from('staff_members') as any)
      .select('id, staff_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();
      
    if (staffData && (staffData.staff_role === 'admin' || staffData.staff_role === 'owner' || staffData.staff_role === 'developer')) {
      canEdit = true;
    }
  }

  return (
    <html lang={locale} dir={dir}>
      <body className={fontClass}>
        <ToastProvider>
          <PWARegistration />
          <CMSLayoutWrapper canEdit={canEdit}>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </CMSLayoutWrapper>
          <Analytics />
          <SpeedInsights />
        </ToastProvider>
      </body>
    </html>
  );
}
