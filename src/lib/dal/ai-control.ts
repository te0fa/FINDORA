// src/lib/dal/ai-control.ts
import { createAdminClient } from './customers'
import { getAIConfig } from '../ai/provider'

export interface AIAgentConfig {
  id?: string;
  agent_code: string;
  enabled: boolean;
  provider: string;
  model: string | null;
  temperature: number;
  max_tokens: number;
  daily_limit: number;
  monthly_limit: number;
  max_search_results: number;
  allow_create_draft: boolean;
  allow_create_research_items: boolean;
  allow_suggest_report_snapshots: boolean;
  prompt_version: string;
  safety_level: string;
}

/**
 * Returns default fallback config for an agent based on environment variables.
 */
function getFallbackConfig(agentCode: string): AIAgentConfig {
  const env = getAIConfig()
  
  // Specific enabled state defaults for initial beta hardening
  const isEnabledByDefault = [
    'intake_reviewer', 
    'pricing_advisor', 
    'trust_safety_checker'
  ].includes(agentCode) && env.enabled

  return {
    agent_code: agentCode,
    enabled: isEnabledByDefault,
    provider: env.provider,
    model: env.model,
    temperature: 0.2,
    max_tokens: 1500,
    daily_limit: 100,
    monthly_limit: 1000,
    max_search_results: 10,
    allow_create_draft: true,
    allow_create_research_items: false,
    allow_suggest_report_snapshots: false,
    prompt_version: 'v1',
    safety_level: 'strict'
  }
}

/**
 * Staff/Admin only: Get all agent configs.
 */
export async function getAIAgentConfigsAdmin(): Promise<AIAgentConfig[]> {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('ai_agent_configs')
      .select('*')
      .order('agent_code', { ascending: true })

    if (error || !data || data.length === 0) {
      // Fallback to defaults if table missing or empty
      const codes = [
        'intake_reviewer', 'pricing_advisor', 'research_planner', 
        'research_retriever', 'report_writer', 'communication_drafter', 
        'trust_safety_checker', 'dashboard_insights'
      ]
      return codes.map(code => getFallbackConfig(code))
    }

    return data as AIAgentConfig[]
  } catch (err) {
    console.warn('[AI_CONTROL] Failed to fetch configs, falling back to defaults.', err)
    const codes = [
      'intake_reviewer', 'pricing_advisor', 'research_planner', 
      'research_retriever', 'report_writer', 'communication_drafter', 
      'trust_safety_checker', 'dashboard_insights'
    ]
    return codes.map(code => getFallbackConfig(code))
  }
}

/**
 * Get config for a specific agent.
 */
export async function getAIAgentConfigAdmin(agentCode: string): Promise<AIAgentConfig> {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('ai_agent_configs')
      .select('*')
      .eq('agent_code', agentCode)
      .maybeSingle()

    if (error || !data) return getFallbackConfig(agentCode)
    return data as AIAgentConfig
  } catch (err) {
    return getFallbackConfig(agentCode)
  }
}

/**
 * Update agent config.
 */
export async function updateAIAgentConfigAdmin(params: Partial<AIAgentConfig> & { agent_code: string }) {
  const db = await createAdminClient()
  const { error } = await db
    .from('ai_agent_configs')
    .upsert({
      ...params,
      updated_at: new Date().toISOString()
    }, { onConflict: 'agent_code' })

  if (error) throw new Error(error.message)
}

/**
 * Logs a copilot run.
 */
export async function logAICopilotRun(params: {
  requestId?: string | null;
  staffId?: string | null;
  agentCode: string;
  provider: string;
  model?: string | null;
  inputSummary?: any;
  outputSummary?: any;
  status: 'completed' | 'failed' | 'blocked';
  errorMessage?: string | null;
  tokenEstimate?: number;
  costEstimate?: number;
}) {
  try {
    const db = await createAdminClient()
    const { error } = await db.from('ai_copilot_runs').insert({
      request_id: params.requestId || null,
      staff_id: params.staffId || null,
      agent_code: params.agentCode,
      provider: params.provider,
      model: params.model || null,
      input_summary: params.inputSummary || {},
      output_summary: params.outputSummary || {},
      status: params.status,
      error_message: params.errorMessage || null,
      token_estimate: params.tokenEstimate || 0,
      cost_estimate: params.costEstimate || 0
    })

    if (error) {
      console.warn('[AI_CONTROL] Failed to log run:', error.message)
    }
  } catch (err) {
    console.warn('[AI_CONTROL] Logging error (non-blocking):', err)
  }
}

