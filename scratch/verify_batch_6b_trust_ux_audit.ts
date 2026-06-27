import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { maskSourceDetails } from '../src/lib/dal/reports'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!
const db = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- STARTING VERIFICATION: Batch 6B Trust UX Audit ---')
  let passed = true

  // 1. Verify Dictionary Keys
  console.log('\n[1] Verifying Dictionary Keys...')
  const enPath = path.join(process.cwd(), 'src/dictionaries/en.json')
  const arPath = path.join(process.cwd(), 'src/dictionaries/ar.json')
  
  const enDict = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const arDict = JSON.parse(fs.readFileSync(arPath, 'utf8'))

  if (!enDict.start_request.trust_disclaimer || !arDict.start_request.trust_disclaimer) {
    console.error('❌ Trust disclaimer missing in dictionaries.')
    passed = false
  } else {
    console.log('✅ Trust disclaimer found in both dictionaries.')
  }

  if (!enDict.customer_dashboard.trust_flow_helper || !arDict.customer_dashboard.trust_flow_helper) {
    console.error('❌ Customer dashboard trust flow helper missing in dictionaries.')
    passed = false
  } else {
    console.log('✅ Customer dashboard trust flow helper found.')
  }

  // 2. Verify Database Templates
  console.log('\n[2] Verifying Communication Templates...')
  const requiredTemplates = [
    'request_received',
    'report_ready',
    'payment_required',
    'payment_received',
    'clarification_needed',
    'source_unlocked'
  ]

  const { data: templates, error } = await db.from('communication_templates').select('template_code, language_code')
  if (error) {
    console.error('❌ Failed to fetch templates', error)
    passed = false
  } else {
    const existing = new Set(templates.map(t => `${t.template_code}_${t.language_code}`))
    let templatesOk = true
    for (const t of requiredTemplates) {
      if (!existing.has(`${t}_en`)) {
        console.error(`❌ Template ${t} missing for EN`)
        templatesOk = false
      }
      if (!existing.has(`${t}_ar`)) {
        console.error(`❌ Template ${t} missing for AR`)
        templatesOk = false
      }
    }
    if (templatesOk) {
      console.log('✅ All required communication templates are present in DB.')
    } else {
      passed = false
    }
  }

  // 3. Verify Report Masking Logic
  console.log('\n[3] Verifying Report Masking (maskSourceDetails)...')
  const mockSnapshotLocked = {
    id: 'snap-1',
    reveal_locked: true,
    hidden_merchant_name: 'Super Secret Supplier',
    hidden_reference_url: 'https://secret.com',
    hidden_contact_notes: 'Call John 123',
    public_note: 'A good option'
  }
  
  const masked = maskSourceDetails(mockSnapshotLocked)
  if (masked.hidden_merchant_name !== undefined || masked.hidden_reference_url !== undefined || masked.hidden_contact_notes !== undefined) {
    console.error('❌ maskSourceDetails leaked hidden_* fields!')
    passed = false
  } else if (masked.revealedSourceText !== '*** Locked ***' || masked.revealedContactInfo !== '*** Locked ***') {
    console.error('❌ maskSourceDetails did not properly lock fields.')
    passed = false
  } else {
    console.log('✅ maskSourceDetails securely hides hidden_* fields when locked.')
  }

  const mockSnapshotUnlocked = { ...mockSnapshotLocked, reveal_locked: false }
  const unmasked = maskSourceDetails(mockSnapshotUnlocked)
  if (unmasked.revealedSourceText !== 'Super Secret Supplier') {
    console.error('❌ maskSourceDetails failed to reveal correctly.')
    passed = false
  } else {
    console.log('✅ maskSourceDetails reveals correctly when unlocked.')
  }

  // 4. Verify Start Request Form Duplicate Check
  console.log('\n[4] Verifying Start Request Form...')
  const formPath = path.join(process.cwd(), 'src/app/[locale]/start-request/StartRequestForm.tsx')
  const formCode = fs.readFileSync(formPath, 'utf8')
  
  const requestKindMatches = formCode.match(/name="request_kind"/g) || []
  if (requestKindMatches.length > 1) {
    console.error(`❌ StartRequestForm has ${requestKindMatches.length} inputs named request_kind. Duplicate not fixed!`)
    passed = false
  } else if (requestKindMatches.length === 0) {
    console.error(`❌ StartRequestForm has no request_kind inputs. Category field missing!`)
    passed = false
  } else {
    console.log('✅ StartRequestForm has exactly one request_kind input (no duplicates).')
  }

  if (passed) {
    console.log('\n🎉 ALL VERIFICATIONS PASSED FOR BATCH 6B!')
  } else {
    console.log('\n⚠️ VERIFICATION FAILED. Check logs above.')
    process.exit(1)
  }
}

run()
