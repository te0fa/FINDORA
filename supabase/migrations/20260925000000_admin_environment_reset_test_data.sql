-- Migration: 20260925000000_admin_environment_reset_test_data.sql
-- Purpose: Formal One-Time Administrative Environment Reset to purge test/demo records
-- Target: Reset database to clean production state retaining ONLY the protected owner administrator
-- Design: Executes inside a single atomic transaction.
--         Validates exact cryptographic MD5 sorted-ID hashes of customers, requests, and customer_requests.
--         Asserts all pre-deletion preconditions, counts, and owner isolation before any mutation.
--         Strictly bounds pricing-version creator disassociation to the 3 audited deleted rows.
--         Strictly bounds staff_member_roles deletion to the 6 audited test role IDs.
--         Strictly bounds internal_notes deletion to the verified test note ID and target request IDs.
--         Strictly bounds platform_events deletion to the 8 audited test event IDs.
--         Temporarily drops ONLY the 3 DELETE triggers on findora_deals, staff_members, and staff_member_roles.
--         Purges only explicitly approved test IDs and exact children in strict dependency order.
--         Recreates the exact original DELETE triggers.
--         Asserts all post-conditions before committing.

DO $$
DECLARE
    -- Protected Owner Administrator
    v_owner_staff_id CONSTANT uuid := '780416bb-b60d-4aba-b649-dc493407b155';
    v_owner_auth_id CONSTANT uuid := 'd675221f-acce-48cd-9991-1fae4a6199ce';

    -- Explicit Fixed Target Sets (Audited from Pre-Reset Snapshot)
    v_test_deal_id CONSTANT uuid := '315da466-d9fd-42c1-83e8-56d438313c31';
    v_test_vendor_id CONSTANT uuid := '7b3284c2-04a5-420e-812e-c10ae9387e5b';
    v_expected_test_note_id CONSTANT uuid := '8ff0dc7e-68c6-4577-92ca-cd6bc0f0a2e6';

    v_test_staff_ids CONSTANT uuid[] := ARRAY[
        'cba72058-f521-41ac-aa27-81037774c86e'::uuid,
        '31dfa09a-08b1-45fd-a67d-bbd22b587606'::uuid,
        '9cc1caae-0288-4553-b6ad-5b790ada7bee'::uuid,
        'c1d6d4d7-fb4a-4989-ae85-4f329f089e61'::uuid
    ];

    v_test_merchant_ids CONSTANT uuid[] := ARRAY[
        '21701020-0928-40ab-b8cc-b558d8d34cb2'::uuid,
        'fb4345cb-ce38-4d63-b8c4-1d98216c2863'::uuid
    ];

    v_test_contributor_ids CONSTANT uuid[] := ARRAY[
        '7578942f-5250-4a19-ae12-d0b948e235aa'::uuid,
        '790bf460-5b55-4af7-ac02-aae6e029359f'::uuid,
        'cd0abf45-27c9-492d-b217-7d35bcad0561'::uuid
    ];

    -- Exact 6 Audited Test Staff Roles
    v_expected_test_staff_role_ids CONSTANT uuid[] := ARRAY[
        '3ad03e21-a2e2-4826-8ebb-a7560eeb81e0'::uuid,
        '5e6cc7c0-1ff8-469b-ae98-ee4c53eefd5c'::uuid,
        '236df2b2-d8e1-42c5-acb7-e13ee64f3100'::uuid,
        '648500dc-878b-4b1c-8689-41d1b50187cc'::uuid,
        'ea967371-7a70-4566-b263-3f4e0dbb94ff'::uuid,
        '80d18e61-11c2-4d2a-a5a0-84652d59d441'::uuid
    ];

    -- Exact 3 Audited Historical Deleted Pricing Versions
    v_expected_deleted_pricing_version_ids CONSTANT uuid[] := ARRAY[
        'abbae5b2-9027-426b-8c8e-4407fef55d59'::uuid,
        'd23fb881-fe6f-446a-9bdd-e58c2ea4064b'::uuid,
        '6f9ebea2-81dc-4521-a3f8-170d414199cd'::uuid
    ];

    -- Exact 8 Audited Test Platform Events
    v_expected_platform_event_ids CONSTANT uuid[] := ARRAY[
        'e076917b-3a39-41eb-9dd2-f409c11c14a9'::uuid,
        '05cf29b3-ae25-4bfa-b095-353912503dcc'::uuid,
        'f45284e9-d558-4957-846f-e91d26c238cb'::uuid,
        '2e6afec3-1433-4238-b5aa-b4fae1c33193'::uuid,
        'a982b1d2-7b46-4fee-8315-db7d2550fe52'::uuid,
        'e85f793d-19fb-4836-bb7b-cc539d799216'::uuid,
        '62a93e8b-8afa-453d-aa20-0aff2ddb85da'::uuid,
        'c9f0c10d-0de7-4ae4-aa08-4ce9d22d10e7'::uuid
    ];

    -- Cryptographic Snapshot Hashes (Deterministic md5 of sorted UUIDs)
    v_expected_customers_hash CONSTANT text := '52f25e15cdef955f8ebaa03214bcb12b';
    v_expected_requests_hash CONSTANT text := '508774cb247e6f6f8a45683929f4715b';
    v_expected_customer_requests_hash CONSTANT text := '410185f3b0f4176ca8eb9397debaf70d';

    -- Dynamic target arrays & calculated hashes
    v_target_customer_ids uuid[];
    v_target_request_ids uuid[];
    v_target_customer_request_ids uuid[];

    v_actual_customers_hash text;
    v_actual_requests_hash text;
    v_actual_customer_requests_hash text;

    v_count integer;
