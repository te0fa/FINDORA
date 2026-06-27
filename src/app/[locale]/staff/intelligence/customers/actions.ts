'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import { createAdminClient } from '@/lib/dal/customers';

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const staff = await getStaffMemberByAuthUserId(user.id);
  const perms = staff ? getStaffUiPermissions(staff) : null;
  
  if (!perms?.isAdmin && !perms?.canAccessDashboard) {
    throw new Error('Forbidden: Unauthorized staff member');
  }
  return { staff, perms };
}

export async function toggleCustomerSegmentAction(
  customerId: string,
  segmentCode: string,
  shouldExist: boolean,
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  if (shouldExist) {
    const { error } = await client
      .from('customer_segments')
      .upsert(
        { customer_id: customerId, segment_code: segmentCode.toUpperCase() },
        { onConflict: 'customer_id,segment_code' }
      );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('customer_segments')
      .delete()
      .eq('customer_id', customerId)
      .eq('segment_code', segmentCode.toUpperCase());
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/customers`);
  revalidatePath(`/${locale}/staff/intelligence/customers/${customerId}`);
  return { success: true };
}

export async function saveCustomerDiscoveryInterviewAction(
  customerId: string,
  data: {
    what_wanted_to_buy?: string;
    how_searches_currently?: string;
    biggest_frustration?: string;
    will_pay?: boolean;
    potential_commission_egp?: number;
    additional_notes?: string;
    visited_pages?: string;
    used_features?: string;
  },
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('customer_discovery_interviews')
    .insert({
      customer_id: customerId,
      interviewer_id: staff?.id || null,
      what_wanted_to_buy: data.what_wanted_to_buy,
      how_searches_currently: data.how_searches_currently,
      biggest_frustration: data.biggest_frustration,
      will_pay: !!data.will_pay,
      potential_commission_egp: data.potential_commission_egp || 0.00,
      additional_notes: data.additional_notes,
      visited_pages: data.visited_pages,
      used_features: data.used_features
    });

  if (error) throw new Error(error.message);

  // Recalculate customer scoring and snapshot
  try {
    const { createCustomerScoreSnapshot } = await import('@/lib/dal/scoring/customer-scoring');
    await createCustomerScoreSnapshot(customerId);
  } catch (err: any) {
    console.error('Failed to update scoring snapshot:', err.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/customers`);
  revalidatePath(`/${locale}/staff/intelligence/customers/${customerId}`);
  return { success: true };
}

export async function saveMerchantDiscoveryStudyAction(
  merchantId: string,
  data: {
    specialization?: string;
    estimated_daily_customers?: number;
    biggest_selling_challenge?: string;
    accepts_commission?: boolean;
    accepts_bidding?: boolean;
    conversion_hook?: string;
  },
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('merchant_discovery_studies')
    .insert({
      merchant_id: merchantId,
      researcher_id: staff?.id || null,
      specialization: data.specialization,
      estimated_daily_customers: data.estimated_daily_customers || 0,
      biggest_selling_challenge: data.biggest_selling_challenge,
      accepts_commission: !!data.accepts_commission,
      accepts_bidding: !!data.accepts_bidding,
      conversion_hook: data.conversion_hook
    });

  if (error) throw new Error(error.message);

  // Recalculate merchant scoring and snapshot
  try {
    const { createMerchantScoreSnapshot } = await import('@/lib/dal/scoring/merchant-scoring');
    await createMerchantScoreSnapshot(merchantId);
  } catch (err: any) {
    console.error('Failed to update merchant scoring snapshot:', err.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/merchants`);
  revalidatePath(`/${locale}/staff/intelligence/merchants/${merchantId}`);
  return { success: true };
}

export async function saveCompanyExperimentAction(
  data: {
    id?: string;
    title: string;
    hypothesis?: string;
    methodology?: string;
    status: string;
    impact_analysis?: string;
  },
  locale: string
) {
  const { perms, staff } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage company experiments.');

  const client = await createAdminClient() as any;

  if (data.id) {
    // Update
    const { error } = await client
      .from('company_experiments')
      .update({
        title: data.title,
        hypothesis: data.hypothesis,
        methodology: data.methodology,
        status: data.status,
        impact_analysis: data.impact_analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    // Insert
    const { error } = await client
      .from('company_experiments')
      .insert({
        title: data.title,
        hypothesis: data.hypothesis,
        methodology: data.methodology,
        status: data.status,
        impact_analysis: data.impact_analysis,
        created_by_staff_id: staff?.id || null
      });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/experiments`);
  return { success: true };
}

export async function deleteCompanyExperimentAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete company experiments.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('company_experiments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/experiments`);
  return { success: true };
}

export async function saveMarketHealthGoalAction(
  data: {
    specialization: string;
    goal_quotes_per_request?: number;
    goal_response_time_hours?: number;
    goal_merchant_win_rate_pct?: number;
    goal_active_merchants_week?: number;
    goal_request_conversion_rate_pct?: number;
    goal_avg_deal_value_egp?: number;
    shortfalls_comments?: string;
    strength_merchants_comments?: string;
  },
  locale: string
) {
  await checkAuth(); // Ensure authenticated staff
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('market_health_indicators')
    .upsert({
      specialization: data.specialization || 'global',
      goal_quotes_per_request: data.goal_quotes_per_request,
      goal_response_time_hours: data.goal_response_time_hours,
      goal_merchant_win_rate_pct: data.goal_merchant_win_rate_pct,
      goal_active_merchants_week: data.goal_active_merchants_week,
      goal_request_conversion_rate_pct: data.goal_request_conversion_rate_pct,
      goal_avg_deal_value_egp: data.goal_avg_deal_value_egp,
      shortfalls_comments: data.shortfalls_comments,
      strength_merchants_comments: data.strength_merchants_comments,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'specialization'
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/network`);
  return { success: true };
}

export async function saveProjectPhaseAction(
  data: {
    id?: string;
    phase_number: number;
    title_en: string;
    title_ar: string;
    description_en?: string;
    description_ar?: string;
    tip_en?: string;
    tip_ar?: string;
    status: string;
    tags?: string[];
    target_merchants?: number;
    target_customers?: number;
    target_deals?: number;
    target_requests?: number;
    progress_override?: number;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage project phases.');

  const client = await createAdminClient() as any;

  const row = {
    phase_number: data.phase_number,
    title_en: data.title_en,
    title_ar: data.title_ar,
    description_en: data.description_en,
    description_ar: data.description_ar,
    tip_en: data.tip_en,
    tip_ar: data.tip_ar,
    status: data.status,
    tags: data.tags || [],
    target_merchants: data.target_merchants || 0,
    target_customers: data.target_customers || 0,
    target_deals: data.target_deals || 0,
    target_requests: data.target_requests || 0,
    progress_override: data.progress_override === undefined ? null : data.progress_override,
    updated_at: new Date().toISOString()
  };

  if (data.id) {
    const { error } = await client
      .from('project_phases')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('project_phases')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/roadmap`);
  return { success: true };
}

export async function deleteProjectPhaseAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete project phases.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('project_phases')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/roadmap`);
  return { success: true };
}

export async function toggleActionStepAction(stepNumber: number, isCompleted: boolean, locale: string) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('staff_action_steps')
    .update({ is_completed_manual: isCompleted, updated_at: new Date().toISOString() })
    .eq('step_number', stepNumber);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/actions`);
  return { success: true };
}

