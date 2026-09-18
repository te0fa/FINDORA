-- ============================================================
-- FINDORA — P1-07 Batch 1C: Comprehensive Customer Backfill & Relational Integrity
-- 1. Verifies preconditions (164 total, 13 NULLs, 75 broken dangling references).
-- 2. Creates exactly ONE synthetic customer: CUST-E2E-LEGACY.
-- 3. Backfills 13 NULL rows:
--      - 4 rows -> CUST-4644 (07e96b60-5211-4721-afac-dcc5d3f487be)
--      - 9 rows -> CUST-E2E-LEGACY
-- 4. Backfills 75 broken rows:
--      - 37 rows -> CUST-4644 (07e96b60-5211-4721-afac-dcc5d3f487be)
--      - 3 rows  -> CUST-2622 (898da41b-5a61-4201-9241-d404b563d160)
--      - 1 row   -> CUST-8182 (8e72b3d8-7c67-46c2-ab11-0d77c59714b4)
--      - 34 rows -> CUST-E2E-LEGACY
-- 5. Asserts global integrity (0 NULLs, 0 broken, 164 preserved, 76 untouched).
-- 6. Adds Foreign Key: customer_requests_customer_id_fkey -> customers(id) ON DELETE RESTRICT.
-- 7. Sets customer_requests.customer_id NOT NULL.
-- 8. Adds Index: idx_customer_requests_customer_id.
-- 9. Preserves legacy customer_phone and idx_customer_requests_phone.
-- ============================================================

DO $$
DECLARE
    v_total_cr integer;
    v_null_cr integer;
    v_broken_cr integer;
    v_total_cust integer;
    v_synth_cust_id uuid;
    v_cust4644_id uuid := '07e96b60-5211-4721-afac-dcc5d3f487be';
    v_cust2622_id uuid := '898da41b-5a61-4201-9241-d404b563d160';
    v_cust8182_id uuid := '8e72b3d8-7c67-46c2-ab11-0d77c59714b4';
    v_rows_updated integer;
    v_post_null integer;
    v_post_broken integer;
    v_post_total integer;
    v_count_4644 integer;
    v_count_2622 integer;
    v_count_8182 integer;
    v_count_synth integer;
    v_other_count integer;
