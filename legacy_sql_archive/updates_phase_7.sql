-- ============================================================
-- FINDORA ECONOMY OS — Phase 7: Viral Growth Engine v2 & Live CMS
-- ============================================================

-- ── 1. LIVE VISUAL CMS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_content (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path             text        NOT NULL,
  block_id               text        NOT NULL,
  content_data           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  last_edited_by         uuid        REFERENCES public.staff_members(id),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_content_route_block UNIQUE (route_path, block_id)
);

-- ── 2. VIRAL GROWTH ENGINE TABLES ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  source_user_id         uuid        NOT NULL REFERENCES public.contributors(id) ON DELETE CASCADE,
  reward_stage           text        NOT NULL CHECK (reward_stage IN ('signed_up', 'approved', 'first_task_completed', 'earning_started')),
  points_awarded         integer     NOT NULL DEFAULT 0,
  cash_awarded_egp       numeric(12,2) NOT NULL DEFAULT 0.00,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Note: contributor_referrals already exists but we ensure the status matches our logic.
-- The existing check constraint for status is ('signed_up', 'approved', 'active', 'inactive', 'frozen').
-- The user requested ('signed_up', 'approved', 'active', 'earning').
-- We will alter the constraint to include 'earning'.

ALTER TABLE public.contributor_referrals DROP CONSTRAINT IF EXISTS contributor_referrals_status_check;
ALTER TABLE public.contributor_referrals ADD CONSTRAINT contributor_referrals_status_check 
  CHECK (status IN ('signed_up', 'approved', 'active', 'inactive', 'frozen', 'earning'));

-- Update referral challenges to include cash rewards & multiplier
ALTER TABLE public.referral_challenges 
  ADD COLUMN IF NOT EXISTS reward_cash_egp numeric(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS reward_multiplier numeric(5,2) DEFAULT 1.00;

-- ── 3. AUTOMATIC REWARD TRIGGER (State Machine) ───────────────
-- When a referral moves from signed_up -> approved -> active -> earning
CREATE OR REPLACE FUNCTION public.fn_process_referral_reward()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_reward_stage text;
  v_points int := 0;
  v_cash numeric := 0;
BEGIN
  -- We only care if status changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    IF NEW.status = 'approved' THEN
      v_reward_stage := 'approved';
      v_points := 50;
      v_cash := 0;
    ELSIF NEW.status = 'active' THEN
      -- 'active' implies they started doing tasks
      v_reward_stage := 'first_task_completed';
      v_points := 0;
      v_cash := 25.00;
    ELSIF NEW.status = 'earning' THEN
      v_reward_stage := 'earning_started';
      v_points := 0;
      v_cash := 0; -- Handled via L2 percentage split on actual earnings
    END IF;

    -- Only insert if there's a defined stage
    IF v_reward_stage IS NOT NULL THEN
      INSERT INTO public.referral_rewards (contributor_id, source_user_id, reward_stage, points_awarded, cash_awarded_egp)
      VALUES (NEW.referrer_id, NEW.referred_id, v_reward_stage, v_points, v_cash);
      
      -- Add directly to wallet if rewards exist
      IF v_points > 0 OR v_cash > 0 THEN
        INSERT INTO public.wallet_transactions (contributor_id, wallet_id, tx_type, amount_egp, amount_points, reference_type, description_en, description_ar)
        SELECT NEW.referrer_id, id, 'referral_reward', v_cash, v_points, 'referral', 'Referral reward for ' || v_reward_stage, 'مكافأة إحالة للمرحلة: ' || v_reward_stage
        FROM public.contributor_wallets WHERE contributor_id = NEW.referrer_id;
      END IF;
    END IF;

    -- Update referral challenge active count if they reached approved/active
    IF NEW.status IN ('approved', 'active', 'earning') AND OLD.status = 'signed_up' THEN
      UPDATE public.referral_challenges
      SET current_active_count = current_active_count + 1
      WHERE contributor_id = NEW.referrer_id AND is_active = true;
    END IF;

  END IF;
  RETURN NEW;
END; $$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_process_referral_reward ON public.contributor_referrals;
CREATE TRIGGER trg_process_referral_reward
  AFTER UPDATE OF status ON public.contributor_referrals
  FOR EACH ROW EXECUTE FUNCTION public.fn_process_referral_reward();

-- ── 4. L2 REVENUE SHARE (Passive Income) ──────────────────────
-- When a user earns task rewards, check if they have a referrer (L1) or grand-referrer (L2)
CREATE OR REPLACE FUNCTION public.fn_distribute_network_revenue()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_referrer_id uuid;
  v_grand_referrer_id uuid;
  v_l1_cut numeric;
  v_l2_cut numeric;
  v_l2_pct numeric := 0.05; -- 5% passive income for legend level
  v_referrer_level int;
BEGIN
  -- Only trigger on task_reward
  IF NEW.tx_type = 'task_reward' AND NEW.amount_egp > 0 THEN
    
    -- Find who referred this user
    SELECT referred_by_id INTO v_referrer_id 
    FROM public.contributors WHERE id = NEW.contributor_id;

    IF v_referrer_id IS NOT NULL THEN
      -- Does the referrer have the Legend badge (level 5)?
      SELECT level_number INTO v_referrer_level
      FROM public.contributor_levels cl
      JOIN public.contributors c ON c.active_referral_count >= cl.required_active_referrals
      WHERE c.id = v_referrer_id
      ORDER BY cl.level_number DESC LIMIT 1;

      -- If referrer is Legend (Level 5), they get L2 revenue share from their direct referrals' work
      IF v_referrer_level >= 5 THEN
        v_l1_cut := NEW.amount_egp * v_l2_pct;
        
        IF v_l1_cut > 0 THEN
          INSERT INTO public.wallet_transactions (contributor_id, wallet_id, tx_type, amount_egp, amount_points, reference_type, description_en, description_ar)
          SELECT v_referrer_id, id, 'network_revenue_share', v_l1_cut, 0, 'referral', 'L2 Passive Income from Network', 'أرباح سلبية من شبكة الإحالات'
          FROM public.contributor_wallets WHERE contributor_id = v_referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_distribute_network_revenue ON public.wallet_transactions;
CREATE TRIGGER trg_distribute_network_revenue
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_distribute_network_revenue();
