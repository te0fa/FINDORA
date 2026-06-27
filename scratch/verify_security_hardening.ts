// scratch/verify_security_hardening.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'

async function test1_unauthenticated_api() {
  console.log('\n--- Test 1: Unauthenticated API Access ---')
  const routes = [
    '/api/bids?request_id=123',
    '/api/contributors/tasks',
    '/api/customers/points/redeem',
    '/api/vendors',
    '/api/watchlists'
  ]

  let allOk = true
  for (const route of routes) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        method: route.includes('redeem') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: route.includes('redeem') ? JSON.stringify({}) : undefined
      })
      console.log(`${route} -> Status: ${response.status}`)
      if (response.status !== 401) {
        console.error(`❌ FAILED: Expected 401, got ${response.status}`)
        allOk = false
      } else {
        const body = await response.json()
        if (body.error !== 'Unauthorized') {
          console.error(`❌ FAILED: Expected { error: 'Unauthorized' }, got`, body)
          allOk = false
        } else {
          console.log(`✅ Passed: Received 401 Unauthorized with correct error body.`)
        }
      }
    } catch (err: any) {
      console.error(`❌ FAILED: Network error on ${route}:`, err.message)
      allOk = false
    }
  }
  return allOk
}

async function test2_authenticated_api() {
  console.log('\n--- Test 2: Authenticated API Access ---')
  // We sign in using the test account credentials
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const supabase = createClient(url, key)

  const email = process.env.E2E_STAFF_EMAIL
  const password = process.env.E2E_STAFF_PASSWORD

  if (!email || !password) {
    console.error('❌ E2E credentials missing from .env.local')
    return false
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('❌ Sign in failed:', error.message)
    return false
  }

  const session = data.session
  if (!session) {
    console.error('❌ No session active')
    return false
  }

  console.log(`Signed in successfully as ${email}`)

  const projectRef = url.split('//')[1].split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user
  }
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(sessionData)).toString('base64')

  const headers = {
    'Cookie': `${cookieName}=${cookieValue}`,
    'Content-Type': 'application/json'
  }

  // Fetch /api/staff/feature-flags which requires staff authentication
  try {
    const response = await fetch(`${BASE_URL}/api/staff/feature-flags`, { headers })
    console.log(`/api/staff/feature-flags -> Status: ${response.status}`)
    if (response.status === 200) {
      console.log('✅ Passed: Authenticated request to /api/staff/feature-flags succeeded (200 OK)')
      return true
    } else {
      const text = await response.text()
      console.error(`❌ FAILED: Expected 200, got ${response.status}. Body: ${text}`)
      return false
    }
  } catch (err: any) {
    console.error('❌ Network error on authenticated request:', err.message)
    return false
  }
}

async function test3_pages_redirect() {
  console.log('\n--- Test 3: Pages Redirection & Callback ---')
  const pages = [
    '/ar/staff/dashboard',
    '/ar/contributors/dashboard',
    '/ar/dashboard'
  ]

  let allOk = true
  for (const page of pages) {
    try {
      // Fetch page without cookies, redirect should happen
      // We set redirect: 'manual' to intercept the redirect response
      const response = await fetch(`${BASE_URL}${page}`, { redirect: 'manual' })
      const status = response.status
      const location = response.headers.get('location')
      console.log(`${page} -> Status: ${status}, Location: ${location}`)

      if (status === 307 || status === 302 || status === 303) {
        const expectedTarget = `/ar/auth/login?next=${encodeURIComponent(page)}`
        if (location && location.includes(encodeURIComponent(page))) {
          console.log(`✅ Passed: Correctly redirected to login with next callback URL.`)
        } else {
          console.error(`❌ FAILED: Expected location to include next callback, got ${location}`)
          allOk = false
        }
      } else {
        console.error(`❌ FAILED: Expected redirect status, got ${status}`)
        allOk = false
      }
    } catch (err: any) {
      console.error(`❌ Network error on page redirect:`, err.message)
      allOk = false
    }
  }
  return allOk
}

async function test4_rate_limiting() {
  console.log('\n--- Test 4: Rate Limiting ---')
  // Send 11 requests in 1 minute to /api/otp/send and check for 429
  // OTP route limit is 10/min
  const route = '/api/otp/send'
  console.log(`Sending 11 requests to ${route}...`)
  
  let hit429 = false
  for (let i = 1; i <= 12; i++) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '01012345678', purpose: 'contributor_registration' })
      })

      console.log(`Request #${i} -> Status: ${response.status}`)
      if (response.status === 429) {
        const headersJson: Record<string, string> = {}
        response.headers.forEach((val, key) => { headersJson[key] = val })
        console.log(`Rate Limit Headers:`, headersJson)
        console.log(`✅ Passed: Successfully hit 429 Too Many Requests on request #${i}`)
        hit429 = true
        break
      }
    } catch (err: any) {
      console.error(`❌ Network error on rate limiting:`, err.message)
      return false
    }
  }

  if (!hit429) {
    console.error('❌ FAILED: Sent 12 requests without hitting 429 Too Many Requests limit')
    return false
  }
  return true
}

async function test5_webhooks() {
  console.log('\n--- Test 5: Paymob Webhook ---')
  // Verify that GET /api/webhooks/paymob returns 200 and is not blocked by session auth
  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/paymob`)
    console.log(`/api/webhooks/paymob -> Status: ${response.status}`)
    if (response.status === 200) {
      console.log('✅ Passed: Paymob webhook GET is active (200 OK) and exempt from auth checks')
      return true
    } else {
      console.error(`❌ FAILED: Expected 200, got ${response.status}`)
      return false
    }
  } catch (err: any) {
    console.error('❌ Network error on webhook:', err.message)
    return false
  }
}

async function runTests() {
  console.log('Starting Security Hardening Verification Suite...')
  
  const t1 = await test1_unauthenticated_api()
  const t2 = await test2_authenticated_api()
  const t3 = await test3_pages_redirect()
  const t4 = await test4_rate_limiting()
  const t5 = await test5_webhooks()

  console.log('\n--- VERIFICATION RESULTS ---')
  console.log(`Test 1 (Unauthenticated API): ${t1 ? 'PASS' : 'FAIL'}`)
  console.log(`Test 2 (Authenticated API): ${t2 ? 'PASS' : 'FAIL'}`)
  console.log(`Test 3 (Pages Redirection): ${t3 ? 'PASS' : 'FAIL'}`)
  console.log(`Test 4 (Rate Limiting): ${t4 ? 'PASS' : 'FAIL'}`)
  console.log(`Test 5 (Webhooks Exemption): ${t5 ? 'PASS' : 'FAIL'}`)

  if (t1 && t2 && t3 && t4 && t5) {
    console.log('\n⭐ FINAL RATING: Middleware & Auth Gate: PASS ⭐')
  } else {
    console.log('\n🛑 FINAL RATING: Middleware & Auth Gate: FAIL 🛑')
  }
}

runTests().catch(console.error)
