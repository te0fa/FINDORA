import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '../src/lib/supabase/admin'

async function inspectColumns() {
  const db = createAdminClient()
  console.log("=== Columns Inspection ===\n")

  // Inspect vendors
  try {
    const { data, error } = await db.from('vendors').insert({ display_name: 'Temp Test Vendor' }).select().single()
    if (error) {
      console.error("Error inserting into vendors:", error)
    } else {
      console.log("Columns in vendors:", Object.keys(data))
      // Clean up
      await db.from('vendors').delete().eq('id', data.id)
    }
  } catch (err: any) {
    console.error("vendors error:", err.message)
  }

  // Inspect merchant_profiles
  try {
    const { data, error } = await db.from('merchant_profiles').insert({
      business_name_ar: 'تست',
      business_name_en: 'Test',
      business_category: 'Electronics',
      phone_number: '01000000009',
      phone_verified: true
    }).select().single()
    if (error) {
      console.error("Error inserting into merchant_profiles:", error)
    } else {
      console.log("Columns in merchant_profiles:", Object.keys(data))
      // Clean up
      await db.from('merchant_profiles').delete().eq('id', data.id)
    }
  } catch (err: any) {
    console.error("merchant_profiles error:", err.message)
  }

  // Inspect vendor_profile_details
  try {
    const { data: vendorData, error: vendorErr } = await db.from('vendors').insert({ display_name: 'Temp Test Vendor 2' }).select().single()
    if (vendorData) {
      const { data, error } = await db.from('vendor_profile_details').insert({
        vendor_id: vendorData.id,
        business_name_ar: 'تست 2',
        merchant_type: 'retailer',
        category: 'Electronics'
      }).select().single()
      if (error) {
        console.error("Error inserting into vendor_profile_details:", error)
      } else {
        console.log("Columns in vendor_profile_details:", Object.keys(data))
        // Clean up
        await db.from('vendor_profile_details').delete().eq('id', data.id)
      }
      await db.from('vendors').delete().eq('id', vendorData.id)
    }
  } catch (err: any) {
    console.error("vendor_profile_details error:", err.message)
  }
}

inspectColumns().catch(console.error)
