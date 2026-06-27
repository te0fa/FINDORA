-- PHASE 9: Progressive Team Leader System

-- 1. Add new tracking column to contributors
ALTER TABLE public.contributors
ADD COLUMN IF NOT EXISTS referral_bonus_earned_egp NUMERIC(12,2) DEFAULT 0.00;

-- 2. Expand contributor_levels table with new requirements
ALTER TABLE public.contributor_levels
ADD COLUMN IF NOT EXISTS required_trust_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS required_lifetime_points INTEGER DEFAULT 0;

-- 3. Update Existing Levels with Realistic Thresholds
-- Level 1 (Novice)
UPDATE public.contributor_levels 
SET required_trust_score = 50, required_lifetime_points = 0 
WHERE level_number = 1;

-- Level 2 (Builder)
UPDATE public.contributor_levels 
SET required_trust_score = 60, required_lifetime_points = 500 
WHERE level_number = 2;

-- Level 3 (Networker / Manager)
UPDATE public.contributor_levels 
SET required_trust_score = 70, required_lifetime_points = 2000 
WHERE level_number = 3;

-- Level 4 (Leader)
UPDATE public.contributor_levels 
SET required_trust_score = 80, required_lifetime_points = 5000 
WHERE level_number = 4;

-- Level 5 (Legend / Director)
UPDATE public.contributor_levels 
SET required_trust_score = 90, required_lifetime_points = 10000 
WHERE level_number = 5;

-- 4. Update the Trigger to track referral_bonus_earned_egp
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
      v_cash := 0; -- Handled via L2 percentage split
    END IF;

    -- Only insert if there's a defined stage
    IF v_reward_stage IS NOT NULL THEN
      INSERT INTO public.referral_rewards (contributor_id, source_user_id, reward_stage, points_awarded, cash_awarded_egp)
      VALUES (NEW.referrer_id, NEW.referred_id, v_reward_stage, v_points, v_cash);
      
      -- Add directly to wallet if rewards exist
      IF v_points > 0 OR v_cash > 0 THEN
        INSERT INTO public.wallet_transactions (contributor_id, wallet_id, tx_type, amount_egp, amount_points, reference_type, description_en, description_ar)
        SELECT NEW.referrer_id, id, 'referral_reward', v_cash, v_points, 'referral', 'Team building reward for ' || v_reward_stage, 'مكافأة بناء فريق للمرحلة: ' || v_reward_stage
        FROM public.contributor_wallets WHERE contributor_id = NEW.referrer_id;

        -- UPDATE the new tracking column
        IF v_cash > 0 THEN
          UPDATE public.contributors
          SET referral_bonus_earned_egp = referral_bonus_earned_egp + v_cash
          WHERE id = NEW.referrer_id;
        END IF;
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
