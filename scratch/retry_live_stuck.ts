import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecret = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseSecret)

async function retryStuckWorkflow() {
  const targetRequestCode = 'REQ-PROD-TEST-MQX3G2UC-CAF5'
  console.log(`🚀 Resuming operational workflow for stuck request ${targetRequestCode}...`)

  const { data: request, error: reqError } = await supabase
    .from('requests')
    .select('id')
    .eq('request_code', targetRequestCode)
    .single()

  if (reqError || !request) {
    throw new Error(`Failed to find request with code ${targetRequestCode}: ${reqError?.message}`)
  }

  const staffEmail = process.env.E2E_STAFF_EMAIL || 'zrzortrials@gmail.com'
  const staffPassword = process.env.E2E_STAFF_PASSWORD || '123456'
  const prodUrl = 'https://findora-te0fa-findora.vercel.app'

  console.log('🚀 Launching browser to trigger Retry on the operational dashboard...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // Login
    console.log('Navigating to login page...')
    await page.goto(`${prodUrl}/en/auth/login`)
    await page.getByTestId('login-email-input').fill(staffEmail)
    await page.getByTestId('login-password-input').fill(staffPassword)
    await page.getByTestId('login-submit').click()
    
    console.log('Waiting for login to succeed...')
    await page.waitForURL(/.*\/staff\/.*/, { timeout: 20000 })
    console.log('Successfully logged in!')

    // Navigate to Workflow Reliability Page
    console.log('Navigating to Workflow Reliability Dashboard...')
    await page.goto(`${prodUrl}/en/staff/ai-control/workflow-reliability`)

    console.log(`Locating row for request ${targetRequestCode}...`)
    // Find the row containing the request code, then find the Retry button inside that row
    const row = page.locator('tr', { hasText: targetRequestCode })
    await row.waitFor({ state: 'visible', timeout: 15000 })

    const retryButton = row.locator('button.btn-retry')
    await retryButton.waitFor({ state: 'visible', timeout: 10000 })
    
    console.log('Clicking Retry button...')
    await retryButton.click()

    console.log('Waiting for retry action execution (5 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    console.log('Retry trigger complete!')

  } catch (err: any) {
    console.error('❌ Browser action failed:', err.message)
    await browser.close()
    throw err
  }

  await browser.close()

  // Poll database to verify recovery
  console.log('⌛ Polling workflow_runs in Supabase to monitor recovery...')
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('request_id', request.id)
      .single()

    if (runError) {
      console.error(`Error querying workflow run: ${runError.message}`)
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

      if (allCompleted) {
        console.log('🎉 SUCCESS: Stuck workflow recovered and completed successfully!')
        break
      }
    }
  }
}

retryStuckWorkflow().catch(console.error)