export async function saveFounderWeeklyLogAction(
  data: {
    hours_built: number;
    customers_contacted: number;
    merchants_contacted: number;
    biggest_achievement?: string;
    blockers?: string;
    distraction_score: number;
    progress_comparison?: string;
  },
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  // Determine start of current week (Monday)
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const weekStartStr = monday.toISOString().split('T')[0];

  const { error } = await client
    .from('founder_weekly_logs')
    .insert({
      staff_id: staff?.id || null,
      week_start_date: weekStartStr,
      hours_built: data.hours_built,
      customers_contacted: data.customers_contacted,
      merchants_contacted: data.merchants_contacted,
      biggest_achievement: data.biggest_achievement,
      blockers: data.blockers,
      distraction_score: data.distraction_score,
      progress_comparison: data.progress_comparison,
      updated_at: new Date().toISOString()
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/founder`);
  return { success: true };
}

export async function saveStaffHrDetailsAction(
  data: {
    staff_id: string;
    phone?: string;
    email?: string;
    base_salary: number;
    commission_pct: number;
    primary_role?: string;
    secondary_roles?: string[];
    performance_rating: number;
    review_notes?: string;
    department_id?: string;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('staff_hr_details')
    .upsert({
      staff_id: data.staff_id,
      phone: data.phone,
      email: data.email,
      base_salary: data.base_salary,
      commission_pct: data.commission_pct,
      primary_role: data.primary_role,
      secondary_roles: data.secondary_roles || [],
      performance_rating: data.performance_rating,
      review_notes: data.review_notes,
      department_id: data.department_id || null,
      updated_at: new Date().toISOString()
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/hr`);
  revalidatePath(`/${locale}/staff/users`);
  return { success: true };
}

export async function saveStaffPerformanceReviewAction(
  data: {
    staff_id: string;
    review_period: string;
    is_manager_review: boolean;
    score_leadership: number;
    score_execution: number;
    score_communication: number;
    score_quality: number;
    achievements?: string;
    weaknesses?: string;
    improvement_plan?: string;
  },
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('staff_performance_reviews')
    .insert({
      staff_id: data.staff_id,
      reviewer_id: staff?.id || null,
      review_period: data.review_period,
      is_manager_review: data.is_manager_review,
      score_leadership: data.score_leadership,
      score_execution: data.score_execution,
      score_communication: data.score_communication,
      score_quality: data.score_quality,
      achievements: data.achievements,
      weaknesses: data.weaknesses,
      improvement_plan: data.improvement_plan
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/hr`);
  revalidatePath(`/${locale}/staff/users`);
  return { success: true };
}

export async function saveStaffDepartmentAction(
  data: {
    id?: string;
    name_en: string;
    name_ar: string;
    manager_id?: string;
    strengths_en?: string;
    strengths_ar?: string;
    weaknesses_en?: string;
    weaknesses_ar?: string;
    challenges_en?: string;
    challenges_ar?: string;
    alert_message_en?: string;
    alert_message_ar?: string;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const row = {
    name_en: data.name_en,
    name_ar: data.name_ar,
    manager_id: data.manager_id || null,
    strengths_en: data.strengths_en,
    strengths_ar: data.strengths_ar,
    weaknesses_en: data.weaknesses_en,
    weaknesses_ar: data.weaknesses_ar,
    challenges_en: data.challenges_en,
    challenges_ar: data.challenges_ar,
    alert_message_en: data.alert_message_en,
    alert_message_ar: data.alert_message_ar,
    updated_at: new Date().toISOString()
  };

  if (data.id) {
    const { error } = await client
      .from('staff_departments')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('staff_departments')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/hr`);
  return { success: true };
}

export async function saveMoatCompetitorThreatAction(
  data: {
    id?: string;
    moat_id: string;
    competitor_name: string;
    threat_description_ar: string;
    threat_description_en: string;
    counter_strategy_ar: string;
    counter_strategy_en: string;
    severity_level: string;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const row = {
    moat_id: data.moat_id,
    competitor_name: data.competitor_name,
    threat_description_ar: data.threat_description_ar,
    threat_description_en: data.threat_description_en,
    counter_strategy_ar: data.counter_strategy_ar,
    counter_strategy_en: data.counter_strategy_en,
    severity_level: data.severity_level
  };

  if (data.id) {
    const { error } = await client
      .from('moat_competitor_threats')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('moat_competitor_threats')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/moat`);
  return { success: true };
}

export async function deleteMoatCompetitorThreatAction(id: string, locale: string) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('moat_competitor_threats')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/moat`);
  return { success: true };
}

export async function saveKillListItemAction(
  data: {
    id?: string;
    title_en: string;
    title_ar: string;
    reason_en: string;
    reason_ar: string;
    target_phase: string;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const row = {
    title_en: data.title_en,
    title_ar: data.title_ar,
    reason_en: data.reason_en,
    reason_ar: data.reason_ar,
    target_phase: data.target_phase
  };

  if (data.id) {
    const { error } = await client
      .from('kill_list_items')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('kill_list_items')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/kill-list`);
  return { success: true };
}

export async function deleteKillListItemAction(id: string, locale: string) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('kill_list_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/kill-list`);
  return { success: true };
}

export async function activateKillListItemAction(
  data: {
    id: string;
    activation_reason_ar: string;
    activation_reason_en: string;
    execution_plan_ar: string;
    execution_plan_en: string;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('kill_list_items')
    .update({
      is_activated: true,
      activation_reason_ar: data.activation_reason_ar,
      activation_reason_en: data.activation_reason_en,
      execution_plan_ar: data.execution_plan_ar,
      execution_plan_en: data.execution_plan_en,
      activated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/kill-list`);
  return { success: true };
}

export async function saveCompetitorAction(
  data: {
    id?: string;
    name_en: string;
    name_ar: string;
    category_en: string;
    category_ar: string;
    strength_rating: number;
    gap_analysis_en?: string;
    gap_analysis_ar?: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage competitors.');

  const client = await createAdminClient() as any;

  const row = {
    name_en: data.name_en,
    name_ar: data.name_ar,
    category_en: data.category_en,
    category_ar: data.category_ar,
    strength_rating: Number(data.strength_rating),
    gap_analysis_en: data.gap_analysis_en || '',
    gap_analysis_ar: data.gap_analysis_ar || ''
  };

  if (data.id) {
    const { error } = await client
      .from('competitors')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('competitors')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/competitors`);
  return { success: true };
}

export async function deleteCompetitorAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete competitors.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('competitors')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/competitors`);
  return { success: true };
}

export async function saveCompetitorComparisonAction(
  data: {
    id?: string;
    competitor_id: string;
    feature_name_en: string;
    feature_name_ar: string;
    status_in_competitor_en: string;
    status_in_competitor_ar: string;
    required_phase_number: number;
    advantage_desc_en: string;
    advantage_desc_ar: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage competitor feature comparisons.');

  const client = await createAdminClient() as any;

  const row = {
    competitor_id: data.competitor_id,
    feature_name_en: data.feature_name_en,
    feature_name_ar: data.feature_name_ar,
    status_in_competitor_en: data.status_in_competitor_en,
    status_in_competitor_ar: data.status_in_competitor_ar,
    required_phase_number: Number(data.required_phase_number),
    advantage_desc_en: data.advantage_desc_en,
    advantage_desc_ar: data.advantage_desc_ar
  };

  if (data.id) {
    const { error } = await client
      .from('competitor_feature_comparisons')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('competitor_feature_comparisons')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/competitors`);
  return { success: true };
}

export async function deleteCompetitorComparisonAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete competitor feature comparisons.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('competitor_feature_comparisons')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/competitors`);
  return { success: true };
}

export async function saveVisionPillarAction(
  data: {
    id?: string;
    title_en: string;
    title_ar: string;
    subtitle_en: string;
    subtitle_ar: string;
    icon?: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage vision pillars.');

  const client = await createAdminClient() as any;

  const row = {
    title_en: data.title_en,
    title_ar: data.title_ar,
    subtitle_en: data.subtitle_en,
    subtitle_ar: data.subtitle_ar,
    icon: data.icon || '🎯'
  };

  if (data.id) {
    const { error } = await client
      .from('vision_pillars')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('vision_pillars')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function deleteVisionPillarAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete vision pillars.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('vision_pillars')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function saveVisionTimelineAction(
  data: {
    id?: string;
    milestone_year: string;
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage vision timeline.');

  const client = await createAdminClient() as any;

  const row = {
    milestone_year: data.milestone_year,
    title_en: data.title_en,
    title_ar: data.title_ar,
    description_en: data.description_en,
    description_ar: data.description_ar
  };

  if (data.id) {
    const { error } = await client
      .from('vision_timeline')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('vision_timeline')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function deleteVisionTimelineAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete vision timeline.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('vision_timeline')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function saveVisionFutureIdeaAction(
  data: {
    id?: string;
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
    target_phase: string;
    icon?: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage vision future ideas.');

  const client = await createAdminClient() as any;

  const row = {
    title_en: data.title_en,
    title_ar: data.title_ar,
    description_en: data.description_en,
    description_ar: data.description_ar,
    target_phase: data.target_phase,
    icon: data.icon || '💡'
  };

  if (data.id) {
    const { error } = await client
      .from('vision_future_ideas')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('vision_future_ideas')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function deleteVisionFutureIdeaAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete vision future ideas.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('vision_future_ideas')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/vision`);
  return { success: true };
}

export async function saveFounderWeeklyReviewAction(
  data: {
    hours_built: number;
    customers_contacted: number;
    merchants_contacted: number;
    biggest_achievement?: string;
    blockers?: string;
    distraction_score: number;
    progress_comparison?: string;
    top_achievements?: string;
    not_done?: string;
    distracted_from_phase?: string;
    next_week_focus?: string;
    progress_rating: number;
  },
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  // Start of current week (Monday)
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const weekStartStr = monday.toISOString().split('T')[0];

  const row = {
    staff_id: staff?.id || null,
    week_start_date: weekStartStr,
    hours_built: Number(data.hours_built),
    customers_contacted: Number(data.customers_contacted),
    merchants_contacted: Number(data.merchants_contacted),
    biggest_achievement: data.biggest_achievement || '',
    blockers: data.blockers || '',
    distraction_score: Number(data.distraction_score),
    progress_comparison: data.progress_comparison || '',
    top_achievements: data.top_achievements || '',
    not_done: data.not_done || '',
    distracted_from_phase: data.distracted_from_phase || '',
    next_week_focus: data.next_week_focus || '',
    progress_rating: Number(data.progress_rating),
    updated_at: new Date().toISOString()
  };

  const { error } = await client
    .from('founder_weekly_logs')
    .insert(row);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/founder`);
  return { success: true };
}

export async function saveFounderAccountabilityItemAction(
  data: {
    id?: string;
    category: string;
    title_en: string;
    title_ar: string;
    details_en?: string;
    details_ar?: string;
    meta_tag?: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage founder accountability items.');

  const client = await createAdminClient() as any;

  const row = {
    category: data.category,
    title_en: data.title_en,
    title_ar: data.title_ar,
    details_en: data.details_en || '',
    details_ar: data.details_ar || '',
    meta_tag: data.meta_tag || '',
    updated_at: new Date().toISOString()
  };

  if (data.id) {
    const { error } = await client
      .from('founder_accountability_items')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('founder_accountability_items')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/founder`);
  return { success: true };
}

export async function deleteFounderAccountabilityItemAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete founder accountability items.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('founder_accountability_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/founder`);
  return { success: true };
}

export async function saveNorthStarConfigAction(
  data: {
    override_requests?: number;
    override_offers?: number;
    override_accepted?: number;
    override_completed?: number;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage North Star metrics.');

  const client = await createAdminClient() as any;

  const promises = [];
  if (data.override_requests !== undefined) {
    promises.push(client.from('north_star_config').upsert({ config_key: 'override_requests', value: Number(data.override_requests), updated_at: new Date().toISOString() }, { onConflict: 'config_key' }));
  }
  if (data.override_offers !== undefined) {
    promises.push(client.from('north_star_config').upsert({ config_key: 'override_offers', value: Number(data.override_offers), updated_at: new Date().toISOString() }, { onConflict: 'config_key' }));
  }
  if (data.override_accepted !== undefined) {
    promises.push(client.from('north_star_config').upsert({ config_key: 'override_accepted', value: Number(data.override_accepted), updated_at: new Date().toISOString() }, { onConflict: 'config_key' }));
  }
  if (data.override_completed !== undefined) {
    promises.push(client.from('north_star_config').upsert({ config_key: 'override_completed', value: Number(data.override_completed), updated_at: new Date().toISOString() }, { onConflict: 'config_key' }));
  }

  const results = await Promise.all(promises);
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/north-star`);
  return { success: true };
}

export async function saveNorthStarGoalAction(
  data: {
    id?: string;
    month_number: number;
    title_en: string;
    title_ar: string;
    target_deals: number;
    status: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage North Star goals.');

  const client = await createAdminClient() as any;

  const row = {
    month_number: Number(data.month_number),
    title_en: data.title_en,
    title_ar: data.title_ar,
    target_deals: Number(data.target_deals),
    status: data.status
  };

  if (data.id) {
    const { error } = await client
      .from('north_star_goals')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('north_star_goals')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/north-star`);
  return { success: true };
}

export async function deleteNorthStarGoalAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete North Star goals.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('north_star_goals')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/north-star`);
  return { success: true };
}

export async function toggleNorthStarGoalStatusAction(id: string, currentStatus: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can change goal status.');

  const client = await createAdminClient() as any;
  const nextStatus = currentStatus === 'achieved' ? 'pending' : 'achieved';

  const { error } = await client
    .from('north_star_goals')
    .update({ status: nextStatus })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/north-star`);
  return { success: true };
}

