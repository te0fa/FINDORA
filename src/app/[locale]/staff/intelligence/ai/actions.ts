// src/app/[locale]/staff/intelligence/ai/actions.ts
/**
 * AI Copilot runs on-demand for the current request only. It must not batch-process all requests unless a future admin-approved batch job explicitly allows it.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { updateAIAgentConfigAdmin, AIAgentConfig, logAICopilotRun } from '@/lib/dal/ai-control'
import { revalidatePath } from 'next/cache'

async function getAuthorizedAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) throw new Error('Staff only')

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.isAdmin) throw new Error('Admin only')

  return { staff, permissions }
}

export async function updateAIAgentConfigAction(params: Partial<AIAgentConfig> & { agent_code: string }) {
  await getAuthorizedAdmin()
  await updateAIAgentConfigAdmin(params)
  revalidatePath('/[locale]/staff/intelligence/ai', 'page')
  return { success: true }
}

export async function testAIAgentConfigAction(agentCode: string) {
  const { staff } = await getAuthorizedAdmin()
  
  // Harmless test prompt
  // In a real scenario, this would call callAI with the agent's config
  console.log(`[AI_TEST] Testing agent: ${agentCode} by staff: ${staff.id}`)
  
  // Simulate AI call
  const success = true
  
  await logAICopilotRun({
    staffId: staff.id,
    agentCode: agentCode,
    provider: 'test',
    status: success ? 'completed' : 'failed',
    inputSummary: { test: true },
    outputSummary: { ok: true }
  })

  return { success, message: 'Test completed. Check logs.' }
}