/**
 * Get latest runs for audit log.
 */
export async function getAICopilotRunsAdmin(limit = 20) {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('ai_copilot_runs')
      .select('*, staff_members(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data
  } catch (err) {
    return []
  }
}

/**
 * Usage summary for dashboard.
 */
export async function getAIUsageSummaryAdmin() {
  try {
    const db = await createAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayRuns, error } = await db
      .from('ai_copilot_runs')
      .select('status, cost_estimate')
      .gte('created_at', today.toISOString())

    if (error || !todayRuns) return { runsToday: 0, costToday: 0, lastError: null }

    const costToday = todayRuns.reduce((sum, run) => sum + (Number(run.cost_estimate) || 0), 0)
    
    // Get last error
    const { data: lastErr } = await db
      .from('ai_copilot_runs')
      .select('error_message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      runsToday: todayRuns.length,
      costToday,
      lastError: lastErr?.error_message || null
    }
  } catch (err) {
    return { runsToday: 0, costToday: 0, lastError: null }
  }
}

/**
 * Check if an AI feature is active, checking both the economy_config flag and limits.
 */
export async function getAIFeatureStatus(featureKey: string): Promise<{
  enabled: boolean;
  status: 'enabled' | 'disabled' | 'restricted';
  reason?: string;
}> {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('economy_config')
      .select('value, status, daily_limit, monthly_limit')
      .eq('config_key', featureKey)
      .maybeSingle()

    if (error || !data) {
      // Default fallback if not found in db (to keep things working initially)
      return { enabled: true, status: 'enabled' }
    }

    const valueStr = String(data.value)
    const isValueTrue = valueStr === 'true' || valueStr === '"true"' || data.value === true
    const status = (data.status || 'enabled') as 'enabled' | 'disabled' | 'restricted'

    if (status === 'disabled' || !isValueTrue) {
      return { enabled: false, status: 'disabled', reason: 'Feature is disabled by AI Manager' }
    }

    // Now check limits if status is restricted or limits are set
    const dailyLimit = data.daily_limit
    const monthlyLimit = data.monthly_limit

    if (dailyLimit !== null || monthlyLimit !== null) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Daily checks
      if (dailyLimit !== null) {
        const { count, error: dailyErr } = await db
          .from('ai_usage_log')
          .select('id', { count: 'exact', head: true })
          .eq('feature_key', featureKey)
          .gte('timestamp', today.toISOString())

        if (!dailyErr && count !== null && count >= dailyLimit) {
          return { enabled: false, status: 'restricted', reason: `Daily limit of ${dailyLimit} requests reached` }
        }
      }

      // Monthly checks
      if (monthlyLimit !== null) {
        const { count, error: monthlyErr } = await db
          .from('ai_usage_log')
          .select('id', { count: 'exact', head: true })
          .eq('feature_key', featureKey)
          .gte('timestamp', firstOfMonth.toISOString())

        if (!monthlyErr && count !== null && count >= monthlyLimit) {
          return { enabled: false, status: 'restricted', reason: `Monthly limit of ${monthlyLimit} requests reached` }
        }
      }
    }

    return { enabled: true, status }
  } catch (err) {
    console.warn(`[AI_CONTROL] Error checking feature status for ${featureKey}:`, err)
    return { enabled: true, status: 'enabled' }
  }
}

/**
 * Log an AI invocation in the ai_usage_log table.
 */
export async function logAIFeatureUsage(params: {
  featureKey: string;
  success: boolean;
  estimatedCost?: number;
  errorMessage?: string | null;
  metadata?: any;
}) {
  try {
    const db = await createAdminClient()
    await db.from('ai_usage_log').insert({
      feature_key: params.featureKey,
      success: params.success,
      estimated_cost: params.estimatedCost || 0,
      error_message: params.errorMessage || null,
      metadata: params.metadata || {}
    })
  } catch (err) {
    console.warn('[AI_CONTROL] Failed to log usage in ai_usage_log:', err)
  }
}

/**
 * Fetch the 8 AI features and their configs from economy_config.
 */