export async function saveGrowthChannelAction(
  data: {
    id?: string;
    name_en: string;
    name_ar: string;
    status: string;
    cac_en: string;
    cac_ar: string;
    reach_en: string;
    reach_ar: string;
    tip_en: string;
    tip_ar: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage growth channels.');

  const client = await createAdminClient() as any;

  const row = {
    name_en: data.name_en,
    name_ar: data.name_ar,
    status: data.status,
    cac_en: data.cac_en,
    cac_ar: data.cac_ar,
    reach_en: data.reach_en,
    reach_ar: data.reach_ar,
    tip_en: data.tip_en,
    tip_ar: data.tip_ar
  };

  if (data.id) {
    const { error } = await client
      .from('growth_channels')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('growth_channels')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/growth`);
  return { success: true };
}

export async function deleteGrowthChannelAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete growth channels.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('growth_channels')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/growth`);
  return { success: true };
}

export async function saveCrmAdPerformanceAction(
  data: {
    id?: string;
    platform: string;
    reach: number;
    spend: number;
    leads: number;
    clicks: number;
    best_post_desc: string;
    deals: number;
    status: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage CRM Ads.');

  const client = await createAdminClient() as any;

  const row = {
    platform: data.platform,
    reach: Number(data.reach),
    spend: Number(data.spend),
    leads: Number(data.leads),
    clicks: Number(data.clicks),
    best_post_desc: data.best_post_desc || '',
    deals: Number(data.deals),
    status: data.status,
    updated_at: new Date().toISOString()
  };

  if (data.id) {
    const { error } = await client
      .from('crm_ads_performances')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('crm_ads_performances')
      .upsert(row, { onConflict: 'platform' });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/growth`);
  return { success: true };
}

export async function saveGrowthContentPlanAction(
  data: {
    id?: string;
    day_number: number;
    platform: string;
    hook_en: string;
    hook_ar: string;
    body_en: string;
    body_ar: string;
    image_prompt_en?: string;
    image_prompt_ar?: string;
    is_published: boolean;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage content plans.');

  const client = await createAdminClient() as any;

  const row = {
    day_number: Number(data.day_number),
    platform: data.platform,
    hook_en: data.hook_en,
    hook_ar: data.hook_ar,
    body_en: data.body_en,
    body_ar: data.body_ar,
    image_prompt_en: data.image_prompt_en || '',
    image_prompt_ar: data.image_prompt_ar || '',
    is_published: data.is_published
  };

  if (data.id) {
    const { error } = await client
      .from('growth_content_plan')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('growth_content_plan')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/growth`);
  return { success: true };
}

export async function deleteGrowthContentPlanAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete content plans.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('growth_content_plan')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/growth`);
  return { success: true };
}

export async function saveProjectFeatureAction(
  data: {
    id?: string;
    name_en: string;
    name_ar: string;
    phase_number: number;
    status: string;
    notes_en?: string;
    notes_ar?: string;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage features.');

  const client = await createAdminClient() as any;

  const row = {
    name_en: data.name_en,
    name_ar: data.name_ar,
    phase_number: data.phase_number,
    status: data.status,
    notes_en: data.notes_en || null,
    notes_ar: data.notes_ar || null,
    updated_at: new Date().toISOString()
  };

  if (data.id) {
    const { error } = await client
      .from('project_features')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('project_features')
      .insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/features`);
  return { success: true };
}

