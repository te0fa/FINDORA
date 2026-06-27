-- ============================================================
-- PHASE 36: FINDORA Customer Payment flow & Receipt Auto-Reveal
-- ============================================================

ALTER TABLE public.payment_intents
ADD COLUMN IF NOT EXISTS receipt_image_path text;

-- Initialize payment-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment-receipts
DO $$
BEGIN
    -- Allow public read of receipts (or authenticated read)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access to Receipts') THEN
        CREATE POLICY "Public Access to Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts');
    END IF;

    -- Allow authenticated upload of receipts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload Receipts') THEN
        CREATE POLICY "Authenticated Upload Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-receipts');
    END IF;
END $$;
