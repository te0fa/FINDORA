import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import * as dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecret = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseSecret)

async function runLiveTest() {
  console.log('🚀 Creating live test request in Supabase...')
  
  // 1. Get staff info
  const staffEmail = process.env.E2E_STAFF_EMAIL || 'zrzortrials@gmail.com'
  const staffPassword = process.env.E2E_STAFF_PASSWORD || '123456'
  
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) throw new Error(`Failed to list users: ${userError.message}`)
  
  const targetUser = users.find(u => u.email === staffEmail)
  if (!targetUser) throw new Error(`Staff user with email ${staffEmail} not found`)

  const { data: staff, error: staffErr } = await supabase
    .from('staff_members')
    .select('*')
    .eq('auth_user_id', targetUser.id)
    .single()
  if (staffErr || !staff) throw new Error(`Staff member record not found: ${staffErr?.message}`)

  // 2. Find or create customer
  const testCustomerEmail = 'e2e-staff-test-customer@example.com'
  let customerId: string
  
  const { data: existingCust } = await supabase
    .from('customers')
    .select('id')
    .eq('email', testCustomerEmail)
    .maybeSingle()

  if (existingCust) {
    customerId = existingCust.id
  } else {
    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert({
        full_name: 'E2E Staff Test Customer',
        email: testCustomerEmail,
        customer_code: `CUST-E2E-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'active'
      } as any)
      .select()
      .single()
    
    if (custErr) throw new Error(`Failed to create test customer: ${custErr.message}`)
    customerId = newCust.id
  }

  // 3. Create Request
  const requestCode = `REQ-PROD-TEST-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .insert({
      request_code: requestCode,
      customer_id: customerId,
      title: '[PROD_BACKGROUND_JOB_TEST] Testing Vercel Lambda behavior',
      raw_description: 'This is a test request to trace background jobs on Vercel deployment.',
      current_status: 'submitted',
      source_channel: 'e2e',
      request_kind: 'general',
      intake_mode: 'quick',
      pricing_decision: 'pending_review',
      assigned_reviewer_staff_id: staff.id,
      reviewer_assignment_status: 'assigned',
      reviewer_assigned_at: new Date().toISOString()
    })
    .select()
    .single()

  if (reqErr || !request) throw new Error(`Failed to create request: ${reqErr?.message}`)
  console.log(`✅ Created request: ${request.id} (${requestCode})`)

  // Upsert preferences
  const { error: prefError } = await supabase
    .from('request_preferences')
    .upsert({
      request_id: request.id,
      urgency_level: 'high',
      search_scope: 'online_and_offline',
      budget_min: 1000,
      budget_max: 5000,
      preferred_governorate: 'Cairo'
    }, { onConflict: 'request_id' })
  if (prefError) throw new Error(`Failed to create preferences: ${prefError.message}`)

  // 4. Launch Playwright browser to click Approve on the production URL
  const prodUrl = 'https://findora-scbtbahn6-te0fa-findora.vercel.app'
  console.log(`🚀 Launching browser to approve on production URL: ${prodUrl}...`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // Login
    console.log('Navigating to login page...')
    await page.goto(`${prodUrl}/en/auth/login`)
    await page.getByTestId('login-email-input').fill(staffEmail)
    await page.getByTestId('login-password-input').fill(staffPassword)
    await page.getByTestId('login-submit').click()
    
    // Wait for redirect to staff workspace/queue
    console.log('Waiting for login to succeed...')
    await page.waitForURL(/.*\/staff\/.*/, { timeout: 20000 })
    console.log('Successfully logged in!')

    // Navigate directly to the request workspace page
    console.log(`Navigating to workspace page for request ${request.id}...`)
    await page.goto(`${prodUrl}/en/staff/workspace/${request.id}`)
    
    await page.waitForSelector('[data-testid="reviewer-decision-select"]', { timeout: 15000 })
    
    // Fill decision
    await page.getByTestId('reviewer-decision-select').selectOption('approve')
    await page.getByTestId('reviewer-note-input').fill('[PROD_BACKGROUND_JOB_TEST] Approving to test Vercel Lambda background execution')
    
    console.log('Clicking approve...')
    await page.getByTestId('reviewer-save-decision').click()

    console.log('Waiting for pricing gate confirmation modal...')
    const confirmButton = page.getByRole('button', { name: /Confirm & Approve/ })
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 })
    console.log('Clicking final Confirm & Approve...')
    await confirmButton.click()
    
    // Wait for success indicator or state change
    console.log('Waiting for approval to submit and redirect...')
    await page.waitForURL(/.*success=true.*/, { timeout: 25000 })
    console.log('✅ Request approved successfully on production!')

  } catch (err: any) {
    console.error('❌ Browser action failed:', err.message)
    await browser.close()
    throw err
  }

  await browser.close()

  // 5. Poll the database every 5 seconds for the workflow runs table status
  console.log('⌛ Polling workflow_runs in Supabase to monitor execution steps...')
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('request_id', request.id)
      .maybeSingle()

    if (runError) {
      console.error(`Error querying workflow run: ${runError.message}`)
    } else if (!run) {
      console.log(`[${(i+1)*5}s] No workflow run initialized yet...`)
    } else {
      console.log(`[${(i+1)*5}s] Current state:
      AI Summary Status: ${run.ai_summary_status}
      Email Status:      ${run.email_status}
      Dispatch Status:   ${run.dispatch_status}
      Attempts:          ${run.attempts}
      Last Error:        ${run.last_error}
      `)
      
      const allCompleted = run.ai_summary_status === 'completed' &&
                            run.email_status === 'completed' &&
                            run.dispatch_status === 'completed'
      
      const anyFailed = run.ai_summary_status === 'failed' ||
                          run.email_status === 'failed' ||
                          run.dispatch_status === 'failed'

      if (allCompleted) {
        console.log('🎉 SUCCESS: All workflow runs steps completed successfully on Vercel deployment!')
        break
      }
      if (anyFailed && run.last_error) {
        console.log('⚠️ FAILURE / WARNING: One or more steps failed, or lambda got cut off.')
      }
    }
  }
}

runLiveTest().catch(console.error)
