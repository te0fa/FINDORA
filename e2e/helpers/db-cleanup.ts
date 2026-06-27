import { createAdminClient } from '../../src/lib/dal/customers';

/**
 * Cleanup helper for E2E tests.
 * Safely archives test requests to maintain DB hygiene while preserving audit history.
 */
export async function archiveTestRequest(requestCode: string) {
  if (!requestCode) return;

  console.log('[CLEANUP] archiveTestRequest called for', requestCode);
  try {
    const adminClient = await createAdminClient();

    // 1. Find the request and verify it's a test request
    const { data: request, error: findError } = await adminClient
      .from('requests')
      .select('id, title')
      .eq('request_code', requestCode)
      .single();

    if (findError || !request) {
      console.warn(`[CLEANUP] Could not find request ${requestCode} for cleanup.`);
      return;
    }

    if (!request.title || (!request.title.startsWith('[E2E_TEST]') && !request.title.startsWith('[E2E_TEST_STAFF_MUTATION]'))) {
      console.warn(`[CLEANUP] Request ${requestCode} is not a test request (Title: ${request.title}). Skipping.`);
      return;
    }

    // 2. Archive it
    const { error: updateError } = await adminClient
      .from('requests')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: 'E2E public browser test cleanup'
      })
      .eq('id', request.id);

    if (updateError) {
      console.error(`[CLEANUP] Failed to archive request ${requestCode}:`, updateError.message);
    } else {
      console.log(`[CLEANUP] Successfully archived test request ${requestCode}.`);
    }
  } catch (err) {
    console.error(`[CLEANUP] Unexpected error during cleanup of ${requestCode}:`, err);
  }
}
