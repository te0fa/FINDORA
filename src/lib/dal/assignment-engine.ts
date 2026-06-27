import { createAdminClient } from './customers'
import { getAdminGlobalStats, getStaffUiPermissions, StaffMemberLite } from './staff'

export type AssignmentStage = 'intake' | 'operations' | 'reporting' | 'quality' | 'payment'

export async function getEligibleStaffForStage(stage: AssignmentStage): Promise<StaffMemberLite[]> {
  const adminClient = await createAdminClient()
  
  // Fetch active staff
  const { data: staff, error } = await adminClient
    .from('staff_members')
    .select('*, roles:staff_member_roles!staff_member_id(role_code, is_active)')
    .eq('is_active', true)
    
  if (error) throw new Error(error.message)
  
  return (staff as any[]).filter(s => {
    const permissions = getStaffUiPermissions({
      ...s,
      extra_roles: (s.roles || []).filter((r: any) => r.is_active).map((r: any) => r.role_code)
    })
    
    switch (stage) {
      case 'intake': return permissions.isIntakeReviewer
      case 'operations': return permissions.isSourcingResearcher
      case 'reporting': return permissions.isReportBuilder
      case 'quality': return permissions.isQualityReviewer
      case 'payment': return permissions.isPaymentReviewer
      default: return false
    }
  })
}

export async function autoAssignRequestToStaff(requestId: string, stage: AssignmentStage, assignedByStaffId?: string) {
  const eligible = await getEligibleStaffForStage(stage)
  
  if (eligible.length === 0) {
    throw new Error(`No eligible staff members found for stage: ${stage}`)
  }
  
  // Calculate workload for each eligible staff
  const workloadPromises = eligible.map(async (s) => {
    const stats = await getAdminGlobalStats(s.id, s.auth_user_id)
    return { staffId: s.id, workload: stats.actionableLoad }
  })
  
  const workloads = await Promise.all(workloadPromises)
  
  // Sort by lowest workload
  workloads.sort((a, b) => a.workload - b.workload)
  
  const winner = workloads[0].staffId
  
  return manualAssignRequestToStaff(requestId, stage, winner, assignedByStaffId)
}

export async function manualAssignRequestToStaff(
  requestId: string, 
  stage: AssignmentStage, 
  staffId: string, 
  assignedByStaffId?: string
) {
  const adminClient = await createAdminClient()
  
  const columnMap: Record<AssignmentStage, string> = {
    intake: 'assigned_reviewer_staff_id',
    operations: 'assigned_ops_staff_id',
    reporting: 'assigned_reporter_staff_id',
    quality: 'assigned_quality_staff_id',
    payment: 'assigned_payment_staff_id'
  }
  
  const update: any = {
    [columnMap[stage]]: staffId
  }
  
  // Intake has specific legacy status/timestamp fields
  if (stage === 'intake') {
    update.reviewer_assignment_status = 'assigned'
    update.reviewer_assigned_at = new Date().toISOString()
    update.reviewer_assigned_by_staff_id = assignedByStaffId || null
  }
  
  const { data, error } = await adminClient
    .from('requests')
    .update(update)
    .eq('id', requestId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  
  // Log to history
  await adminClient.from('request_status_history').insert({
    request_id: requestId,
    transition_name: `ASSIGNMENT_UPDATED_${stage.toUpperCase()}`,
    changed_by_staff_id: assignedByStaffId || null,
    change_reason: `Request assigned to staff member for ${stage} stage`,
    metadata: { stage, assigned_staff_id: staffId },
    event_source: 'staff_action'
  } as any)
  
  return data
}
