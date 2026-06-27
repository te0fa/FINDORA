-- ============================================================
-- FINDORA Platform — Phase 29: OTP & Merchant Tables
-- File: updates_phase_29_otp.sql
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1: OTP Verification Table
-- Stores hashed one-time codes for phone verification.
-- Code itself is never stored; only its SHA256 hash.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text        NOT NULL,
  code_hash    text        NOT NULL,   -- SHA256 hash of the 6-digit code
  purpose      text        NOT NULL
                           CHECK (purpose IN (
                             'contributor_registration',
                             'merchant_registration',
                             'withdrawal_verification'
                           )),
  attempts     integer     NOT NULL DEFAULT 0,
  expires_at   timestamptz NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  is_used      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Composite index: fast lookup for active (unused) OTP per phone + purpose
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose
  ON public.phone_otp_codes(phone_number, purpose, is_used);


-- ────────────────────────────────────────────────────────────
-- SECTION 2: Merchant Profiles
-- Core identity & KPI table for merchant accounts.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid           UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name_en    text           NOT NULL,
  business_name_ar    text           NOT NULL,
  business_category   text           NOT NULL,
  phone_number        text           UNIQUE NOT NULL,
  phone_verified      boolean        NOT NULL DEFAULT false,
  governorate         text,
  address_details     text,
  national_id         text,
  status              text           NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  trust_score         integer        NOT NULL DEFAULT 50
                                     CHECK (trust_score BETWEEN 0 AND 100),
  total_deals         integer        NOT NULL DEFAULT 0,
  total_earnings_egp  numeric(14,2)  NOT NULL DEFAULT 0,
  rating_average      numeric(3,2),
  rating_count        integer        NOT NULL DEFAULT 0,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- SECTION 3: Merchant Offers
-- Offers submitted by merchants against customer requests.
-- One merchant can submit at most one offer per request (UNIQUE).
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.merchant_offers (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid          NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  request_id          uuid          NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  price_offered_egp   numeric(12,2) NOT NULL CHECK (price_offered_egp > 0),
  notes               text,
  estimated_days      integer,
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  accepted_at         timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, request_id)
);

-- Index: fetch all offers for a given request filtered by status
CREATE INDEX IF NOT EXISTS idx_merchant_offers_request
  ON public.merchant_offers(request_id, status);

-- Index: fetch all offers submitted by a given merchant filtered by status
CREATE INDEX IF NOT EXISTS idx_merchant_offers_merchant
  ON public.merchant_offers(merchant_id, status);


-- ────────────────────────────────────────────────────────────
-- SECTION 4: Customer Disputes
-- Disputes raised by customers on fulfilled/unfulfilled requests.
-- Linked to staff_members for internal review assignment.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customer_disputes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid        NOT NULL REFERENCES public.customer_requests(id),
  customer_phone      text        NOT NULL,
  dispute_type        text        NOT NULL
                                  CHECK (dispute_type IN (
                                    'wrong_item',
                                    'not_delivered',
                                    'quality_issue',
                                    'overcharged',
                                    'fraud',
                                    'other'
                                  )),
  description         text        NOT NULL,
  status              text        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  resolution_notes    text,
  staff_reviewer_id   uuid        REFERENCES public.staff_members(id),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- SECTION 5: KYC Storage Bucket (Informational — Manual Step)
-- ────────────────────────────────────────────────────────────
--
-- The KYC documents bucket must be created manually in Supabase:
--
--   Supabase Dashboard → Storage → New Bucket
--   Bucket name : kyc-documents
--   Public      : NO  (keep private)
--
-- After creation, add an RLS policy that allows only authenticated
-- staff/admin roles to read objects from this bucket.
--
-- ────────────────────────────────────────────────────────────


-- ============================================================
-- END OF FILE: updates_phase_29_otp.sql
-- ============================================================
