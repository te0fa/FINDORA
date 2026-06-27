import { createAdminClient } from './customers';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('DAL:performance')

export type RequestStageClock = {
  request_id: string;
  request_code: string;
  canonical_state: string;
  current_status: string | null;
  current_stage_code: string;
  current_stage_entered_at: string | null;
  last_transition_at: string | null;
  stage_age_minutes: number | null;
  stage_age_hours: number | null;
  is_active_work: boolean;
};

/**
 * Retrieves the stage clock metrics for a specific request.
 */
export async function getRequestStageClock(requestId: string): Promise<RequestStageClock | null> {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('v_request_stage_clock')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) {
    log.error(`Error fetching stage clock for ${requestId}:`, error.message);
    return null;
  }

  return data as RequestStageClock;
}

/**
 * Retrieves stage clock metrics for a batch of requests.
 */
export async function getBatchStageClocks(requestIds: string[]): Promise<RequestStageClock[]> {
  if (!requestIds.length) return [];
  
  const db = await createAdminClient();
  const { data, error } = await db
    .from('v_request_stage_clock')
    .select('*')
    .in('request_id', requestIds);

  if (error) {
    log.error('Error fetching batch stage clocks:', error.message);
    return [];
  }

  return data as RequestStageClock[];
}

/**
 * Retrieves all active work stage clocks.
 */
export async function getActiveWorkStageClocks(): Promise<RequestStageClock[]> {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('v_request_stage_clock')
    .select('*')
    .eq('is_active_work', true)
    .order('stage_age_minutes', { ascending: false });

  if (error) {
    log.error('Error fetching active work stage clocks:', error.message);
    return [];
  }

  return data as RequestStageClock[];
}

export type SlaMonitoring = RequestStageClock & {
  urgency_level: string;
  sla_warning_threshold_hours: number;
  sla_breach_threshold_hours: number;
  time_to_breach_hours: number;
  sla_status: 'on_time' | 'warning' | 'breached';
};

export type QueueMetrics = {
  current_stage_code: string;
  sla_status: string;
  request_count: number;
  avg_stage_age_hours: number;
};

/**
 * Retrieves SLA monitoring metrics for active requests.
 */
export async function getActiveSlaMonitoring(): Promise<SlaMonitoring[]> {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('v_request_sla_monitoring')
    .select('*')
    .order('time_to_breach_hours', { ascending: true }); // Prioritize breached/at-risk

  if (error) {
    log.error('Error fetching SLA monitoring:', error.message);
    return [];
  }

  return data as SlaMonitoring[];
}

/**
 * Retrieves global queue performance metrics.
 */
export async function getQueuePerformanceMetrics(): Promise<QueueMetrics[]> {
  const db = await createAdminClient();
  const { data, error } = await db
    .from('v_queue_performance_metrics')
    .select('*');

  if (error) {
    log.error('Error fetching queue metrics:', error.message);
    return [];
  }

  return data as QueueMetrics[];
}
