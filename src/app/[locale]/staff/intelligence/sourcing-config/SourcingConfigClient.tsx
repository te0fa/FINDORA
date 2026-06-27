'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { saveSourcingSourceAction } from '../customers/actions';

interface SourcingSource {
  id: string;
  name: string;
  display_name_en: string;
  display_name_ar: string;
  is_active: boolean;
  api_key: string | null;
  config_settings: {
    priority?: number;
  };
}

interface SourcingConfigClientProps {
  locale: string;
  initialSources: SourcingSource[];
}

export default function SourcingConfigClient({
  locale,
  initialSources
}: SourcingConfigClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [sources, setSources] = useState<SourcingSource[]>(initialSources);
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = (source: SourcingSource, isChecked: boolean) => {
    startTransition(async () => {
      try {
        await saveSourcingSourceAction({
          id: source.id,
          is_active: isChecked,
          api_key: source.api_key || undefined
        }, locale);

        setSources(prev => prev.map(s => s.id === source.id ? { ...s, is_active: isChecked } : s));
        toast(
          isRTL 
            ? `تم ${isChecked ? 'تفعيل' : 'تعطيل'} محرك ${source.display_name_ar}` 
            : `${source.display_name_en} has been ${isChecked ? 'activated' : 'deactivated'}`,
          { type: 'success' }
        );
      } catch (err: any) {
        toast(err.message || 'Error updating source status', { type: 'error' });
      }
    });
  };

  const handleSaveApiKey = (source: SourcingSource, newKey: string) => {
    startTransition(async () => {
      try {
        await saveSourcingSourceAction({
          id: source.id,
          is_active: source.is_active,
          api_key: newKey || undefined
        }, locale);

        setSources(prev => prev.map(s => s.id === source.id ? { ...s, api_key: newKey } : s));
        toast(
          isRTL 
            ? 'تم حفظ مفتاح API بنجاح 🔑' 
            : 'API Key saved successfully! 🔑',
          { type: 'success' }
        );
      } catch (err: any) {
        toast(err.message || 'Error saving API Key', { type: 'error' });
      }
    });
  };

  return (
    <div className="sourcing-config-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sourcing-config-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        .sources-list { display: flex; flex-direction: column; gap: 20px; }
        .source-card {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 24px;
        }

        .source-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
        .source-title { font-size: 1.25rem; font-weight: 900; color: white; }
        
        /* Toggle Switch */
        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 34px; border: 1px solid rgba(255,255,255,0.08); }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(24px); }
        [dir="rtl"] input:checked + .slider:before { transform: translateX(-24px); }

        /* Key update region */
        .key-row { display: flex; gap: 10px; margin-top: 15px; }
        .key-input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: white; font-family: inherit; font-size: 0.9rem; }
        .key-input:focus { outline: none; border-color: #f7d46b; }
        .btn-key-save { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); color: #f59e0b; padding: 10px 18px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .btn-key-save:hover { background: rgba(245, 158, 11, 0.15); color: white; }

        .source-description { font-size: 0.9rem; color: rgba(255,255,255,0.5); line-height: 1.45; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'إعدادات محركات البحث أونلاين' : 'Online Sourcing Config'}</h1>
          <p className="subtitle">
            {isRTL 
              ? 'تفعيل وتعديل مفاتيح الربط البرمجي للمنقبين وكاشفي عروض الأسعار.' 
              : 'Activate and configure API keys for online web scrapers and crawlers.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← لوحة الذكاء' : '← Intelligence'}
        </Link>
      </header>

      <div className="sources-list">
        {sources.map(source => {
          const requiresApiKey = source.name !== 'gemini_grounding' && source.name !== 'local_scraper';
          
          return (
            <div key={source.id} className="source-card">
              <div className="source-header">
                <h3 className="source-title">{isRTL ? source.display_name_ar : source.display_name_en}</h3>
                
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={source.is_active}
                    onChange={(e) => handleToggleActive(source, e.target.checked)}
                    disabled={isPending}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <p className="source-description">
                {source.name === 'gemini_grounding' && (
                  isRTL 
                    ? 'يستخدم وكيل البحث الحي بالذكاء الاصطناعي لاستكشاف جوجل شوبينج والأسواق وعروض الأسعار في الوقت الفعلي ومقارنتها تلقائياً بدون مفاتيح ربط إضافية.'
                    : 'Leverages AI Grounding Search to fetch real-time prices from Google Shopping and local stores without external API costs.'
                )}
                {source.name === 'local_scraper' && (
                  isRTL
                    ? 'كاشط داخلي يحاكي طلبات الأسعار من المتاجر المحلية المصرية (بي تك، راية شوب، جوميا) للتحقق الفوري من التوافر والسعر.'
                    : 'Crawls and simulates price requests for local Egyptian shops (B.Tech, Raya, Jumia) for immediate quotes.'
                )}
                {source.name === 'apilayer_marketplace' && (
                  isRTL
                    ? 'ربط مباشر مع بوابة APILayer Marketplace للبحث الفوري وجلب أسعار السلع من موقع أمازون العالمي والمحلي.'
                    : 'Direct integration with APILayer Marketplace for instant Amazon search and price retrieval.'
                )}
                {source.name === 'scrapebadger_amazon' && (
                  isRTL
                    ? 'بوابة ScrapeBadger المتخصصة في سحب عروض أمازون، تجاوز الحظر، وجلب تفاصيل الضمان وتوافر السلعة.'
                    : 'ScrapeBadger Amazon crawler for bypassing blocks, fetching warranties, and checking stock availability.'
                )}
                {source.name === 'apilayer_google_search' && (
                  isRTL 
                    ? 'محرك البحث من APILayer للبحث في جوجل والحصول على عروض أسعار السلع مباشرة.'
                    : 'APILayer Google Search engine to run search queries and gather price quotes directly.'
                )}
                {source.name === 'serpapi_search' && (
                  isRTL 
                    ? 'أداة SerpApi للتنقيب في نتائج جوجل شوبينج ومقارنة أسعار المنتجات في المتاجر المختلفة.'
                    : 'SerpApi integration to crawl Google Shopping results and compare product offers across multiple stores.'
                )}
                {source.name === 'valueserp_search' && (
                  isRTL 
                    ? 'مستكشف ValueSerp السريع لجلب نتائج البحث وقوائم المنتجات والأسعار من محركات البحث.'
                    : 'ValueSerp Google Search API for super-fast retrieval of search results and shopping items.'
                )}
                {source.name === 'scrapingbee_api' && (
                  isRTL 
                    ? 'بوابة كشط الويب ScrapingBee لاستخراج البيانات وتجاوز تقنيات الحظر باستخدام متصفحات حقيقية.'
                    : 'ScrapingBee Web Scraper to run headless JS browsing on custom stores and retrieve target price quotes.'
                )}
              </p>

              {requiresApiKey && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    {isRTL ? 'مفتاح الربط البرمجي (API Key):' : 'API Key Credentials:'}
                  </label>
                  
                  <KeyRow
                    initialKey={source.api_key || ''}
                    onSave={(key) => handleSaveApiKey(source, key)}
                    isPending={isPending}
                    isRTL={isRTL}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component to manage input state cleanly
function KeyRow({
  initialKey,
  onSave,
  isPending,
  isRTL
}: {
  initialKey: string;
  onSave: (key: string) => void;
  isPending: boolean;
  isRTL: boolean;
}) {
  const [key, setKey] = useState(initialKey);
  
  return (
    <div className="key-row">
      <input
        className="key-input"
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder={isRTL ? 'أدخل مفتاح الـ API هنا...' : 'Enter API Credential...'}
      />
      <button
        type="button"
        className="btn-key-save"
        onClick={() => onSave(key)}
        disabled={isPending}
      >
        {isRTL ? 'حفظ 🔑' : 'Save 🔑'}
      </button>
    </div>
  );
}
