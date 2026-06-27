-- ============================================================
-- VENDOR MANAGEMENT MODULE — Batch 8A
-- ============================================================

-- ── 1. VENDORS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name           text        NOT NULL,
  commercial_reg_number  text,
  tax_card_number        text,
  whatsapp_number        text,
  governorate            text,
  area                   text,
  trust_score            integer     NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  total_successful_deals integer     NOT NULL DEFAULT 0,
  reported_issues        integer     NOT NULL DEFAULT 0,
  account_tier           text        NOT NULL DEFAULT 'Bronze'
                         CHECK (account_tier IN ('Bronze', 'Silver', 'Gold')),
  system_status          text        NOT NULL DEFAULT 'Pending Verification'
                         CHECK (system_status IN ('Active', 'Suspended', 'Pending Verification')),
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── 2. VENDOR CATEGORIES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_categories (
  vendor_id  uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category   text NOT NULL
             CHECK (category IN ('home_appliances', 'screens', 'smart_electronics')),
  PRIMARY KEY (vendor_id, category)
);

-- ── 3. VENDOR AUTOMATION LOGS (future WhatsApp/CRM) ──────────
CREATE TABLE IF NOT EXISTS public.vendor_automation_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid        REFERENCES public.vendors(id) ON DELETE CASCADE,
  direction    text        CHECK (direction IN ('inbound', 'outbound')),
  message_type text,
  payload      jsonb       DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  error_msg    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 4. VENDOR SYSTEM MESSAGES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_system_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  sent_by    uuid        REFERENCES public.staff_members(id),
  message    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 5. VENDOR AUDIT LOG ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES public.staff_members(id),
  event_name  text        NOT NULL,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 6. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_status      ON public.vendors(system_status);
CREATE INDEX IF NOT EXISTS idx_vendors_tier        ON public.vendors(account_tier);
CREATE INDEX IF NOT EXISTS idx_vendors_trust       ON public.vendors(trust_score);
CREATE INDEX IF NOT EXISTS idx_vendors_governorate ON public.vendors(governorate);
CREATE INDEX IF NOT EXISTS idx_vendor_auto_logs    ON public.vendor_automation_logs(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_sys_msgs     ON public.vendor_system_messages(vendor_id, created_at DESC);

-- ── 7. AUTO-UPDATED TIMESTAMP TRIGGER ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_vendors_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.fn_vendors_set_updated_at();

-- ── 8. AUTO TIER CALCULATION TRIGGER ─────────────────────────
-- Gold ≥ 90 | Silver 70-89 | Bronze < 70
CREATE OR REPLACE FUNCTION public.fn_vendors_calc_tier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.account_tier :=
    CASE
      WHEN NEW.trust_score >= 90 THEN 'Gold'
      WHEN NEW.trust_score >= 70 THEN 'Silver'
      ELSE 'Bronze'
    END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendors_calc_tier
  BEFORE INSERT OR UPDATE OF trust_score ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.fn_vendors_calc_tier();

-- ── 9. RPC: ADJUST TRUST SCORE ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_vendor_adjust_trust(
  p_vendor_id   uuid,
  p_delta       integer,
  p_actor_id    uuid DEFAULT NULL,
  p_reason      text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_score  integer;
  v_new_score  integer;
BEGIN
  SELECT trust_score INTO v_old_score FROM public.vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found'; END IF;

  v_new_score := GREATEST(0, LEAST(100, v_old_score + p_delta));

  UPDATE public.vendors SET trust_score = v_new_score WHERE id = p_vendor_id;

  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, old_value, new_value)
  VALUES (
    p_vendor_id, p_actor_id, 'TRUST_SCORE_ADJUSTED',
    jsonb_build_object('trust_score', v_old_score),
    jsonb_build_object('trust_score', v_new_score, 'delta', p_delta, 'reason', p_reason)
  );

  RETURN jsonb_build_object('old_score', v_old_score, 'new_score', v_new_score);
END;
$$;

-- ── 10. RPC: SUSPEND VENDOR ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_vendor_suspend(
  p_vendor_id uuid,
  p_actor_id  uuid DEFAULT NULL,
  p_reason    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.vendors SET system_status = 'Suspended' WHERE id = p_vendor_id;
  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, new_value)
  VALUES (p_vendor_id, p_actor_id, 'VENDOR_SUSPENDED',
          jsonb_build_object('reason', p_reason));
END;
$$;

-- ── 11. RPC: ACTIVATE VENDOR ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_vendor_activate(
  p_vendor_id uuid,
  p_actor_id  uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.vendors SET system_status = 'Active' WHERE id = p_vendor_id;
  INSERT INTO public.vendor_audit_log(vendor_id, actor_id, event_name, new_value)
  VALUES (p_vendor_id, p_actor_id, 'VENDOR_ACTIVATED', '{}');
END;
$$;

-- ── 12. ADD vendor_relations TO ALLOWED STAFF ROLES ──────────
ALTER TABLE public.staff_member_roles DROP CONSTRAINT IF EXISTS ck_role_code_allowed;
ALTER TABLE public.staff_member_roles ADD CONSTRAINT ck_role_code_allowed CHECK (role_code IN (
  'admin', 'owner', 'reviewer', 'researcher', 'field_agent', 'reporter', 'support',
  'content_manager', 'deals_manager', 'news_manager', 'pricing_manager',
  'quality_reviewer', 'payment_reviewer', 'vendor_relations'
));

-- ── 13. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.vendors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_audit_log       ENABLE ROW LEVEL SECURITY;

-- Service role bypass (admin operations)
CREATE POLICY "service_role_vendors"           ON public.vendors                FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_vendor_cats"       ON public.vendor_categories      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_vendor_auto_logs"  ON public.vendor_automation_logs FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_vendor_sys_msgs"   ON public.vendor_system_messages FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_vendor_audit"      ON public.vendor_audit_log       FOR ALL TO service_role USING (true);
