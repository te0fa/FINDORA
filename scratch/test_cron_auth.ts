import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { GET as fraudAuditGET } from '../src/app/api/cron/fraud-audit/route'
import { GET as networkSurvivalGET } from '../src/app/api/cron/network-survival/route'
import { POST as recalculateNetworksPOST } from '../src/app/api/cron/recalculate-networks/route'
import { GET as taskRecyclerGET } from '../src/app/api/cron/task-recycler/route'
import { GET as trendDetectorGET } from '../src/app/api/cron/trend-detector/route'
import { createClient } from '@supabase/supabase-js'

const TEST_SECRET = 'my-test-cron-secret-1234'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
)

async function setFlagValue(value: boolean) {
  await supabase
    .from('economy_config')
    .update({ value: String(value) })
    .eq('config_key', 'flag_economy_stabilizer_active')
}

async function testEndpointAuth(name: string, handler: Function, method: 'GET' | 'POST') {
  // Test 1: Missing CRON_SECRET in environment
  process.env.CRON_SECRET = ''
  let req = new Request(`http://localhost/api/cron/${name}`, {
    method,
    headers: { 'Authorization': `Bearer ${TEST_SECRET}` }
  })
  let res = await handler(req)
  let body = await res.json()
  const cond1 = res.status === 401 && body.error === 'Unauthorized'
  console.log(`[AUTH TEST] ${name} (missing env secret):`, cond1 ? 'PASS' : 'FAIL', `(Status: ${res.status}, Error: ${body.error})`)

  // Test 2: Wrong Bearer token
  process.env.CRON_SECRET = TEST_SECRET
  req = new Request(`http://localhost/api/cron/${name}`, {
    method,
    headers: { 'Authorization': 'Bearer wrong-secret' }
  })
  res = await handler(req)
  body = await res.json()
  const cond2 = res.status === 401 && body.error === 'Unauthorized'
  console.log(`[AUTH TEST] ${name} (wrong secret token):`, cond2 ? 'PASS' : 'FAIL', `(Status: ${res.status}, Error: ${body.error})`)

  return cond1 && cond2
}

async function testEndpointFlag(name: string, handler: Function, method: 'GET' | 'POST') {
  process.env.CRON_SECRET = TEST_SECRET
  
  // Test 3: Flag is disabled
  await setFlagValue(false)
  let req = new Request(`http://localhost/api/cron/${name}`, {
    method,
    headers: { 'Authorization': `Bearer ${TEST_SECRET}` }
  })
  let res = await handler(req)
  let body = await res.json()
  const cond3 = res.status === 200 && body.success === false && body.message === 'Stabilizer is currently disabled'
  console.log(`[FLAG TEST] ${name} (flag disabled):`, cond3 ? 'PASS' : 'FAIL', `(Success: ${body.success}, Message: ${body.message})`)

  // Test 4: Flag is enabled (should execute successfully or return a functional response)
  await setFlagValue(true)
  req = new Request(`http://localhost/api/cron/${name}`, {
    method,
    headers: { 'Authorization': `Bearer ${TEST_SECRET}` }
  })
  res = await handler(req)
  body = await res.json()
  const cond4 = res.status === 200 && (
    body.success === true ||
    body.message === 'No contributors found' ||
    body.message === 'No recent data for trends' ||
    body.message === 'No stale tasks found'
  )
  console.log(`[EXEC TEST] ${name} (flag enabled):`, cond4 ? 'PASS' : 'FAIL', `(Status: ${res.status}, body:`, JSON.stringify(body), ')')

  return cond3 && cond4
}

async function run() {
  console.log("=== STARTING SECURITY & STABILIZER GUARD TESTS ===")
  
  const endpoints = [
    { name: 'fraud-audit', handler: fraudAuditGET, method: 'GET' as const },
    { name: 'network-survival', handler: networkSurvivalGET, method: 'GET' as const },
    { name: 'recalculate-networks', handler: recalculateNetworksPOST, method: 'POST' as const },
    { name: 'task-recycler', handler: taskRecyclerGET, method: 'GET' as const },
    { name: 'trend-detector', handler: trendDetectorGET, method: 'GET' as const }
  ]

  let allAuthPass = true
  let allFlagPass = true

  for (const ep of endpoints) {
    const authOk = await testEndpointAuth(ep.name, ep.handler, ep.method)
    if (!authOk) allAuthPass = false
    
    const flagOk = await testEndpointFlag(ep.name, ep.handler, ep.method)
    if (!flagOk) allFlagPass = false
    console.log("--------------------------------------------------")
  }

  // Restore DB flag to false (default/secure status until ready)
  await setFlagValue(false)

  console.log("=== TESTS COMPLETED ===")
  console.log("Security / Token Auth Gate Verification:", allAuthPass ? "PASS" : "FAIL")
  console.log("Master Flag Control Guard Verification :", allFlagPass ? "PASS" : "FAIL")
  
  if (allAuthPass && allFlagPass) {
    console.log("OVERALL RESULT: PASS")
    process.exit(0)
  } else {
    console.log("OVERALL RESULT: FAIL")
    process.exit(1)
  }
}

run().catch(e => {
  console.error("Test execution failed:", e)
  process.exit(1)
})