BEGIN
    ----------------------------------------------------------------------------
    -- 1. PRE-DELETION PRECONDITION ASSERTIONS
    ----------------------------------------------------------------------------
    -- 1a. Owner Staff Existence, Role, and Active State
    SELECT COUNT(*) INTO v_count
    FROM public.staff_members
    WHERE id = v_owner_staff_id AND staff_role = 'admin' AND is_active = true;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Protected owner staff % not found, not admin, or not active', v_owner_staff_id;
    END IF;

    -- 1b. Owner Isolation Checks
    IF v_owner_staff_id = ANY(v_test_staff_ids) THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Protected owner staff ID found in test staff array';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.customers
    WHERE auth_user_id = v_owner_auth_id;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Protected owner auth user found in customers table';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.staff_member_roles
    WHERE staff_member_id = v_owner_staff_id;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Protected owner staff ID found in staff_member_roles';
    END IF;

    -- 1c. Fixed Target Sets Existence & Counts
    -- Total staff_members: exactly 5 (1 owner + 4 test)
    SELECT COUNT(*) INTO v_count FROM public.staff_members;
    IF v_count <> 5 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 5 total staff members, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.staff_members
    WHERE id = ANY(v_test_staff_ids);

    IF v_count <> 4 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 4 test staff members matching target IDs, found %', v_count;
    END IF;

    -- Total findora_deals: exactly 1
    SELECT COUNT(*) INTO v_count FROM public.findora_deals;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 1 total findora deal, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.findora_deals
    WHERE id = v_test_deal_id;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected test deal % not found', v_test_deal_id;
    END IF;

    -- Total vendors: exactly 1
    SELECT COUNT(*) INTO v_count FROM public.vendors;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 1 total vendor, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.vendors
    WHERE id = v_test_vendor_id;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected test vendor % not found', v_test_vendor_id;
    END IF;

    -- Total merchants: exactly 2
    SELECT COUNT(*) INTO v_count FROM public.merchants;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 2 total merchants, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.merchants
    WHERE id = ANY(v_test_merchant_ids);

    IF v_count <> 2 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 2 test merchants matching target IDs, found %', v_count;
    END IF;

    -- Total contributors: exactly 3
    SELECT COUNT(*) INTO v_count FROM public.contributors;
    IF v_count <> 3 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 3 total contributors, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.contributors
    WHERE id = ANY(v_test_contributor_ids);

    IF v_count <> 3 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 3 test contributors matching target IDs, found %', v_count;
    END IF;

    -- Total staff_member_roles: exactly 6
    SELECT COUNT(*) INTO v_count FROM public.staff_member_roles;
    IF v_count <> 6 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 6 total staff member roles, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.staff_member_roles
    WHERE id = ANY(v_expected_test_staff_role_ids)
      AND staff_member_id = ANY(v_test_staff_ids);

    IF v_count <> 6 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Not all 6 expected test staff roles exist or match test staff IDs';
    END IF;

    -- Total internal_notes: exactly 1
    SELECT COUNT(*) INTO v_count FROM public.internal_notes;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 1 total internal note, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.internal_notes
    WHERE id = v_expected_test_note_id
      AND related_entity_type = 'request'
      AND related_entity_id = 'ae9b57b6-0360-4185-839a-b06912ea4010'::uuid;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Target internal note % does not match expected criteria', v_expected_test_note_id;
    END IF;

    -- Total platform_events: exactly 8 matching verified test IDs
    SELECT COUNT(*) INTO v_count FROM public.platform_events;
    IF v_count <> 8 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 8 total platform events, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.platform_events
    WHERE id = ANY(v_expected_platform_event_ids);

    IF v_count <> 8 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 8 matched platform events, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.platform_events
    WHERE id <> ALL(v_expected_platform_event_ids);

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Found % unexpected platform events not in expected ID list', v_count;
    END IF;

    -- 1d. Pricing Versions Reference Hardening Preconditions
    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE id = ANY(v_expected_deleted_pricing_version_ids);

    IF v_count <> 3 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 3 pricing versions matching target IDs, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE id = ANY(v_expected_deleted_pricing_version_ids)
      AND status = 'deleted'
      AND is_active = false
      AND promo_label_en = '__HARD_DELETED__';

    IF v_count <> 3 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Target pricing versions status/flags mismatch (% matching)', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE (created_by_staff_id = ANY(v_test_staff_ids) OR created_by = ANY(v_test_staff_ids))
      AND id <> ALL(v_expected_deleted_pricing_version_ids);

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Unexpected pricing version row references test staff IDs (% found)', v_count;
    END IF;

    -- 1e. Cryptographic Snapshot Hash & Population Assertions
    SELECT md5(COALESCE(string_agg(id::text, ',' ORDER BY id), ''))
    INTO v_actual_customers_hash
    FROM public.customers;

    IF v_actual_customers_hash <> v_expected_customers_hash THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: customers ID-set hash mismatch. Expected %, found %',
            v_expected_customers_hash, v_actual_customers_hash;
    END IF;

    SELECT md5(COALESCE(string_agg(id::text, ',' ORDER BY id), ''))
    INTO v_actual_requests_hash
    FROM public.requests;

    IF v_actual_requests_hash <> v_expected_requests_hash THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: requests ID-set hash mismatch. Expected %, found %',
            v_expected_requests_hash, v_actual_requests_hash;
    END IF;

    SELECT md5(COALESCE(string_agg(id::text, ',' ORDER BY id), ''))
    INTO v_actual_customer_requests_hash
    FROM public.customer_requests;

    IF v_actual_customer_requests_hash <> v_expected_customer_requests_hash THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: customer_requests ID-set hash mismatch. Expected %, found %',
            v_expected_customer_requests_hash, v_actual_customer_requests_hash;
    END IF;

    -- Capture dynamic target arrays for FK scoping
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_target_customer_ids FROM public.customers;
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_target_request_ids FROM public.requests;
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_target_customer_request_ids FROM public.customer_requests;

    IF COALESCE(array_length(v_target_customer_ids, 1), 0) <> 41 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 41 customers, found %', COALESCE(array_length(v_target_customer_ids, 1), 0);
    END IF;

    IF COALESCE(array_length(v_target_request_ids, 1), 0) <> 79 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 79 requests, found %', COALESCE(array_length(v_target_request_ids, 1), 0);
    END IF;

    IF COALESCE(array_length(v_target_customer_request_ids, 1), 0) <> 175 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: Expected 175 customer_requests, found %', COALESCE(array_length(v_target_customer_request_ids, 1), 0);
    END IF;

    ----------------------------------------------------------------------------
    -- 2. TEMPORARILY DROP DELETE TRIGGERS ON TARGET PROTECTED TABLES
    ----------------------------------------------------------------------------
    DROP TRIGGER IF EXISTS tr_block_delete_findora_deals ON public.findora_deals;
    DROP TRIGGER IF EXISTS tr_block_delete_staff_members ON public.staff_members;
    DROP TRIGGER IF EXISTS tr_block_delete_staff_member_roles ON public.staff_member_roles;

    ----------------------------------------------------------------------------
    -- 3. RESOLVE FOREIGN KEY REFERENCES FROM PRESERVED TABLES
    ----------------------------------------------------------------------------
    -- Strictly bounded update of only the 3 audited historical test pricing version rows
    UPDATE public.service_pricing_versions
    SET created_by_staff_id = NULL,
        created_by = NULL
    WHERE id = ANY(v_expected_deleted_pricing_version_ids);

    -- Verify that exactly the 3 target rows were updated and no other row references test staff
    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE id = ANY(v_expected_deleted_pricing_version_ids)
      AND created_by_staff_id IS NULL
      AND created_by IS NULL;

    IF v_count <> 3 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Expected 3 updated pricing versions with NULL creators, found %', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE created_by_staff_id = ANY(v_test_staff_ids)
       OR created_by = ANY(v_test_staff_ids);

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: % pricing version rows still reference test staff IDs', v_count;
    END IF;

    ----------------------------------------------------------------------------
    -- 4. ATOMIC PURGE OF TARGET BUSINESS DATA (STRICT DEPENDENCY ORDER)
    ----------------------------------------------------------------------------
    -- 4a. Child events, messages, notes, and quotes referencing target customers, requests, or merchants
    DELETE FROM public.customer_intelligence_events
    WHERE customer_id = ANY(v_target_customer_ids)
       OR request_id = ANY(v_target_request_ids);

    DELETE FROM public.outbound_messages
    WHERE customer_id = ANY(v_target_customer_ids)
       OR request_id = ANY(v_target_request_ids);

    -- Exact ID-scoped delete for verified 8 test platform events
    DELETE FROM public.platform_events
    WHERE id = ANY(v_expected_platform_event_ids);

    -- Exact ID-scoped delete for verified test note, plus any request-linked notes
    DELETE FROM public.internal_notes
    WHERE id = v_expected_test_note_id
       OR (related_entity_type = 'request' AND related_entity_id = ANY(v_target_request_ids));

    DELETE FROM public.request_messages
    WHERE request_id = ANY(v_target_request_ids);

    DELETE FROM public.request_preferences
    WHERE request_id = ANY(v_target_request_ids);

    DELETE FROM public.vendor_bids
    WHERE request_id = ANY(v_target_request_ids)
       OR vendor_id = v_test_vendor_id;

    DELETE FROM public.merchant_quotes
    WHERE request_id = ANY(v_target_request_ids)
       OR merchant_id = ANY(v_test_merchant_ids);

    -- 4b. Platform tasks child records referencing customer_requests
    DELETE FROM public.platform_tasks
    WHERE parent_request_id = ANY(v_target_customer_request_ids);

    -- 4c. Sourcing and Customer Requests
    DELETE FROM public.customer_requests
    WHERE id = ANY(v_target_customer_request_ids);

    DELETE FROM public.requests
    WHERE id = ANY(v_target_request_ids);

    -- 4d. Customer contacts and Customers
    DELETE FROM public.customer_contacts
    WHERE customer_id = ANY(v_target_customer_ids);

    DELETE FROM public.customers
    WHERE id = ANY(v_target_customer_ids);

    -- 4e. Merchants and Merchant Performance Events
    DELETE FROM public.merchant_performance_events
    WHERE merchant_id = ANY(v_test_merchant_ids);

    DELETE FROM public.merchants
    WHERE id = ANY(v_test_merchant_ids);

    -- 4f. Vendors and Vendor Profile Details
    DELETE FROM public.vendor_profile_details
    WHERE vendor_id = v_test_vendor_id;

    DELETE FROM public.vendors
    WHERE id = v_test_vendor_id;

    -- 4g. Contributors, Wallets, Transactions, and Submissions
    DELETE FROM public.wallet_transactions
    WHERE contributor_id = ANY(v_test_contributor_ids);

    DELETE FROM public.contributor_submissions
    WHERE contributor_id = ANY(v_test_contributor_ids);

    DELETE FROM public.contributor_wallets
    WHERE contributor_id = ANY(v_test_contributor_ids);

    DELETE FROM public.contributors
    WHERE id = ANY(v_test_contributor_ids);

    -- 4h. Protected tables test records
    DELETE FROM public.findora_deals
    WHERE id = v_test_deal_id;

    -- Exact ID-scoped delete for the 6 verified staff roles
    DELETE FROM public.staff_member_roles
    WHERE id = ANY(v_expected_test_staff_role_ids);

    -- Exact ID-scoped delete for the 4 verified test staff members
    DELETE FROM public.staff_members
    WHERE id = ANY(v_test_staff_ids);

    ----------------------------------------------------------------------------
    -- 5. RECREATE ORIGINAL DELETE TRIGGERS (EXACT DEFINITIONS)
    ----------------------------------------------------------------------------
    CREATE TRIGGER tr_block_delete_findora_deals
    BEFORE DELETE ON public.findora_deals
    FOR EACH ROW EXECUTE FUNCTION public.fn_block_protected_delete();

    CREATE TRIGGER tr_block_delete_staff_members
    BEFORE DELETE ON public.staff_members
    FOR EACH ROW EXECUTE FUNCTION public.fn_block_protected_delete();

    CREATE TRIGGER tr_block_delete_staff_member_roles
    BEFORE DELETE ON public.staff_member_roles
    FOR EACH ROW EXECUTE FUNCTION public.fn_block_protected_delete();

    ----------------------------------------------------------------------------
    -- 6. POST-DELETION ASSERTIONS (ROLLBACK ON ANY DISCREPANCY)
    ----------------------------------------------------------------------------
    -- Assert staff_members count is exactly 1
    SELECT COUNT(*) INTO v_count FROM public.staff_members;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: staff_members count is %, expected 1', v_count;
    END IF;

    -- Assert the surviving staff member is the owner, is admin, and is active
    SELECT COUNT(*) INTO v_count
    FROM public.staff_members
    WHERE id = v_owner_staff_id AND staff_role = 'admin' AND is_active = true;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: owner staff member % is missing, not admin, or not active', v_owner_staff_id;
    END IF;

    -- Assert staff_member_roles is 0
    SELECT COUNT(*) INTO v_count FROM public.staff_member_roles;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: staff_member_roles count is %, expected 0', v_count;
    END IF;

    -- Assert findora_deals is 0
    SELECT COUNT(*) INTO v_count FROM public.findora_deals;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: findora_deals count is %, expected 0', v_count;
    END IF;

    -- Assert customers is 0
    SELECT COUNT(*) INTO v_count FROM public.customers;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: customers count is %, expected 0', v_count;
    END IF;

    -- Assert customer_contacts is 0
    SELECT COUNT(*) INTO v_count FROM public.customer_contacts;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: customer_contacts count is %, expected 0', v_count;
    END IF;

    -- Assert customer_reliability_stats view is 0
    SELECT COUNT(*) INTO v_count FROM public.customer_reliability_stats;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: customer_reliability_stats count is %, expected 0', v_count;
    END IF;

    -- Assert requests is 0
    SELECT COUNT(*) INTO v_count FROM public.requests;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: requests count is %, expected 0', v_count;
    END IF;

    -- Assert customer_requests is 0
    SELECT COUNT(*) INTO v_count FROM public.customer_requests;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: customer_requests count is %, expected 0', v_count;
    END IF;

    -- Assert request_preferences is 0
    SELECT COUNT(*) INTO v_count FROM public.request_preferences;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: request_preferences count is %, expected 0', v_count;
    END IF;

    -- Assert request_messages is 0
    SELECT COUNT(*) INTO v_count FROM public.request_messages;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: request_messages count is %, expected 0', v_count;
    END IF;

    -- Assert vendors is 0
    SELECT COUNT(*) INTO v_count FROM public.vendors;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: vendors count is %, expected 0', v_count;
    END IF;

    -- Assert vendor_profile_details is 0
    SELECT COUNT(*) INTO v_count FROM public.vendor_profile_details;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: vendor_profile_details count is %, expected 0', v_count;
    END IF;

    -- Assert merchants is 0
    SELECT COUNT(*) INTO v_count FROM public.merchants;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: merchants count is %, expected 0', v_count;
    END IF;

    -- Assert contributors is 0
    SELECT COUNT(*) INTO v_count FROM public.contributors;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: contributors count is %, expected 0', v_count;
    END IF;

    -- Assert contributor_wallets is 0
    SELECT COUNT(*) INTO v_count FROM public.contributor_wallets;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: contributor_wallets count is %, expected 0', v_count;
    END IF;

    -- Assert merchant_performance_events is 0
    SELECT COUNT(*) INTO v_count FROM public.merchant_performance_events;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: merchant_performance_events count is %, expected 0', v_count;
    END IF;

    -- Assert contributor_submissions is 0
    SELECT COUNT(*) INTO v_count FROM public.contributor_submissions;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: contributor_submissions count is %, expected 0', v_count;
    END IF;

    -- Assert wallet_transactions is 0
    SELECT COUNT(*) INTO v_count FROM public.wallet_transactions;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: wallet_transactions count is %, expected 0', v_count;
    END IF;

    -- Assert platform_tasks is 0
    SELECT COUNT(*) INTO v_count FROM public.platform_tasks;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: platform_tasks count is %, expected 0', v_count;
    END IF;

    -- Assert platform_events is 0
    SELECT COUNT(*) INTO v_count FROM public.platform_events;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: platform_events count is %, expected 0', v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.platform_events
    WHERE id = ANY(v_expected_platform_event_ids);

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: expected platform_event targets remain (%)', v_count;
    END IF;

    -- Assert internal_notes is 0
    SELECT COUNT(*) INTO v_count FROM public.internal_notes;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: internal_notes count is %, expected 0', v_count;
    END IF;

    -- Assert outbound_messages is 0
    SELECT COUNT(*) INTO v_count FROM public.outbound_messages;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: outbound_messages count is %, expected 0', v_count;
    END IF;

    -- Assert customer_intelligence_events is 0
    SELECT COUNT(*) INTO v_count FROM public.customer_intelligence_events;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: customer_intelligence_events count is %, expected 0', v_count;
    END IF;

    -- Assert vendor_bids is 0
    SELECT COUNT(*) INTO v_count FROM public.vendor_bids;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: vendor_bids count is %, expected 0', v_count;
    END IF;

    -- Assert merchant_quotes is 0
    SELECT COUNT(*) INTO v_count FROM public.merchant_quotes;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: merchant_quotes count is %, expected 0', v_count;
    END IF;

    -- Assert no pricing-version row references test staff
    SELECT COUNT(*) INTO v_count
    FROM public.service_pricing_versions
    WHERE created_by_staff_id = ANY(v_test_staff_ids)
       OR created_by = ANY(v_test_staff_ids);

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'POST-CONDITION FAILED: % pricing version rows still reference test staff', v_count;
    END IF;

    RAISE NOTICE 'Administrative environment reset test data purge completed and verified successfully.';
END $$;
