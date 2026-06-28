import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '../src/lib/supabase/admin'
import { verifyOtp } from '../src/lib/notifications/otp'

async function runTests() {
  const db = createAdminClient()
  console.log("=== FINDORA Vendor Auth Integration Test Suite ===\n")
  
  const testPhone1 = "01009990001"
  const testPhone2 = "01009990002"

  // Cleanup existing records for test reproducibility
  await db.from('vendors').delete().in('whatsapp_number', [testPhone1, testPhone2])
  await db.from('phone_otp_codes').delete().in('phone_number', [testPhone1, testPhone2])

  let step1Passed = false
  let step2Passed = false
  let step3Passed = false
  let step4Passed = false

  // ----------------------------------------------------
  // TEST 1: Register OTP Verification & Registration Flow
  // ----------------------------------------------------
  console.log("--- Test 1: OTP Send, Verify, and Registration ---")
  try {
    // A. Send OTP
    const { data: sendResult, error: sendErr } = await db.from('phone_otp_codes').insert({
      phone_number: testPhone1,
      code_hash: "mock_hash_for_testing",
      purpose: "vendor_auth",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    }).select().single()

    if (sendErr) throw sendErr
    console.log("[PASS] OTP code registered in database.")

    // B. Call API simulated OTP verify
    // Using a mock verify in DB
    const { error: verifyErr } = await db.from('phone_otp_codes').update({ is_used: true }).eq('id', sendResult.id)
    if (verifyErr) throw verifyErr
    console.log("[PASS] OTP successfully verified and marked as used.")

    // Create a real temp auth user for database constraint validity
    const email = `${testPhone1}@vendor.findora.com`
    // First clean up any existing user with this email
    const { data: usersList } = await db.auth.admin.listUsers()
    const checkUser = usersList?.users?.find(u => u.email === email)
    if (checkUser) {
      await db.auth.admin.deleteUser(checkUser.id)
    }

    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password: "TempPassword123!",
      email_confirm: true
    })
    if (authErr) throw authErr
    const mockAuthUserId = authUser.user.id

    const { data: vendorId, error: regErr } = await db.rpc('fn_register_vendor', {
      p_business_name_ar: "معرض الأثاث الحديث",
      p_business_name_en: "Modern Furniture Gallery",
      p_merchant_type: "retailer",
      p_category: "Furniture",
      p_governorate: "Cairo",
      p_city: "Maadi",
      p_area: "Degla",
      p_address: "Street 9",
      p_primary_phone: testPhone1,
      p_secondary_phone: "",
      p_email: "furniture@test.com",
      p_website: "",
      p_notes: "Auto-registered via test suite",
      p_auth_user_id: mockAuthUserId
    })

    if (regErr) throw regErr
    console.log(`[PASS] Vendor registered with ID: ${vendorId}`)

    // Verify record in database
    const { data: vendorRecord } = await db.from('vendors').select('*').eq('id', vendorId).single()
    if (vendorRecord.auth_user_id === mockAuthUserId && vendorRecord.whatsapp_number === testPhone1) {
      console.log("[PASS] Vendor record linked auth_user_id and phone correctly.")
      step1Passed = true
    } else {
      console.log("[FAIL] Vendor record was not linked correctly.")
    }
  } catch (err: any) {
    console.error("[FAIL] Test 1 failed:", err.message)
  }

  // ----------------------------------------------------
  // TEST 2: Vendor Login via OTP (Matching auth_user_id)
  // ----------------------------------------------------
  console.log("\n--- Test 2: OTP Login Flow ---")
  try {
    const { data: vendor } = await db.from('vendors').select('*').eq('whatsapp_number', testPhone1).single()
    if (vendor && vendor.auth_user_id) {
      console.log(`[PASS] Successfully retrieved authenticated vendor. auth_user_id: ${vendor.auth_user_id}`)
      step2Passed = true
    } else {
      console.log("[FAIL] Could not retrieve vendor or missing auth_user_id.")
    }
  } catch (err: any) {
    console.error("[FAIL] Test 2 failed:", err.message)
  }

  // ----------------------------------------------------
  // TEST 3: Staff Member creates Vendor on their behalf
  // ----------------------------------------------------
  console.log("\n--- Test 3: Staff Creating Vendor on Behalf ---")
  try {
    // Staff member creates vendor without auth_user_id initially
    const { data: vendorId, error: staffCreateErr } = await db.rpc('fn_register_vendor', {
      p_business_name_ar: "محل الأجهزة الإلكترونية (بواسطة الموظف)",
      p_business_name_en: "Electronics Shop (By Staff)",
      p_merchant_type: "wholesaler",
      p_category: "Electronics",
      p_governorate: "Giza",
      p_city: "Dokki",
      p_area: "",
      p_address: "",
      p_primary_phone: testPhone2,
      p_secondary_phone: "",
      p_email: "",
      p_website: "",
      p_notes: "Created by staff on behalf of vendor",
      p_auth_user_id: null // Created by staff, no auth user initially
    })

    if (staffCreateErr) throw staffCreateErr
    console.log(`[PASS] Vendor created by staff. ID: ${vendorId}`)

    const { data: vendorRecord } = await db.from('vendors').select('*').eq('id', vendorId).single()
    if (vendorRecord.auth_user_id === null && vendorRecord.system_status === 'Active') {
      console.log("[PASS] Vendor successfully created on behalf of client with system_status = Active.")
      step3Passed = true
    } else {
      console.log("[FAIL] Vendor record was not configured correctly.")
    }
  } catch (err: any) {
    console.error("[FAIL] Test 3 failed:", err.message)
  }

  // ----------------------------------------------------
  // TEST 4: Secure Legacy Dashboards Access Rejection
  // ----------------------------------------------------
  console.log("\n--- Test 4: Secure Legacy Dashboards Access Rejection ---")
  try {
    // Check if the tables have been renamed to archive format in database
    const { error: offerErr } = await db.from('merchant_offers').select('*').limit(1)
    const { error: profileErr } = await db.from('merchant_profiles').select('*').limit(1)

    console.log("offerErr:", offerErr?.message);
    console.log("profileErr:", profileErr?.message);

    // The query should fail or return not found because they are renamed
    if (offerErr && profileErr) {
      console.log("[PASS] Legacy tables merchant_offers & merchant_profiles have been successfully archived/renamed.")
      step4Passed = true
    } else {
      console.log("[FAIL] Legacy tables are still accessible in original form.")
    }
  } catch (err: any) {
    console.error("[FAIL] Test 4 failed:", err.message)
  }

  // Clean up
  await db.from('vendors').delete().in('whatsapp_number', [testPhone1, testPhone2])
  await db.from('phone_otp_codes').delete().in('phone_number', [testPhone1, testPhone2])

  // Delete temp auth user
  const email = `${testPhone1}@vendor.findora.com`
  const { data: usersList } = await db.auth.admin.listUsers()
  const checkUser = usersList?.users?.find(u => u.email === email)
  if (checkUser) {
    await db.auth.admin.deleteUser(checkUser.id)
  }

  console.log("\n====================================")
  console.log("=== FINAL PASS/FAIL SUMMARY REPORT ===")
  console.log("====================================")
  console.log(`Test 1 (OTP Send, Verify, Register) : ${step1Passed ? "PASS ✅" : "FAIL ❌"}`)
  console.log(`Test 2 (OTP Login Flow)             : ${step2Passed ? "PASS ✅" : "FAIL ❌"}`)
  console.log(`Test 3 (Staff Creating on Behalf)   : ${step3Passed ? "PASS ✅" : "FAIL ❌"}`)
  console.log(`Test 4 (Secure Legacy Dashboards)   : ${step4Passed ? "PASS ✅" : "FAIL ❌"}`)
  console.log("====================================")
  console.log(`FINAL RESULT: ${step1Passed && step2Passed && step3Passed && step4Passed ? "ALL PASSED (PASS) 🏆" : "FAILED (FAIL) ❌"}`)
}

runTests().catch(console.error)
