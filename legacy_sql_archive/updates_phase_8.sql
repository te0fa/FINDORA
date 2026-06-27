-- PHASE 8: Network Survival Mode (Gamification Expansion)

-- 1. Add decay multiplier and health score to contributors
ALTER TABLE public.contributors
ADD COLUMN IF NOT EXISTS decay_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS network_health_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS active_network_count INTEGER DEFAULT 0;

-- 2. Create Notifications Table for Smart Alerts
CREATE TABLE IF NOT EXISTS public.contributor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID REFERENCES public.contributors(id) ON DELETE CASCADE,
    message_ar TEXT NOT NULL,
    message_en TEXT NOT NULL,
    type TEXT CHECK (type IN ('warning', 'success', 'info', 'critical')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Set up Row Level Security for notifications
ALTER TABLE public.contributor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors can view their own notifications"
    ON public.contributor_notifications FOR SELECT
    USING (contributor_id IN (
        SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Contributors can update their own notifications (read status)"
    ON public.contributor_notifications FOR UPDATE
    USING (contributor_id IN (
        SELECT id FROM public.contributors WHERE auth_user_id = auth.uid()
    ));

-- 4. Insert Default Configuration into economy_config
INSERT INTO public.economy_config (config_key, value, description_en, description_ar, is_system_controlled)
VALUES (
    'network_survival_config',
    '{
        "activity_window_days": 7,
        "decay_tiers": [
            {"min_active": 10, "multiplier": 1.0},
            {"min_active": 7, "multiplier": 0.8},
            {"min_active": 5, "multiplier": 0.6},
            {"min_active": 3, "multiplier": 0.4},
            {"min_active": 0, "multiplier": 0.2}
        ],
        "notifications": {
            "in_app_enabled": true,
            "email_enabled": false,
            "whatsapp_enabled": false
        }
    }'::jsonb,
    'Configuration for Network Survival Mode: activity window, decay multipliers, and notification channels.',
    'إعدادات وضع النجاة للشبكة: نافذة النشاط، نسب نقص الأرباح، وقنوات الإشعارات.',
    false
)
ON CONFLICT (config_key) DO UPDATE 
SET value = EXCLUDED.value;
