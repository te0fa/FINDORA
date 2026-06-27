-- PHASE 13: FINDORA Self-Reinforcing Growth Engine

-- 1. Customer Requests (Demand Loop)
CREATE TABLE IF NOT EXISTS public.customer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID, -- Optional for guest requests or linked if we have a customer table
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_location TEXT NOT NULL, -- e.g., "Giza", "Maadi"
    max_price NUMERIC(10,2),
    additional_notes TEXT,
    
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'fulfilled', 'cancelled')),
    
    -- AI Expansion tracking
    is_expanded_by_ai BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for trend detector to quickly scan recent requests
CREATE INDEX IF NOT EXISTS idx_customer_requests_trend 
ON public.customer_requests(created_at, target_location, category);

-- 2. Market Insights (Supply Loop)
CREATE TABLE IF NOT EXISTS public.market_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
    
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    discovered_price NUMERIC(10,2) NOT NULL,
    store_name TEXT NOT NULL,
    location_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved_as_offer', 'rejected')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add column to platform_tasks to link them back to a customer request
ALTER TABLE public.platform_tasks 
ADD COLUMN IF NOT EXISTS parent_request_id UUID REFERENCES public.customer_requests(id) ON DELETE CASCADE;

-- 4. Add tracking column for recycled tasks
ALTER TABLE public.platform_tasks
ADD COLUMN IF NOT EXISTS is_recycled BOOLEAN DEFAULT false;