export async function deleteProjectFeatureAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete features.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('project_features')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/features`);
  return { success: true };
}

export async function saveDataMoatMetricsAction(
  data: {
    recorded_date: string;
    collected_prices: number;
    unique_products: number;
    verified_merchants: number;
    real_reviews: number;
    completed_deals: number;
    negotiation_data: number;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage data moat metrics.');

  const client = await createAdminClient() as any;

  const row = {
    recorded_date: data.recorded_date,
    collected_prices: Number(data.collected_prices),
    unique_products: Number(data.unique_products),
    verified_merchants: Number(data.verified_merchants),
    real_reviews: Number(data.real_reviews),
    completed_deals: Number(data.completed_deals),
    negotiation_data: Number(data.negotiation_data),
    updated_at: new Date().toISOString()
  };

  const { error } = await client
    .from('data_moat_weekly_metrics')
    .upsert(row, { onConflict: 'recorded_date' });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/moat`);
  revalidatePath(`/${locale}/staff/intelligence/moat/tracker`);
  return { success: true };
}

export async function saveProductAction(
  data: {
    id?: string;
    title: string;
    brand: string;
    category: string;
    current_price: number;
    source: string;
    specifications: Record<string, string>;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can manage products.');

  const client = await createAdminClient() as any;

  let oldPrice = 0;
  if (data.id) {
    const { data: existing } = await client
      .from('products')
      .select('current_price')
      .eq('id', data.id)
      .maybeSingle();
    if (existing) {
      oldPrice = Number(existing.current_price);
    }
  }

  const row = {
    title: data.title,
    brand: data.brand,
    category: data.category,
    current_price: Number(data.current_price),
    source: data.source,
    specifications: data.specifications || {},
    last_updated: new Date().toISOString()
  };

  let savedId = data.id;
  if (data.id) {
    const { error } = await client
      .from('products')
      .update(row)
      .eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: inserted, error } = await client
      .from('products')
      .insert(row)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    savedId = inserted.id;
  }

  if (data.id && savedId && oldPrice !== Number(data.current_price)) {
    // Check and trigger alerts
    try {
      const newPrice = Number(data.current_price);
      if (oldPrice > newPrice) {
        const dropPct = ((oldPrice - newPrice) / oldPrice) * 100;
        const { data: alerts } = await client
          .from('price_alerts')
          .select('*')
          .eq('product_id', savedId)
          .eq('is_active', true);

        if (alerts && alerts.length > 0) {
          for (const alert of alerts) {
            let triggered = false;
            let conditionText = '';

            if (alert.alert_type === 'any_drop') {
              triggered = true;
              conditionText = `Price dropped from EGP ${oldPrice} to EGP ${newPrice}`;
            } else if (alert.alert_type === 'pct_5' && dropPct >= 5) {
              triggered = true;
              conditionText = `Price dropped by ${dropPct.toFixed(1)}% to EGP ${newPrice}`;
            } else if (alert.alert_type === 'pct_10' && dropPct >= 10) {
              triggered = true;
              conditionText = `Price dropped by ${dropPct.toFixed(1)}% to EGP ${newPrice}`;
            } else if (alert.alert_type === 'target_price' && alert.target_price && newPrice <= Number(alert.target_price)) {
              triggered = true;
              conditionText = `Price reached target of EGP ${alert.target_price} (Now: EGP ${newPrice})`;
            }

            if (triggered) {
              await client.from('alert_events').insert({
                alert_id: alert.id,
                old_price: oldPrice,
                new_price: newPrice,
                triggered_condition: conditionText,
                delivered: true
              });
            }
          }
        }
      }
    } catch (alertErr: any) {
      console.error('Failed checking price alerts:', alertErr.message);
    }
  }

  revalidatePath(`/${locale}/staff/intelligence/features/product-graph`);
  if (savedId) {
    revalidatePath(`/${locale}/staff/intelligence/features/product-graph/${savedId}`);
  }
  return { success: true, id: savedId };
}

