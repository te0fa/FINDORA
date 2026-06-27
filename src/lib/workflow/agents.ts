// src/lib/workflow/agents.ts
import { createAdminClient } from '@/lib/dal/customers';
import { executeOnlineResearch } from '@/lib/agents/research/run-online-research';
import crypto from 'node:crypto';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('workflow/agents')

export async function dispatchResearchAgents(request: any): Promise<void> {
  const adminClient = await createAdminClient();

  // Run async
  (async () => {
    try {
      log.info(`[AGENT_DISPATCHER] Starting agent dispatch for request ${request.id}`);

      // 1. Create a job for the Online Research Agent in the database
      const onlineJobId = crypto.randomUUID();
      const { error: jobErr } = await adminClient
        .from('agent_jobs')
        .insert({
          id: onlineJobId,
          request_id: request.id,
          job_type: 'online_research',
          status: 'running',
          created_at: new Date().toISOString()
        } as any);

      if (jobErr) {
        log.warn("[AGENT_DISPATCH_WARN] Failed to insert online job, running agent directly:", jobErr.message);
      }

      // Execute Online Research Agent (Async background)
      executeOnlineResearch(onlineJobId, request.id)
        .then(res => {
          log.info(`[ONLINE_RESEARCH_COMPLETED] Request: ${request.id}, Success: ${res.success}`);
        })
        .catch(err => {
          log.error(`[ONLINE_RESEARCH_FAILED] Request: ${request.id}`, err);
        });

      // 2. Conditionally trigger Field Agent IF images exist OR preferred location exists
      const hasImages = !!request.reference_image_path || request.has_reference_image;
      const hasLocation = !!request.preferred_governorate || !!request.preferred_area;

      if (hasImages || hasLocation) {
        log.info(`[FIELD_AGENT_TRIGGERED] Request ${request.id} has physical requirements (Images: ${hasImages}, Location: ${hasLocation}).`);
        
        const fieldJobId = crypto.randomUUID();
        const { error: fieldJobErr } = await adminClient
          .from('agent_jobs')
          .insert({
            id: fieldJobId,
            request_id: request.id,
            job_type: 'offline_sourcing',
            status: 'queued',
            created_at: new Date().toISOString()
          } as any);
        if (fieldJobErr) {
          log.warn("[AGENT_DISPATCH_WARN] Failed to insert field job:", fieldJobErr.message);
        }

        log.info(`[FIELD_AGENT_DISPATCHED] Offline sourcing job queued for request ${request.id}`);
      }

      log.info("[AGENTS_DISPATCHED]", request.id);

    } catch (err: any) {
      log.error("[AGENT_DISPATCH_FAILED] Critical error during dispatching:", err.message);
    }
  })();
}
