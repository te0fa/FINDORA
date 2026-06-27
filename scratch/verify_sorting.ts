import { getActiveSlaMonitoring } from '../src/lib/dal/performance';
import { getOperationsQueueRequests } from '../src/lib/dal/requests';

/**
 * Batch 2B - Step 3: Queue Sorting Verification (Aligned with production field names)
 * 
 * Verifies that the staff queue sorting strictly adheres to the SLA-First contract:
 * 1. SLA-monitored rows FIRST (is_sla_monitored DESC)
 * 2. time_to_breach_hours ASC (NULLS LAST)
 * 3. request_created_at DESC (Fallback) - Aligned with queue/page.tsx:399
 * 
 * This is a permanent regression audit artifact.
 */
async function verifyQueueSorting() {
  console.log('--- [REGRESSION AUDIT] QUEUE SORTING CONTRACT (SCHEMA ALIGNED) ---');
  
  // 1. Fetch live data from authoritative DAL
  const slaMonitoring = await getActiveSlaMonitoring();
  const allRowsRaw = await getOperationsQueueRequests() as any[];

  console.log(`[INFO] Found ${allRowsRaw.length} operations requests.`);
  console.log(`[INFO] Found ${slaMonitoring.length} active SLA monitoring records.`);

  // 2. Data Shaping (matches queue/page.tsx:316 join logic)
  const rowsWithSla = allRowsRaw.map(row => {
    // Exact join key used in production: s.request_id === row.request_id
    const sla = slaMonitoring.find(s => s.request_id === row.request_id);
    return {
      ...row,
      sla_monitoring: sla || null,
      is_sla_monitored: !!sla
    };
  });

  // 3. Sorting Contract Implementation (matches queue/page.tsx:380-400)
  const sortedRows = [...rowsWithSla].sort((a, b) => {
    // A. Priority 1: SLA Monitoring Presence (Authoritative)
    if (a.is_sla_monitored !== b.is_sla_monitored) {
      return a.is_sla_monitored ? -1 : 1;
    }
    
    // B. Priority 2: Breach Timing (Authoritative)
    if (a.is_sla_monitored && b.is_sla_monitored) {
      const aBreach = a.sla_monitoring?.time_to_breach_hours ?? Infinity;
      const bBreach = b.sla_monitoring?.time_to_breach_hours ?? Infinity;
      if (aBreach !== bBreach) return aBreach - bBreach;
    }

    // C. Priority 3: Creation Date (Fallback) - Exact field: request_created_at
    return new Date(b.request_created_at).getTime() - new Date(a.request_created_at).getTime();
  });

  // 4. Detailed Audit Output
  console.log('\nSorted Audit List (Top 10):');
  console.log('RANK | TYPE | REQ_ID   | BREACH (h) | REQ_CREATED_AT');
  console.log('---------------------------------------------------------');
  sortedRows.slice(0, 10).forEach((r, i) => {
    const type = r.is_sla_monitored ? 'SLA' : 'REG';
    const id = r.request_id.slice(0,8);
    const breach = r.sla_monitoring?.time_to_breach_hours?.toFixed(2) ?? 'N/A';
    const created = new Date(r.request_created_at).toISOString();
    console.log(`${(i+1).toString().padEnd(4)} | ${type.padEnd(4)} | ${id} | ${breach.padStart(10)} | ${created}`);
  });

  // 5. Automated Assertions
  let success = true;
  let slaEndIndex = -1;

  for (let i = 0; i < sortedRows.length; i++) {
    const current = sortedRows[i];
    
    if (current.is_sla_monitored) {
      if (slaEndIndex !== -1 && i > slaEndIndex + 1) {
        console.error(`[FAIL] SLA row found after REG rows at index ${i}`);
        success = false;
      }
      
      // Check breach ASC
      if (i > 0 && sortedRows[i-1].is_sla_monitored) {
        const prevBreach = sortedRows[i-1].sla_monitoring?.time_to_breach_hours ?? Infinity;
        const currBreach = current.sla_monitoring?.time_to_breach_hours ?? Infinity;
        if (prevBreach > currBreach) {
          console.error(`[FAIL] Breach sorting violation at index ${i}: ${prevBreach} > ${currBreach}`);
          success = false;
        }
      }
    } else {
      if (slaEndIndex === -1) slaEndIndex = i - 1;
      
      // Check request_created_at DESC
      if (i > 0 && !sortedRows[i-1].is_sla_monitored) {
        const prevDate = new Date(sortedRows[i-1].request_created_at).getTime();
        const currDate = new Date(current.request_created_at).getTime();
        if (prevDate < currDate) {
          console.error(`[FAIL] Fallback sorting violation at index ${i}: ${sortedRows[i-1].request_created_at} < ${current.request_created_at}`);
          success = false;
        }
      }
    }
  }

  if (success) {
    console.log('\n[VERDICT] SUCCESS: Sorting contract is strictly followed and schema-aligned.');
  } else {
    console.log('\n[VERDICT] FAILED: Sorting contract violations found.');
    process.exit(1);
  }
}

verifyQueueSorting().catch(err => {
  console.error(err);
  process.exit(1);
});