export async function deleteProductAction(id: string, locale: string) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can delete products.');

  const client = await createAdminClient() as any;
  const { error } = await client
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/features/product-graph`);
  return { success: true };
}

export async function toggleWatchlistAction(productId: string, userId: string, locale: string) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { data: existing } = await client
    .from('user_watchlists')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from('user_watchlists')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('user_watchlists')
      .insert({ user_id: userId, product_id: productId });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${locale}/staff/intelligence/features/product-graph/${productId}`);
  return { success: true };
}

export async function savePriceAlertAction(
  data: {
    user_id: string;
    product_id: string;
    alert_type: string;
    target_price?: number;
  },
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  const { error } = await client
    .from('price_alerts')
    .insert({
      user_id: data.user_id,
      product_id: data.product_id,
      alert_type: data.alert_type,
      target_price: data.target_price || null,
      is_active: true
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/features/product-graph/${data.product_id}`);
  return { success: true };
}

export async function deletePriceAlertAction(id: string, productId: string, locale: string) {
  await checkAuth();
  const client = await createAdminClient() as any;
  const { error } = await client
    .from('price_alerts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/features/product-graph/${productId}`);
  return { success: true };
}

export async function saveSourcingSourceAction(
  data: {
    id: string;
    is_active: boolean;
    api_key?: string;
    priority?: number;
  },
  locale: string
) {
  const { perms } = await checkAuth();
  if (!perms?.isAdmin) throw new Error('Only administrators can configure sourcing engines.');

  const client = await createAdminClient() as any;

  // Retrieve current config to preserve settings
  const { data: current } = await client
    .from('sourcing_sources')
    .select('config_settings')
    .eq('id', data.id)
    .single();

  const newSettings = current?.config_settings || {};
  if (data.priority !== undefined) {
    newSettings.priority = Number(data.priority);
  }

  const { error } = await client
    .from('sourcing_sources')
    .update({
      is_active: data.is_active,
      api_key: data.api_key !== undefined ? data.api_key : null,
      config_settings: newSettings,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/staff/intelligence/sourcing-config`);
  return { success: true };
}

export async function triggerOnlineSourcingAction(
  requestId: string,
  locale: string
) {
  await checkAuth(); // Ensure authenticated staff triggers it
  
  // Call internal API endpoint to execute multi-sourcing
  // We can also invoke it directly without fetch to avoid host resolution errors in node
  const client = await createAdminClient() as any;

  // 1. Fetch request details
  const { data: req } = await client
    .from('customer_requests')
    .select('title, product_name, category')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  const searchTerm = req.product_name || req.title;

  // 2. Fetch active sourcing configurations
  const { data: sources } = await client
    .from('sourcing_sources')
    .select('*')
    .eq('is_active', true);

  const results: any[] = [];

  for (const source of (sources || [])) {
    try {
      if (source.name === 'gemini_grounding') {
        // AI Grounded Search simulation
        results.push({
          source_name: source.name,
          store_name: 'Google Shopping / Local Stores',
          title: `${searchTerm} (AI Grounded Spec Match)`,
          price: 48000.00,
          product_url: 'https://google.com/shopping',
          availability_status: 'In Stock'
        });
      } else if (source.name === 'local_scraper') {
        // Local Scraping (Simulation of B.Tech / Raya / Jumia)
        results.push({
          source_name: source.name,
          store_name: 'B.Tech Egypt',
          title: `${searchTerm} - Official Warranty`,
          price: 49500.00,
          product_url: 'https://btech.com/egypt',
          availability_status: 'In Stock'
        }, {
          source_name: source.name,
          store_name: 'Raya Shop',
          title: `${searchTerm} - Installment Eligible`,
          price: 50200.00,
          product_url: 'https://rayashop.com',
          availability_status: 'In Stock'
        });
      } else if (source.name === 'apilayer_marketplace') {
        if (source.api_key) {
          try {
            const response = await fetch(`https://api.apilayer.com/marketplace/amazon?q=${encodeURIComponent(searchTerm)}`, {
              headers: { 'apikey': source.api_key }
            });
            const json = await response.json();
            if (json.results && json.results.length > 0) {
              json.results.slice(0, 2).forEach((item: any) => {
                results.push({
                  source_name: source.name,
                  store_name: 'Amazon Egypt (APILayer)',
                  title: item.title || `${searchTerm} on Amazon`,
                  price: parseFloat(item.price) || 47900.00,
                  product_url: item.url || 'https://amazon.eg',
                  availability_status: item.availability || 'In Stock'
                });
              });
            }
          } catch (e: any) {
            console.error('APILayer Marketplace call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'Amazon Egypt (APILayer)',
            title: `${searchTerm} - Global Version`,
            price: 47900.00,
            product_url: 'https://amazon.eg',
            availability_status: 'In Stock'
          });
        }
      } else if (source.name === 'scrapebadger_amazon') {
        if (source.api_key) {
          try {
            const response = await fetch(`https://api.scrapebadger.com/v1/amazon/search?q=${encodeURIComponent(searchTerm)}&api_key=${source.api_key}`);
            const json = await response.json();
            if (json.products && json.products.length > 0) {
              json.products.slice(0, 2).forEach((item: any) => {
                results.push({
                  source_name: source.name,
                  store_name: 'Amazon Egypt (ScrapeBadger)',
                  title: item.title || `${searchTerm} on Amazon`,
                  price: parseFloat(item.price) || 48999.00,
                  product_url: item.url || 'https://amazon.eg',
                  availability_status: 'In Stock'
                });
              });
            }
          } catch (e: any) {
            console.error('ScrapeBadger call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'Amazon Egypt (ScrapeBadger)',
            title: `${searchTerm} - Local Dealer Warranty`,
            price: 48999.00,
            product_url: 'https://amazon.eg',
            availability_status: 'In Stock'
          });
        }
      } else if (source.name === 'apilayer_google_search') {
        if (source.api_key) {
          try {
            const response = await fetch(`https://api.apilayer.com/google_search?q=${encodeURIComponent(searchTerm)}`, {
              headers: { 'apikey': source.api_key }
            });
            const json = await response.json();
            if (json.organic && json.organic.length > 0) {
              json.organic.slice(0, 2).forEach((item: any) => {
                results.push({
                  source_name: source.name,
                  store_name: 'Google Organic Search',
                  title: item.title || `${searchTerm}`,
                  price: 47800.00, // Google Search usually doesn't have structured price field
                  product_url: item.link || 'https://google.com',
                  availability_status: 'In Stock'
                });
              });
            }
          } catch (e: any) {
            console.error('APILayer Google Search call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'Jumia Egypt (via Google Search)',
            title: `${searchTerm} - Free Shipping`,
            price: 47800.00,
            product_url: 'https://jumia.com.eg',
            availability_status: 'In Stock'
          });
        }
      } else if (source.name === 'serpapi_search') {
        if (source.api_key) {
          try {
            const response = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchTerm)}&api_key=${source.api_key}`);
            const json = await response.json();
            if (json.shopping_results && json.shopping_results.length > 0) {
              json.shopping_results.slice(0, 2).forEach((item: any) => {
                results.push({
                  source_name: source.name,
                  store_name: item.source || 'Google Shopping Store',
                  title: item.title || `${searchTerm}`,
                  price: parseFloat(item.price?.replace(/[^0-9.]/g, '')) || 48500.00,
                  product_url: item.link || 'https://google.com/shopping',
                  availability_status: 'In Stock'
                });
              });
            }
          } catch (e: any) {
            console.error('SerpApi Search call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'Carrefour Egypt (SerpApi)',
            title: `${searchTerm} - Special Offer`,
            price: 48500.00,
            product_url: 'https://carrefouregypt.com',
            availability_status: 'In Stock'
          });
        }
      } else if (source.name === 'valueserp_search') {
        if (source.api_key) {
          try {
            const response = await fetch(`https://api.valueserp.com/search?q=${encodeURIComponent(searchTerm)}&search_type=shopping&api_key=${source.api_key}`);
            const json = await response.json();
            if (json.shopping_results && json.shopping_results.length > 0) {
              json.shopping_results.slice(0, 2).forEach((item: any) => {
                results.push({
                  source_name: source.name,
                  store_name: item.merchant || 'ValueSerp Merchant',
                  title: item.title || `${searchTerm}`,
                  price: parseFloat(item.price?.replace(/[^0-9.]/g, '')) || 47600.00,
                  product_url: item.link || 'https://google.com',
                  availability_status: 'In Stock'
                });
              });
            }
          } catch (e: any) {
            console.error('ValueSerp call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'El-Araby Group (ValueSerp)',
            title: `${searchTerm} - Official Warranty`,
            price: 47600.00,
            product_url: 'https://elarabygroup.com',
            availability_status: 'In Stock'
          });
        }
      } else if (source.name === 'scrapingbee_api') {
        if (source.api_key) {
          try {
            // General Jumia Scraper target request
            const targetUrl = `https://www.jumia.com.eg/catalog/?q=${encodeURIComponent(searchTerm)}`;
            const response = await fetch(`https://app.scrapingbee.com/api/v1/?url=${encodeURIComponent(targetUrl)}&api_key=${source.api_key}&render_js=false`);
            const html = await response.text();
            // Perform light regex extraction or default
            const priceRegex = /class="prc">EGP\s*([0-9,]+)/i;
            const match = html.match(priceRegex);
            const extractedPrice = match ? parseFloat(match[1].replace(/,/g, '')) : 46900.00;
            results.push({
              source_name: source.name,
              store_name: 'Jumia Egypt (ScrapingBee)',
              title: `${searchTerm} (Scraped via Bee)`,
              price: extractedPrice,
              product_url: targetUrl,
              availability_status: 'In Stock'
            });
          } catch (e: any) {
            console.error('ScrapingBee call failed, using fallback:', e.message);
          }
        } else {
          results.push({
            source_name: source.name,
            store_name: 'Jumia Egypt (ScrapingBee)',
            title: `${searchTerm} - Fast Delivery`,
            price: 46900.00,
            product_url: 'https://jumia.com.eg',
            availability_status: 'In Stock'
          });
        }
      }
    } catch (sourceErr: any) {
      console.error(`Sourcing failed for source: ${source.name}`, sourceErr.message);
    }
  }

  // 3. Write results to online_merchant_quotes
  for (const res of results) {
    await client.from('online_merchant_quotes').insert({
      request_id: requestId,
      source_name: res.source_name,
      store_name: res.store_name,
      title: res.title,
      price: res.price,
      product_url: res.product_url,
      availability_status: res.availability_status
    });
  }

  revalidatePath(`/${locale}/staff/workspace/${requestId}`);
  return { success: true, count: results.length };
}

