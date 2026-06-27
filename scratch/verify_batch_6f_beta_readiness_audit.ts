import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../src/lib/dal/customers';
import { maskSourceDetails } from '../src/lib/dal/reports';
import fs from 'fs';
import path from 'path';

async function verify() {
  console.log('--- BATCH 6F: BETA READINESS AUDIT VERIFIER ---');
  const admin = await createAdminClient();

  // 1. Verify Dictionary Keys
  const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/dictionaries/en.json'), 'utf8'));
  const ar = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/dictionaries/ar.json'), 'utf8'));

  const requiredKeys = [
    'start_request.pricing_model_everyday',
    'start_request.pricing_model_high_value',
    'start_request.pricing_model_projects',
    'start_request.trust_disclaimer.title',
    'customer_dashboard.trust_flow_helper',
    'customer_dashboard.status_open',
    'customer_dashboard.status_research',
    'customer_dashboard.status_reporting',
    'customer_dashboard.status_client_ready'
  ];

  for (const keyPath of requiredKeys) {
    const parts = keyPath.split('.');
    let valEn: any = en;
    let valAr: any = ar;
    for (const p of parts) {
      valEn = valEn?.[p];
      valAr = valAr?.[p];
    }
    if (!valEn || !valAr) {
      throw new Error(`MISSING DICTIONARY KEY: ${keyPath}`);
    }
    console.log(`✅ Key exists: ${keyPath}`);
  }

  // 2. Verify maskSourceDetails strips hidden fields
  const sampleSnapshot = {
    id: 'test-snap',
    reveal_locked: true,
    display_title: 'Test Option',
    hidden_merchant_name: 'Secret Store',
    hidden_reference_url: 'https://secret.com',
    hidden_contact_notes: 'Don\'t tell anyone'
  };
  const masked = maskSourceDetails(sampleSnapshot);
  if (masked.hidden_merchant_name || masked.merchant_name === 'Secret Store' || masked.revealedSourceText === 'Secret Store') {
    throw new Error('FAILED: maskSourceDetails leaked sensitive info when locked.');
  }
  console.log('✅ maskSourceDetails securely hides hidden fields.');

  // 3. Verify communication templates
  const requiredTemplates = [
    'request_received',
    'report_ready',
    'payment_required',
    'payment_received',
    'source_unlocked',
    'clarification_needed'
  ];
  const { data: templates } = await admin.from('communication_templates').select('template_code');
  const codes = templates?.map(t => t.template_code) || [];
  for (const t of requiredTemplates) {
    if (!codes.includes(t)) {
      throw new Error(`MISSING COMMUNICATION TEMPLATE: ${t}`);
    }
    console.log(`✅ Template exists: ${t}`);
  }

  // 4. Verify no static synthetic leftovers
  const { count: leftoverReq } = await admin.from('requests').select('*', { count: 'exact', head: true }).ilike('title', '%STATIC%');
  if ((leftoverReq || 0) > 0) {
     console.warn(`WARNING: ${leftoverReq} static requests found. Please clean up.`);
  } else {
    console.log('✅ No static synthetic leftovers found in requests.');
  }

  // 5. Verify Metrics
  const { data: metrics } = await admin.from('v_trust_funnel_metrics').select('*').limit(1).maybeSingle();
  if (metrics) {
    console.log('✅ Trust funnel metrics return valid row.');
  } else {
    console.warn('WARNING: Trust funnel metrics view is empty or inaccessible.');
  }

  console.log('VERIFICATION SUCCESSFUL');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
