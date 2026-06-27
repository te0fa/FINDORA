-- Up Migration for Financial ERP System
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'EGP' NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default categories
INSERT INTO public.financial_categories (type, name_en, name_ar) VALUES
('EXPENSE', 'Marketing & Ads', 'التسويق والإعلانات'),
('EXPENSE', 'Salaries & Wages', 'الرواتب والأجور'),
('EXPENSE', 'Servers & Infrastructure', 'السيرفرات والبنية التحتية'),
('EXPENSE', 'Rent & Office', 'الإيجار والمكتب'),
('EXPENSE', 'Commissions & Fees', 'العمولات والرسوم'),
('EXPENSE', 'Transportation', 'الانتقالات والمواصلات'),
('EXPENSE', 'Other Expenses', 'مصروفات أخرى'),
('INCOME', 'Product Sales', 'مبيعات المنتجات'),
('INCOME', 'Service Sales', 'مبيعات الخدمات'),
('INCOME', 'Other Income', 'إيرادات أخرى')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated staff to read categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'financial_categories' 
          AND policyname = 'Categories are viewable by staff'
    ) THEN
        CREATE POLICY "Categories are viewable by staff" 
        ON public.financial_categories FOR SELECT 
        TO authenticated USING (true);
    END IF;
END $$;

-- Allow admins and accountants to manage categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'financial_categories' 
          AND policyname = 'Categories can be managed by admins and accountants'
    ) THEN
        CREATE POLICY "Categories can be managed by admins and accountants" 
        ON public.financial_categories FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.staff_member_roles r
            JOIN public.staff_members s ON s.id = r.staff_member_id
            WHERE s.auth_user_id = auth.uid() 
            AND r.role_code IN ('admin', 'accountant', 'owner', 'finance_manager')
            AND r.is_active = true
          )
        );
    END IF;
END $$;

-- Financial transactions read/write policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'financial_transactions' 
          AND policyname = 'Transactions can be managed by admins and accountants'
    ) THEN
        CREATE POLICY "Transactions can be managed by admins and accountants" 
        ON public.financial_transactions FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.staff_member_roles r
            JOIN public.staff_members s ON s.id = r.staff_member_id
            WHERE s.auth_user_id = auth.uid() 
            AND r.role_code IN ('admin', 'accountant', 'owner', 'finance_manager')
            AND r.is_active = true
          )
        );
    END IF;
END $$;