export async function generateUnifiedOnlineReportAction(
  requestId: string,
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  // 1. Fetch request details
  const { data: req } = await client
    .from('customer_requests')
    .select('title, product_name, category, max_price')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  // 2. Fetch all online quotes
  const { data: quotes } = await client
    .from('online_merchant_quotes')
    .select('*')
    .eq('request_id', requestId);

  if (!quotes || quotes.length === 0) {
    throw new Error('No online quotes found. Run a price scan first.');
  }

  // 3. Import and call Gemini Analyzer
  const { analyzeQuotesWithGemini } = await import('@/lib/gemini/client');
  const analysis = await analyzeQuotesWithGemini(
    req.product_name || req.title,
    req.category,
    Number(req.max_price || 0),
    quotes
  );

  // 4. Update quotes with AI analysis outcomes
  for (const item of analysis.analyzed_quotes) {
    await client
      .from('online_merchant_quotes')
      .update({
        ai_match_score: item.match_score,
        ai_rating_stars: item.rating_stars,
        ai_advantages_en: item.advantages_en,
        ai_advantages_ar: item.advantages_ar,
        ai_verdict_en: item.verdict_en,
        ai_verdict_ar: item.verdict_ar,
        ai_rank: item.rank
      })
      .eq('id', item.quote_id);
  }

  revalidatePath(`/${locale}/staff/workspace/${requestId}`);
  return { success: true, count: quotes.length };
}

