import { createAdminClient } from '../src/lib/dal/customers';

async function auditCleanup() {
  const adminClient = await createAdminClient();
  
  console.log('--- STARTING SYNTHETIC DATA AUDIT (DRY-RUN) ---');
  console.log('Confidence Categories:');
  console.log(' - HIGH: Matches clear synthetic markers (@example.com, MOCK-%, "Verifier", etc.)');
  console.log(' - MEDIUM: Likely synthetic (e.g., CUST-% without auth_user_id) but needs review');
  console.log(' - LOW: Possibly real data, do not delete automatically');
  console.log('\n');

  const tables = [
    'customers', 'requests', 'reports', 'report_option_snapshots', 
    'source_reveals', 'payments', 'payment_intents', 'payment_audit_events', 
    'outbound_messages', 'request_preferences', 'request_status_history', 
    'merchant_performance_events', 'ai_copilot_runs'
  ];

  const results: any = {};

  // 1. Audit Customers
  console.log('Auditing [customers]...');
  const { data: customers } = await adminClient.from('customers').select('*');
  if (customers) {
    results.customers = { HIGH: [], MEDIUM: [], LOW: [] };
    customers.forEach(c => {
      const isExampleEmail = c.email?.includes('@example.com');
      const isMockRef = c.external_reference?.startsWith('MOCK-');
      const isTestName = c.full_name?.match(/Audit|Verifier|Synthetic|Batch|Test/i);
      
      if (isExampleEmail || isMockRef || isTestName) {
        results.customers.HIGH.push(c.id);
      } else if (!c.auth_user_id && c.customer_code?.startsWith('CUST-')) {
        results.customers.MEDIUM.push(c.id);
      } else {
        results.customers.LOW.push(c.id);
      }
    });
  }

  // 2. Audit Requests
  console.log('Auditing [requests]...');
  const { data: requests } = await adminClient.from('requests').select('*');
  if (requests) {
    results.requests = { HIGH: [], MEDIUM: [], LOW: [] };
    requests.forEach(r => {
      const isTestTitle = r.title?.match(/Audit|Verifier|Synthetic|Batch|Test/i);
      const isVerifierSource = r.source_channel === 'verifier' || r.source_channel === 'test';
      
      if (isTestTitle || isVerifierSource) {
        results.requests.HIGH.push(r.id);
      } else if (r.request_code?.startsWith('REQ-')) {
        results.requests.MEDIUM.push(r.id);
      } else {
        results.requests.LOW.push(r.id);
      }
    });
  }

  // 3. Dependent Tables (Link to Requests)
  const dependentTables = [
    'reports', 'report_option_snapshots', 'source_reveals', 'payments', 
    'payment_intents', 'payment_audit_events', 'outbound_messages', 
    'request_preferences', 'request_status_history', 'ai_copilot_runs'
  ];

  for (const table of dependentTables) {
    console.log(`Auditing [${table}]...`);
    const { data: rows } = await adminClient.from(table).select('*');
    if (rows) {
      results[table] = { HIGH: [], MEDIUM: [], LOW: [] };
      rows.forEach(row => {
        const reqId = row.request_id;
        if (results.requests.HIGH.includes(reqId)) {
          results[table].HIGH.push(row.id);
        } else if (results.requests.MEDIUM.includes(reqId)) {
          results[table].MEDIUM.push(row.id);
        } else {
          // Check if the row itself has test markers (e.g. outbound_messages subject)
          const isTestText = (row.rendered_subject || row.title || row.name || '').match(/Audit|Verifier|Synthetic|Batch|Test/i);
          if (isTestText) {
            results[table].HIGH.push(row.id);
          } else {
            results[table].LOW.push(row.id);
          }
        }
      });
    }
  }

  // 4. Report Summary
  console.log('\n--- AUDIT SUMMARY ---');
  Object.keys(results).forEach(table => {
    const counts = results[table];
    console.log(`Table [${table}]:`);
    console.log(` - HIGH Confidence:   ${counts.HIGH.length}`);
    console.log(` - MEDIUM Confidence: ${counts.MEDIUM.length}`);
    console.log(` - LOW Confidence:    ${counts.LOW.length}`);
    if (counts.HIGH.length > 0) {
      console.log(`   Sample HIGH IDs: ${counts.HIGH.slice(0, 3).join(', ')}`);
    }
    console.log('---');
  });

  console.log('\nEXPLICIT CONFIRMATION: No rows were deleted during this audit.');
}

auditCleanup().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
