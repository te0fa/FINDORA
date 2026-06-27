-- Create merchant_quotes table
CREATE TABLE IF NOT EXISTS public.merchant_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    captured_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    merchant_name TEXT NOT NULL,
    contact_person TEXT,
    phone_number TEXT,
    address TEXT,
    governorate TEXT,
    area TEXT,
    product_title TEXT NOT NULL,
    price_amount DECIMAL(12, 2),
    currency_code TEXT DEFAULT 'EGP',
    availability_status TEXT DEFAULT 'available',
    installment_details TEXT,
    notes TEXT,
    product_image_path TEXT,
    business_card_image_path TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.merchant_quotes ENABLE ROW LEVEL SECURITY;

-- Simple policy for staff (admins and staff can see/edit)
-- This is a placeholder; real projects use more granular role-based policies
CREATE POLICY "Allow staff to manage merchant_quotes" 
ON public.merchant_quotes
FOR ALL
USING (EXISTS (SELECT 1 FROM public.staff_members WHERE auth_user_id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_quotes_request_id ON public.merchant_quotes(request_id);