export async function promoteOnlineQuoteToSnapshotAction(
  quoteId: string,
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  // 1. Fetch analyzed online quote details
  const { data: quote } = await client
    .from('online_merchant_quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (!quote) throw new Error('Online quote not found');

  // 2. Get or create report for this request
  const { getOrCreateReportForRequestAdmin, upsertReportOptionSnapshotAdmin } = await import('@/lib/dal/reports');
  const report = await getOrCreateReportForRequestAdmin(quote.request_id, staff?.auth_user_id || 'system');

  // 3. Upsert snapshot
  const displayTitle = quote.title || `Best Deal from ${quote.store_name}`;
  const highlightSummary = locale === 'ar'
    ? `${quote.ai_advantages_ar || 'أفضل الأسعار المتوفرة أونلاين'}. التقييم: ${quote.ai_rating_stars || 'N/A'} نجوم. الحكم: ${quote.ai_verdict_ar || ''}`
    : `${quote.ai_advantages_en || 'Top online value offer'}. Deal Rating: ${quote.ai_rating_stars || 'N/A'} stars. Verdict: ${quote.ai_verdict_en || ''}`;

  await upsertReportOptionSnapshotAdmin({
    report_id: report!.id,
    request_id: quote.request_id,
    display_title: displayTitle,
    highlight_summary: highlightSummary,
    display_rank: quote.ai_rank || 1,
    candidate_channel: 'online',
    hidden_merchant_name: quote.store_name,
    hidden_source_url: quote.product_url || undefined,
    hidden_reference_url: quote.product_url || undefined,
    hidden_contact_notes: `Online Sourcing Engine Deal. Scraped at ${new Date(quote.scraped_at).toLocaleDateString()}`,
    reveal_locked: true,
    display_price_amount: Number(quote.price || 0),
    currency_code: 'EGP'
  });

  revalidatePath(`/${locale}/staff/workspace/${quote.request_id}`);
  return { success: true };
}

export async function generateUnifiedOfflineReportAction(
  requestId: string,
  locale: string
) {
  await checkAuth();
  const client = await createAdminClient() as any;

  // 1. Fetch request details
  const { data: req } = await client
    .from('customer_requests')
    .select('title, product_name, category, max_price')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  // 2. Fetch all offline quotes
  const { data: quotes } = await client
    .from('merchant_quotes')
    .select('*')
    .eq('request_id', requestId);

  if (!quotes || quotes.length === 0) {
    throw new Error('No offline quotes found. Add field agent quotes first.');
  }

  // 3. Call Gemini Analyzer
  const { analyzeOfflineQuotesWithGemini } = await import('@/lib/gemini/client');
  const analysis = await analyzeOfflineQuotesWithGemini(
    req.product_name || req.title,
    req.category,
    Number(req.max_price || 0),
    quotes
  );

  // 4. Update quotes with AI analysis outcomes
  for (const item of analysis.analyzed_quotes) {
    await client
      .from('merchant_quotes')
      .update({
        ai_match_score: item.match_score,
        ai_rating_stars: item.rating_stars,
        ai_advantages_en: item.advantages_en,
        ai_advantages_ar: item.advantages_ar,
        ai_verdict_en: item.verdict_en,
        ai_verdict_ar: item.verdict_ar,
        ai_rank: item.rank
      })
      .eq('id', item.quote_id);
  }

  revalidatePath(`/${locale}/staff/workspace/${requestId}`);
  return { success: true, count: quotes.length };
}

export async function generateFinalProposalSynthesisAction(
  requestId: string,
  locale: string
) {
  const { staff } = await checkAuth();
  const client = await createAdminClient() as any;

  // 1. Fetch request details
  const { data: req } = await client
    .from('customer_requests')
    .select('title, product_name, category, max_price')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  // 2. Fetch all online & offline quotes
  const [onlineQuotesRes, offlineQuotesRes] = await Promise.all([
    client.from('online_merchant_quotes').select('*').eq('request_id', requestId),
    client.from('merchant_quotes').select('*').eq('request_id', requestId)
  ]);

  const onlineQuotes = onlineQuotesRes.data || [];
  const offlineQuotes = offlineQuotesRes.data || [];

  if (onlineQuotes.length === 0 && offlineQuotes.length === 0) {
    throw new Error('No quotes found. Run online scans and offline field sourcing first.');
  }

  // 3. Call synthesis engine
  const { synthesizeFinalProposalWithGemini } = await import('@/lib/gemini/client');
  const synthesis = await synthesizeFinalProposalWithGemini(
    req.product_name || req.title,
    req.category,
    Number(req.max_price || 0),
    onlineQuotes,
    offlineQuotes
  );

  // 4. Get or create report
  const { getOrCreateReportForRequestAdmin } = await import('@/lib/dal/reports');
  const report = await getOrCreateReportForRequestAdmin(requestId, staff?.auth_user_id || 'system');

  // 5. Delete old snapshots
  await client
    .from('report_option_snapshots')
    .delete()
    .eq('report_id', report!.id);

  // 6. Insert synthesized top 5 deals as locked snapshots (reveal_locked: true)
  for (const item of synthesis.top_deals) {
    const highlightSummary = locale === 'ar'
      ? `المميزات: ${item.advantages_ar}. العيوب: ${item.disadvantages_ar || 'لا يوجد عيوب واضحة'}`
      : `Pros: ${item.advantages_en}. Cons: ${item.disadvantages_en || 'No critical cons detected'}`;

    // Insert
    await client
      .from('report_option_snapshots')
      .insert({
        report_id: report!.id,
        request_id: requestId,
        display_title: item.deal_title || `Special Deal option`,
        highlight_summary: highlightSummary,
        display_rank: item.rank || 1,
        candidate_channel: item.source_type || 'online',
        hidden_merchant_name: item.merchant_name || 'Merchant option',
        hidden_reference_url: item.product_url || null,
        hidden_contact_notes: `Top 5 synthesized deal options. Created at ${new Date().toLocaleDateString()}`,
        reveal_locked: true, // ALWAYS LOCKED until customer pays!
        display_price_amount: Number(item.price || 0),
        currency_code: 'EGP',
        disadvantages_en: item.disadvantages_en || null,
        disadvantages_ar: item.disadvantages_ar || null
      });
  }

  revalidatePath(`/${locale}/staff/workspace/${requestId}`);
  return { success: true, count: synthesis.top_deals.length };
}




