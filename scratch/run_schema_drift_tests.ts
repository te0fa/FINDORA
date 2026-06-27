import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '../src/lib/supabase/admin'
import { getActiveVendors, getProductsWithVendors } from '../src/lib/dal/marketplace'
import { persistResearchItems } from '../src/lib/dal/research'

async function runTests() {
  const db = createAdminClient()
  console.log("=== FINDORA Schema Drift Resolution Test Suite ===\n")

  // ==========================================
  // Test 1: Customer Dashboard Query Simulation
  // ==========================================
  console.log("--- Test 1: Customer Dashboard Query Simulation ---")
  try {
    // 1. Fetch any customer to simulate a logged-in user session
    const { data: customer } = await db.from('customers').select('id, auth_user_id').limit(1).maybeSingle()
    if (!customer) {
      console.log("[SKIP] No customers found in DB. Skipping customer lookup check.")
    } else {
      console.log(`Found mock customer: ${customer.id} / Auth User: ${customer.auth_user_id}`)
      
      // Simulate dashboard lookup
      const { data: requests, error } = await db
        .from('customer_requests')
        .select('*')
        .eq('customer_id', customer.id)
        .limit(5)
      
      if (error) throw error
      console.log(`[PASS] Customer requests query completed successfully. Found ${requests?.length} items.\n`)
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 1: ${err.message}\n`)
  }

  // ==========================================
  // Test 2: Vendor Registration via RPC (Success Path)
  // ==========================================
  console.log("--- Test 2: Vendor Registration via RPC (Success Path) ---")
  const testPhone = "01009998877"
  // Clean up any existing vendor with this phone first
  await db.from('vendors').delete().eq('whatsapp_number', testPhone)
  
  try {
    const { data: vendorId, error } = await db.rpc('fn_register_vendor', {
      p_business_name_ar: "معرض النور التجريبي",
      p_business_name_en: "Al-Noor Test Gallery",
      p_merchant_type: "wholesaler",
      p_category: "Electronics",
      p_governorate: "Cairo",
      p_city: "Maadi",
      p_area: "Degla",
      p_address: "15 Degla St.",
      p_primary_phone: testPhone,
      p_secondary_phone: "01122334455",
      p_email: "alnoor_test@findora.com",
      p_website: "www.alnoortest.com",
      p_notes: "Test notes"
    })

    if (error) throw error
    console.log(`[PASS] Registered vendor ID: ${vendorId}`)

    // Verify main vendors table record
    const { data: vendor } = await db.from('vendors').select('*').eq('id', vendorId).single()
    console.log(`Verified vendors table displays display_name: ${vendor.display_name}, whatsapp_number: ${vendor.whatsapp_number}`)

    // Verify vendor_profile_details table record
    const { data: profile } = await db.from('vendor_profile_details').select('*').eq('vendor_id', vendorId).single()
    console.log(`Verified vendor_profile_details contains merchant_type: ${profile.merchant_type}, email: ${profile.email}\n`)
  } catch (err: any) {
    console.error(`[FAIL] Test 2: ${err.message}\n`)
  }

  // ==========================================
  // Test 2b: Vendor Registration Atomicity (Failure Path)
  // ==========================================
  console.log("--- Test 2b: Vendor Registration Atomicity Check ---")
  const failPhone = "01005554433"
  await db.from('vendors').delete().eq('whatsapp_number', failPhone)

  try {
    // Intentionally pass null/empty for p_merchant_type, which violates database NOT NULL constraint in vendor_profile_details
    const { data, error } = await db.rpc('fn_register_vendor', {
      p_business_name_ar: "معرض الفشل التجريبي",
      p_business_name_en: "",
      p_merchant_type: null as any, // Violates NOT NULL
      p_category: "Electronics",
      p_governorate: "Giza",
      p_city: "",
      p_area: "",
      p_address: "",
      p_primary_phone: failPhone,
      p_secondary_phone: "",
      p_email: "",
      p_website: "",
      p_notes: "Should fail"
    })

    if (error) {
      console.log(`Caught expected error during atomic registration: ${error.message}`)
      
      // Verify that NO vendor was inserted into public.vendors (Rollback check)
      const { data: orphanedVendor } = await db
        .from('vendors')
        .select('id')
        .eq('whatsapp_number', failPhone)
        .maybeSingle()

      if (orphanedVendor) {
        throw new Error("Atomicity failure: A record was left in public.vendors despite registration failure!")
      } else {
        console.log("[PASS] Atomicity verified. Database rolled back cleanly; no orphaned vendor record remains.\n")
      }
    } else {
      throw new Error("RPC should have failed due to null merchant_type but succeeded instead.")
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 2b: ${err.message}\n`)
  }

  // ==========================================
  // Test 3: Marketplace Queries (`marketplace.ts`)
  // ==========================================
  console.log("--- Test 3: Marketplace Queries ---")
  try {
    const activeVendors = await getActiveVendors()
    console.log(`[PASS] getActiveVendors() completed successfully. Returned ${activeVendors.length} active vendors.`)

    const activeProducts = await getProductsWithVendors()
    console.log(`[PASS] getProductsWithVendors() completed successfully. Returned ${activeProducts.length} products.\n`)
  } catch (err: any) {
    console.error(`[FAIL] Test 3: ${err.message}\n`)
  }

  // ==========================================
  // Test 4: AI Sourcing Research Item Persistence
  // ==========================================
  console.log("--- Test 4: AI Sourcing Research Item Persistence ---")
  try {
    // Fetch any request
    const { data: request } = await db.from('requests').select('id').limit(1).maybeSingle()
    if (!request) {
      console.log("[SKIP] No requests found. Skipping research item persistence check.")
    } else {
      // Create a temporary research run
      const { data: run, error: runErr } = await db
        .from('research_runs')
        .insert({
          request_id: request.id,
          run_kind: 'online_search',
          status: 'completed',
          summary: 'Temp test run'
        })
        .select()
        .single()
      
      if (runErr) throw runErr

      // Persist research item using correct DB columns (product_title, raw_payload)
      const items = await persistResearchItems([{
        research_run_id: run.id,
        request_id: request.id,
        source_name: 'test_retrieval',
        product_title: 'Sourcing Test Candidate',
        listing_url: 'https://findora.com/test-item',
        currency_code: 'EGP',
        availability_status: 'in_stock',
        raw_payload: {
          quality_notes: 'Highly relevant price',
          relevance_score: 95
        }
      }])

      console.log(`[PASS] Research item persisted successfully with ID: ${items[0].id}`)
      
      // Clean up temp run
      await db.from('research_runs').delete().eq('id', run.id)
      console.log(`Cleaned up temp research run: ${run.id}\n`)
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 4: ${err.message}\n`)
  }

  // Clean up Test 2 vendor
  await db.from('vendors').delete().eq('whatsapp_number', testPhone)
  console.log("Cleanup complete. Test suite execution finished.")
}

runTests().catch(console.error)