BEGIN
    -- ------------------------------------------------------------
    -- STEP 1: PRECONDITION ASSERTIONS
    -- ------------------------------------------------------------
    SELECT count(*) INTO v_total_cr FROM public.customer_requests;
    IF v_total_cr <> 164 THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: customer_requests count is %, expected 164', v_total_cr;
    END IF;

    SELECT count(*) INTO v_null_cr FROM public.customer_requests WHERE customer_id IS NULL;
    IF v_null_cr <> 13 THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: NULL customer_id count is %, expected 13', v_null_cr;
    END IF;

    SELECT count(*) INTO v_broken_cr
    FROM public.customer_requests cr
    LEFT JOIN public.customers c ON c.id = cr.customer_id
    WHERE cr.customer_id IS NOT NULL AND c.id IS NULL;
    IF v_broken_cr <> 75 THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: broken customer_id count is %, expected 75', v_broken_cr;
    END IF;

    -- Verify target customers exist
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_cust4644_id AND customer_code = 'CUST-4644') THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: target customer CUST-4644 (%) not found', v_cust4644_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_cust2622_id AND customer_code = 'CUST-2622') THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: target customer CUST-2622 (%) not found', v_cust2622_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_cust8182_id AND customer_code = 'CUST-8182') THEN
        RAISE EXCEPTION 'P1-07 Precondition Failure: target customer CUST-8182 (%) not found', v_cust8182_id;
    END IF;

    -- ------------------------------------------------------------
    -- STEP 2: CREATE SYNTHETIC CUSTOMER (IDEMPOTENT)
    -- ------------------------------------------------------------
    SELECT id INTO v_synth_cust_id
    FROM public.customers
    WHERE customer_code = 'CUST-E2E-LEGACY';

    IF v_synth_cust_id IS NULL THEN
        INSERT INTO public.customers (
            customer_code,
            full_name,
            phone_number_raw,
            phone_number_normalized,
            status,
            preferred_language,
            phone_verified,
            has_used_free_first_request,
            is_archived
        ) VALUES (
            'CUST-E2E-LEGACY',
            '[E2E_TEST] Browser Customer',
            NULL,
            NULL,
            'active',
            'ar',
            false,
            false,
            false
        ) RETURNING id INTO v_synth_cust_id;
    END IF;

    IF v_synth_cust_id IS NULL THEN
        RAISE EXCEPTION 'P1-07 Failure: failed to obtain synthetic customer id';
    END IF;

    -- ------------------------------------------------------------
    -- STEP 3: BACKFILL THE 13 NULL ROWS
    -- ------------------------------------------------------------
    -- 3a. 4 NULL rows -> CUST-4644
    UPDATE public.customer_requests
    SET customer_id = v_cust4644_id
    WHERE id IN (
        '02edb93a-7dbe-41f2-97b8-8dafbc718e9b',
        '5a654ff7-93c0-45ea-bb80-a50c759f519a',
        '69d5e963-c08e-4067-af20-6fd6d71d3ad8',
        '89361e98-f129-4694-ae8b-57dd4688eb27'
    ) AND customer_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 4 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 4 NULL rows updated to CUST-4644, got %', v_rows_updated;
    END IF;

    -- 3b. 9 NULL rows -> CUST-E2E-LEGACY
    UPDATE public.customer_requests
    SET customer_id = v_synth_cust_id
    WHERE id IN (
        '4f023102-42cc-40d8-a18d-93ee51dd0d2a',
        'a2110b43-3787-4fd6-bfe7-85b8a0972be5',
        'eafb5a29-7e48-459e-9e8c-dc3dd3f12e4f',
        '0430277c-0b45-457e-b578-becb43bf4119',
        '04513340-615a-49dc-a62b-9322af1a9d0f',
        '8927466a-a501-4dec-9682-3b7abe209324',
        'ca96ee14-149f-4183-bbb8-3424ccace73e',
        'de22686d-c5ee-4fbf-95b0-77d011faa031',
        '75f13ab3-1e6c-41ba-bd38-9069675c57d0'
    ) AND customer_id IS NULL;
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 9 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 9 NULL rows updated to CUST-E2E-LEGACY, got %', v_rows_updated;
    END IF;

    -- ------------------------------------------------------------
    -- STEP 4: BACKFILL THE 75 BROKEN NON-NULL ROWS
    -- ------------------------------------------------------------
    -- 4a. 37 broken rows -> CUST-4644 (from 3 historical UUIDs)
    UPDATE public.customer_requests
    SET customer_id = v_cust4644_id
    WHERE customer_id IN (
        '163c00e1-5cd1-4e56-a142-961797630049',
        'ec0cebdc-b651-4669-80a0-63c4498a874f',
        'b347c389-6355-4e26-a566-1a50d81b8f41'
    );
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 37 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 37 broken rows updated to CUST-4644, got %', v_rows_updated;
    END IF;

    -- 4b. 3 broken rows -> CUST-2622 (from historical UUID 072488db...)
    UPDATE public.customer_requests
    SET customer_id = v_cust2622_id
    WHERE customer_id = '072488db-b6ca-46f1-8f58-8eeb4269cf75';
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 3 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 3 broken rows updated to CUST-2622, got %', v_rows_updated;
    END IF;

    -- 4c. 1 broken row -> CUST-8182 (from historical UUID a5300d00...)
    UPDATE public.customer_requests
    SET customer_id = v_cust8182_id
    WHERE customer_id = 'a5300d00-4c3a-4b19-94d3-8e1ac87a080e';
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 1 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 1 broken row updated to CUST-8182, got %', v_rows_updated;
    END IF;

    -- 4d. 34 broken rows -> CUST-E2E-LEGACY (remaining 34 ephemeral E2E browser UUIDs)
    UPDATE public.customer_requests
    SET customer_id = v_synth_cust_id
    WHERE customer_id NOT IN (
        v_cust4644_id,
        v_cust2622_id,
        v_cust8182_id,
        v_synth_cust_id
    ) AND customer_id NOT IN (SELECT id FROM public.customers);
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated <> 34 THEN
        RAISE EXCEPTION 'P1-07 Backfill Failure: expected 34 broken rows updated to CUST-E2E-LEGACY, got %', v_rows_updated;
    END IF;

    -- ------------------------------------------------------------
    -- STEP 5: GLOBAL DATA INTEGRITY & DISTRIBUTION ASSERTIONS
    -- ------------------------------------------------------------
    -- 5a. Zero NULL customer_id
    SELECT count(*) INTO v_post_null
    FROM public.customer_requests
    WHERE customer_id IS NULL;
    IF v_post_null <> 0 THEN
        RAISE EXCEPTION 'P1-07 Integrity Failure: post-backfill NULL count is %, expected 0', v_post_null;
    END IF;

    -- 5b. Zero broken customer references
    SELECT count(*) INTO v_post_broken
    FROM public.customer_requests cr
    LEFT JOIN public.customers c ON c.id = cr.customer_id
    WHERE c.id IS NULL;
    IF v_post_broken <> 0 THEN
        RAISE EXCEPTION 'P1-07 Integrity Failure: post-backfill broken reference count is %, expected 0', v_post_broken;
    END IF;

    -- 5c. Total count preserved exactly at 164
    SELECT count(*) INTO v_post_total
    FROM public.customer_requests;
    IF v_post_total <> 164 THEN
        RAISE EXCEPTION 'P1-07 Integrity Failure: customer_requests total count altered (%), expected 164', v_post_total;
    END IF;

    -- 5d. Distribution check
    SELECT count(*) INTO v_count_4644 FROM public.customer_requests WHERE customer_id = v_cust4644_id;
    IF v_count_4644 <> 85 THEN
        RAISE EXCEPTION 'P1-07 Distribution Failure: CUST-4644 count is %, expected 85 (44 existing + 4 NULL + 37 broken)', v_count_4644;
    END IF;

    SELECT count(*) INTO v_count_2622 FROM public.customer_requests WHERE customer_id = v_cust2622_id;
    IF v_count_2622 <> 4 THEN
        RAISE EXCEPTION 'P1-07 Distribution Failure: CUST-2622 count is %, expected 4 (1 existing + 3 broken)', v_count_2622;
    END IF;

    SELECT count(*) INTO v_count_8182 FROM public.customer_requests WHERE customer_id = v_cust8182_id;
    IF v_count_8182 <> 2 THEN
        RAISE EXCEPTION 'P1-07 Distribution Failure: CUST-8182 count is %, expected 2 (1 existing + 1 broken)', v_count_8182;
    END IF;

    SELECT count(*) INTO v_count_synth FROM public.customer_requests WHERE customer_id = v_synth_cust_id;
    IF v_count_synth <> 43 THEN
        RAISE EXCEPTION 'P1-07 Distribution Failure: CUST-E2E-LEGACY count is %, expected 43 (9 NULL + 34 broken)', v_count_synth;
    END IF;

    SELECT count(*) INTO v_other_count
    FROM public.customer_requests
    WHERE customer_id NOT IN (v_cust4644_id, v_cust2622_id, v_cust8182_id, v_synth_cust_id);
    IF v_other_count <> 30 THEN
        RAISE EXCEPTION 'P1-07 Distribution Failure: untouched customer rows count is %, expected 30', v_other_count;
    END IF;

    -- ------------------------------------------------------------
    -- STEP 6: DDL CONSTRAINTS & INDEXES
    -- ------------------------------------------------------------
    -- Add Foreign Key (ON DELETE RESTRICT)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_requests_customer_id_fkey'
    ) THEN
        EXECUTE 'ALTER TABLE public.customer_requests
            ADD CONSTRAINT customer_requests_customer_id_fkey
            FOREIGN KEY (customer_id)
            REFERENCES public.customers(id)
            ON DELETE RESTRICT';
    END IF;

    -- Set NOT NULL
    EXECUTE 'ALTER TABLE public.customer_requests ALTER COLUMN customer_id SET NOT NULL';

    -- Add Index on customer_id
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customer_requests_customer_id ON public.customer_requests (customer_id)';

END $$;
