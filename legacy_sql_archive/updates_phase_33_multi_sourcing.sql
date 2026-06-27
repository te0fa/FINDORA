-- ============================================================
-- PHASE 33: FINDORA Multi-Source Sourcing Config & Logs
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sourcing_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL, -- e.g. 'gemini_grounding', 'local_scraper', 'apilayer_marketplace', 'scrapebadger_amazon'
    display_name_en text NOT NULL,
    display_name_ar text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    api_key text,
    config_settings jsonb DEFAULT '{}'::jsonb, -- priority, custom options, etc.
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.online_merchant_quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE,
    source_name text NOT NULL, -- e.g. 'scrapebadger_amazon'
    store_name text NOT NULL,  -- e.g. 'Amazon Egypt', 'B.Tech'
    title text NOT NULL,
    price numeric(12,2) NOT NULL,
    product_url text,
    availability_status text DEFAULT 'In Stock',
    raw_response jsonb DEFAULT '{}'::jsonb,
    scraped_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sourcing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_merchant_quotes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sourcing_sources' AND policyname = 'Staff manage sourcing sources') THEN
        CREATE POLICY "Staff manage sourcing sources" ON public.sourcing_sources FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'online_merchant_quotes' AND policyname = 'Staff manage online quotes') THEN
        CREATE POLICY "Staff manage online quotes" ON public.online_merchant_quotes FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- Seed the 8 initial engines
INSERT INTO public.sourcing_sources (name, display_name_en, display_name_ar, is_active, api_key, config_settings)
VALUES
    ('gemini_grounding', 'AI Grounded Search (Gemini)', 'البحث الحي بالذكاء الاصطناعي (Gemini)', true, NULL, '{"priority": 1}'),
    ('local_scraper', 'Local Web Scraper (B.Tech, Raya, Jumia)', 'كاشف ويب محلي (بي تك، راية، جوميا)', true, NULL, '{"priority": 2}'),
    ('apilayer_marketplace', 'APILayer Marketplace Amazon Search', 'موقع APILayer للبحث في أمازون', false, NULL, '{"priority": 3}'),
    ('scrapebadger_amazon', 'ScrapeBadger Amazon Scraper', 'أداة ScrapeBadger للبحث في أمازون', false, NULL, '{"priority": 4}'),
    ('apilayer_google_search', 'APILayer Google Search API', 'واجهة APILayer للبحث في جوجل', false, NULL, '{"priority": 5}'),
    ('serpapi_search', 'SerpApi Google Shopping', 'أداة SerpApi للبحث في جوجل للتسوق', false, NULL, '{"priority": 6}'),
    ('valueserp_search', 'ValueSerp Google Search', 'أداة ValueSerp للبحث السريع في جوجل', false, NULL, '{"priority": 7}'),
    ('scrapingbee_api', 'ScrapingBee Web Scraper', 'أداة ScrapingBee لكشط صفحات الويب', false, NULL, '{"priority": 8}')
ON CONFLICT (name) DO UPDATE
SET 
    display_name_en = EXCLUDED.display_name_en,
    display_name_ar = EXCLUDED.display_name_ar,
    config_settings = EXCLUDED.config_settings;