export async function getAIFeaturesConfig(): Promise<any[]> {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('economy_config')
      .select('config_key, value, status, daily_limit, monthly_limit, description_en, description_ar')
      .like('config_key', 'flag_ai_%')
      .order('config_key', { ascending: true })

    if (error || !data) return []
    return data
  } catch (err) {
    console.warn('[AI_CONTROL] Failed to fetch economy configs.', err)
    return []
  }
}

/**
 * Update a specific AI feature config.
 */
export async function updateAIFeatureConfig(featureKey: string, params: {
  status?: 'enabled' | 'disabled' | 'restricted';
  daily_limit?: number | null;
  monthly_limit?: number | null;
  value?: string;
}) {
  const db = await createAdminClient()
  const updates: any = { updated_at: new Date().toISOString() }
  if (params.status !== undefined) updates.status = params.status
  if (params.daily_limit !== undefined) updates.daily_limit = params.daily_limit
  if (params.monthly_limit !== undefined) updates.monthly_limit = params.monthly_limit
  if (params.value !== undefined) updates.value = params.value

  const { error } = await db
    .from('economy_config')
    .update(updates)
    .eq('config_key', featureKey)

  if (error) throw new Error(error.message)
}

/**
 * Fetch recent AI usage logs.
 */
export async function getAIFeatureLogs(limit = 50): Promise<any[]> {
  try {
    const db = await createAdminClient()
    const { data, error } = await db
      .from('ai_usage_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data
  } catch (err) {
    console.warn('[AI_CONTROL] Failed to fetch usage logs.', err)
    return []
  }
}

/**
 * Fetch global consumption metrics for the 8 features today.
 */
export async function getAIFeatureUsageSummary() {
  try {
    const db = await createAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayLogs, error } = await db
      .from('ai_usage_log')
      .select('estimated_cost, success')
      .gte('timestamp', today.toISOString())

    if (error || !todayLogs) return { runsToday: 0, costToday: 0 }

    const runsToday = todayLogs.length
    const costToday = todayLogs.reduce((sum, log) => sum + (Number(log.estimated_cost) || 0), 0)

    return { runsToday, costToday }
  } catch (err) {
    return { runsToday: 0, costToday: 0 }
  }
}

/**
 * Fetch staff list with primary and extra roles.
 */
export async function getStaffListWithRoles(): Promise<any[]> {
  const db = await createAdminClient()
  const { data: staff, error } = await db
    .from('staff_members')
    .select('id, full_name, staff_role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error || !staff) return []

  const { data: extraRoles } = await db
    .from('staff_member_roles')
    .select('staff_member_id, role_code')
    .eq('is_active', true)

  const rolesMap = (extraRoles || []).reduce((acc: any, r: any) => {
    if (!acc[r.staff_member_id]) acc[r.staff_member_id] = []
    acc[r.staff_member_id].push(r.role_code)
    return acc
  }, {})

  return staff.map((s: any) => ({
    ...s,
    roles: [s.staff_role, ...(rolesMap[s.id] || [])].filter(Boolean)
  }))
}

/**
 * Assign AI Manager role to a staff member.
 */
export async function assignAIManagerRole(staffMemberId: string) {
  const db = await createAdminClient()
  
  const { data: existing } = await db
    .from('staff_member_roles')
    .select('id, is_active')
    .eq('staff_member_id', staffMemberId)
    .eq('role_code', 'ai_manager')
    .maybeSingle()

  if (existing) {
    if (!existing.is_active) {
      const { error } = await db
        .from('staff_member_roles')
        .update({ is_active: true, updated_at: new Date().toISOString() } as any)
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    }
  } else {
    const { error } = await db
      .from('staff_member_roles')
      .insert({
        staff_member_id: staffMemberId,
        role_code: 'ai_manager',
        is_active: true
      })
    if (error) throw new Error(error.message)
  }
}

/**
 * Revoke AI Manager role from a staff member.
 */
export async function revokeAIManagerRole(staffMemberId: string) {
  const db = await createAdminClient()
  const { error } = await db
    .from('staff_member_roles')
    .update({ is_active: false, updated_at: new Date().toISOString() } as any)
    .eq('staff_member_id', staffMemberId)
    .eq('role_code', 'ai_manager')
  
  if (error) throw new Error(error.message)
}
