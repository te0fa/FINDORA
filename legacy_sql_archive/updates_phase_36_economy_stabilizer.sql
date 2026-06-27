-- ============================================================
-- PHASE 36: FINDORA Economy Stabilizer Master Flag
-- Run this in Supabase SQL Editor
-- ============================================================

INSERT INTO economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES
('flag_economy_stabilizer_active', 'false', 'Economy Stabilizer Guard: Master toggle to enable or disable all 5 economy stabilizer cron processes', 'مفتاح موازن الاقتصاد: الحارس الرئيسي لتشغيل أو تعطيل عمليات موازن الاقتصاد الـ 5 بالكامل', false)
ON CONFLICT (config_key) DO NOTHING;
