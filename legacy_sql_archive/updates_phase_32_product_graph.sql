-- ============================================================
-- PHASE 32: FINDORA Universal Product Graph
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    brand text NOT NULL,
    category text NOT NULL,
    current_price numeric(12,2) NOT NULL DEFAULT 0.00,
    source text NOT NULL,
    specifications jsonb DEFAULT '{}'::jsonb, -- Store specs: ram, storage, cpu, gpu, battery, camera, display
    last_updated timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 2. Create Price History Table
CREATE TABLE IF NOT EXISTS public.price_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price numeric(12,2) NOT NULL,
    captured_at timestamptz DEFAULT now()
);

-- Index for historical trend retrieval
CREATE INDEX IF NOT EXISTS idx_price_history_product_captured ON public.price_history(product_id, captured_at DESC);

-- 3. Create Price Events Table
CREATE TABLE IF NOT EXISTS public.price_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    old_price numeric(12,2) NOT NULL,
    new_price numeric(12,2) NOT NULL,
    difference numeric(12,2) NOT NULL,
    percentage_change numeric(6,2) NOT NULL,
    direction text NOT NULL CHECK (direction IN ('up', 'down', 'no_change')),
    created_at timestamptz DEFAULT now()
);

-- 4. Create User Watchlists Table
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 5. Create Price Alerts Table
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    alert_type text NOT NULL CHECK (alert_type IN ('any_drop', 'pct_5', 'pct_10', 'target_price')),
    target_price numeric(12,2),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 6. Create Alert Events Table
CREATE TABLE IF NOT EXISTS public.alert_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id uuid NOT NULL REFERENCES public.price_alerts(id) ON DELETE CASCADE,
    old_price numeric(12,2) NOT NULL,
    new_price numeric(12,2) NOT NULL,
    triggered_condition text NOT NULL,
    delivered boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- Staff permissions policy (active staff can manage all)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Staff manage products') THEN
        CREATE POLICY "Staff manage products" ON public.products FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_history' AND policyname = 'Staff manage price history') THEN
        CREATE POLICY "Staff manage price history" ON public.price_history FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_events' AND policyname = 'Staff manage price events') THEN
        CREATE POLICY "Staff manage price events" ON public.price_events FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_watchlists' AND policyname = 'Staff manage watchlists') THEN
        CREATE POLICY "Staff manage watchlists" ON public.user_watchlists FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_alerts' AND policyname = 'Staff manage price alerts') THEN
        CREATE POLICY "Staff manage price alerts" ON public.price_alerts FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alert_events' AND policyname = 'Staff manage alert events') THEN
        CREATE POLICY "Staff manage alert events" ON public.alert_events FOR ALL USING (public.fn_is_active_staff_4a());
    END IF;
END $$;

-- 7. Create Trigger Function to Track Price Changes automatically
CREATE OR REPLACE FUNCTION public.fn_on_product_price_change()
RETURNS trigger AS $$
DECLARE
    v_diff numeric;
    v_pct numeric;
    v_dir text;
BEGIN
    -- Only trigger if price has changed or if inserting
    IF (TG_OP = 'INSERT') OR (OLD.current_price IS DISTINCT FROM NEW.current_price) THEN
        -- Record in history
        INSERT INTO public.price_history (product_id, price, captured_at)
        VALUES (NEW.id, NEW.current_price, now());
        
        -- Record event if it's an update
        IF TG_OP = 'UPDATE' THEN
            v_diff := NEW.current_price - OLD.current_price;
            IF OLD.current_price > 0 THEN
                v_pct := round((v_diff / OLD.current_price) * 100, 2);
            ELSE
                v_pct := 100.00;
            END IF;
            
            IF v_diff > 0 THEN
                v_dir := 'up';
            ELSIF v_diff < 0 THEN
                v_dir := 'down';
            ELSE
                v_dir := 'no_change';
            END IF;

            INSERT INTO public.price_events (product_id, old_price, new_price, difference, percentage_change, direction, created_at)
            VALUES (NEW.id, OLD.current_price, NEW.current_price, v_diff, v_pct, v_dir, now());
        END IF;
    END IF;
    
    NEW.last_updated := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to Products
CREATE OR REPLACE TRIGGER trg_product_price_change
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.fn_on_product_price_change();
