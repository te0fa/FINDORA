import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const adminDb = createClient(supabaseUrl, supabaseSecretKey);
const anonDb = createClient(supabaseUrl, supabaseAnonKey);

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

async function verifyBatch4A() {
  console.log('--- BATCH 4A INTELLIGENCE FOUNDATION VERIFICATION ---');

  const tables = [
    'merchants',
    'merchant_performance_events',
    'merchant_customer_feedback',
    'merchant_score_snapshots',
    'customer_intelligence_events',
    'customer_score_snapshots',
    'customer_segments',
    'platform_events',
    'communication_templates',
    'outbound_messages',
    'communication_preferences'
  ];

  let testMerchantId: string | null = null;
  let testMessageId: string | null = null;

  try {
    // 1. Verify Tables Exist
    console.log('\n[1] Verifying Table Existence (Admin)...');
    for (const table of tables) {
      const { error } = await adminDb.from(table).select('count', { count: 'exact', head: true });
      assert(!error, `Table "${table}" check failed: ${error?.message}`);
      console.log(`✅ Table "${table}" exists.`);
    }

    // 2. Verify Templates
    console.log('\n[2] Verifying Communication Templates...');
    const { data: templates, error: tempErr } = await adminDb.from('communication_templates').select('template_code, language_code');
    assert(!tempErr, `Failed to fetch templates: ${tempErr?.message}`);
    
    const arCount = templates!.filter(t => t.language_code === 'ar').length;
    const enCount = templates!.filter(t => t.language_code === 'en').length;
    console.log(`- Arabic templates: ${arCount} (Expected 12)`);
    console.log(`- English templates: ${enCount} (Expected 12)`);
    assert(arCount === 12 && enCount === 12, 'Template count mismatch (Expected 12 AR, 12 EN).');
    console.log('✅ Template count matches expectation.');

    // 3. Automated Security Verification
    console.log('\n[3] Automated Security Audit (Access Control Tests)...');
    
    // A. Merchant Privacy Check (Anon should not see anything)
    const { data: merchantRead, error: readErr } = await anonDb.from('merchants').select('*');
    if (readErr) {
      console.log(`✅ Merchant Privacy: Anon read blocked (Error: ${readErr.message})`);
    } else {
      assert(merchantRead!.length === 0, `SECURITY BREACH: Anonymous user can read ${merchantRead!.length} merchants!`);
      console.log('✅ Merchant Privacy: Anon read returned 0 results.');
    }

    // B. Platform Event Insert Check (Anon should be blocked)
    const { error: insErr } = await anonDb.from('platform_events').insert({ event_type: 'security_test_anon' });
    assert(!!insErr, 'SECURITY BREACH: Anonymous user can insert into platform_events!');
    console.log(`✅ Platform Event Security: Anon insert blocked correctly.`);

    // 4. Verify Admin Write Access & Isolation
    console.log('\n[4] Verifying Admin Write Access & Isolation...');
    const testId = `verify-4a-${Math.random().toString(36).substring(7)}`;
    const businessNameEn = 'Verification Merchant (Batch 4A Strict)';
    
    // Retry logic for schema cache
    let retries = 3;
    let merchant: any = null;
    while (retries > 0) {
      // NOTE: Including legacy required columns: 'name', 'merchant_type'
      const { data, error } = await adminDb.from('merchants').insert({
        merchant_code: testId,
        name: businessNameEn, 
        merchant_type: 'individual', 
        business_name_en: businessNameEn,
        business_name_ar: 'تاجر التحقق'
      }).select().single();
      
      if (!error) {
        merchant = data;
        break;
      }
      
      console.log(`Full Error Object (Code: ${error.code}):`, JSON.stringify(error, null, 2));

      // Handle specific NOT NULL constraint error immediately
      if (error.code === '23502') {
        throw new Error(`❌ DATABASE CONSTRAINT ERROR: ${error.message}. Ensure all legacy NOT NULL columns are provided.`);
      }

      // Retry ONLY on PGRST204 (Schema Cache)
      if (error.code === 'PGRST204') {
        console.log(`... Waiting for PostgREST schema cache (${retries} retries left)...`);
        await new Promise(r => setTimeout(r, 5000));
        retries--;
      } else {
        throw new Error(`Admin merchant insert failed: ${error.message} (Code: ${error.code})`);
      }
    }

    if (!merchant) {
      throw new Error(`❌ POSTGREST SCHEMA CACHE TIMEOUT: The table exists but the API layer does not see the columns yet. 
INSTRUCTION: Please run the following in Supabase SQL Editor to force a reload:
NOTIFY pgrst, 'reload schema';
Then wait 30 seconds and rerun this verifier before locking.`);
    }
    testMerchantId = merchant.id;
    console.log('✅ Admin Merchant write successful.');

    // Children inserts
    const { error: peErr } = await adminDb.from('merchant_performance_events').insert({
      merchant_id: testMerchantId,
      event_type: 'verification_test'
    });
    assert(!peErr, `Performance event insert failed: ${peErr?.message}`);
    console.log('✅ Performance event insert successful.');

    const { data: msg, error: msgErr } = await adminDb.from('outbound_messages').insert({
      recipient: 'verify@example.com',
      channel: 'email',
      rendered_body: 'Isolation test',
      status: 'draft'
    }).select().single();
    assert(!msgErr, `Outbound message insert failed: ${msgErr?.message}`);
    testMessageId = msg!.id;
    console.log('✅ Outbound message insert successful.');
    
    // Verify isolation
    const { data: msgCheck } = await adminDb.from('outbound_messages').select('*').eq('id', testMessageId).single();
    assert(msgCheck!.status === 'draft' && !msgCheck!.sent_at && !msgCheck!.provider_message_id, 'ISOLATION BREACH: Message status changed!');
    console.log('✅ Isolation verified: Message remains in "draft" status.');

    // 5. Final Cleanup Verification
    console.log('\n[5] Cleaning Up Synthetic Data...');
    if (testMerchantId) {
      await adminDb.from('merchant_performance_events').delete().eq('merchant_id', testMerchantId);
      await adminDb.from('platform_events').delete().eq('merchant_id', testMerchantId);
      await adminDb.from('merchants').delete().eq('id', testMerchantId);
    }
    if (testMessageId) {
      await adminDb.from('outbound_messages').delete().eq('id', testMessageId);
    }
    
    // Double check cleanup
    const { data: cleanupCheck } = await adminDb.from('merchants').select('id').eq('merchant_code', testId);
    assert(cleanupCheck!.length === 0, 'Cleanup failed: Synthetic data still persists.');
    console.log('✅ Synthetic data purged successfully.');

    console.log('\n[VERDICT] SUCCESS: Batch 4A Intelligence Foundation locked.');

  } catch (err: any) {
    console.error(`\n${err.message}`);
    process.exit(1);
  } finally {
    // Extra safety cleanup if something failed before the try block cleanup
    if (testMerchantId || testMessageId) {
      console.log('--- RUNNING FINALLY CLEANUP ---');
      try {
        if (testMerchantId) {
           await adminDb.from('merchant_performance_events').delete().eq('merchant_id', testMerchantId);
           await adminDb.from('platform_events').delete().eq('merchant_id', testMerchantId);
           await adminDb.from('merchants').delete().eq('id', testMerchantId);
        }
        if (testMessageId) {
           await adminDb.from('outbound_messages').delete().eq('id', testMessageId);
        }
      } catch (e) {}
    }
  }
}

verifyBatch4A().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
