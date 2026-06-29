/**
 * FINDORA — Auth Roles & Permissions
 * Centralized role resolution and permission checking.
 * Expanded from minimal 629-byte stub to full production implementation.
 */

import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'staff' | 'contributor' | null

export interface StaffPermissions {
  // Identity
  staffId: string
  staffRole: string
  allRoles: string[]

  // Core
  isAdmin: boolean
  isOwner: boolean
  isActive: boolean

  // Operational permissions
  canReviewIntake: boolean
  canResearch: boolean
  canSourceOffline: boolean
  canReport: boolean
  canQualityReview: boolean

  // Customer-facing
  canManageCommunications: boolean
  canManagePayments: boolean
  isPaymentReviewer: boolean

  // Vendor
  canManageVendors: boolean

  // Marketing
  canManageDeals: boolean
  canManageNews: boolean
  canManagePricing: boolean
  canManageMarketing: boolean
  canManageContent: boolean

  // Financial
  canViewFinancials: boolean
  canManageFinancials: boolean

  // Intelligence
  canViewIntelligence: boolean
  canManageAI: boolean
  canManageFeatureFlags: boolean

  // User management
  canManageUsers: boolean
  canHardDelete: boolean

  // Contributors / HR
  canManageContributors: boolean
  isContributorHR: boolean
  canReviewFraud: boolean

  // Economy
  isEconomyArchitect: boolean
}

// ── Role Constants ─────────────────────────────────────────────────────────────

export const STAFF_ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  REVIEWER: 'reviewer',
  RESEARCHER: 'researcher',
  FIELD_AGENT: 'field_agent',
  REPORTER: 'reporter',
  SUPPORT: 'support',
  CONTENT_MANAGER: 'content_manager',
  DEALS_MANAGER: 'deals_manager',
  NEWS_MANAGER: 'news_manager',
  PRICING_MANAGER: 'pricing_manager',
  QUALITY_REVIEWER: 'quality_reviewer',
  PAYMENT_REVIEWER: 'payment_reviewer',
  VENDOR_RELATIONS: 'vendor_relations',
  CONTRIBUTOR_HR: 'contributor_hr',
  CONTRIBUTOR_ADMIN: 'contributor_admin',
  FRAUD_REVIEWER: 'fraud_reviewer',
  ECONOMY_ARCHITECT: 'economy_architect',
  AI_MANAGER: 'ai_manager',
} as const

export type StaffRoleCode = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES]

// ── Core Role Resolution ───────────────────────────────────────────────────────

// ⚠️ ملحوظة: cache() يعمل فقط داخل Server Components. إذا استُخدمت هذه الدالة مستقبلاً من Route Handler أو Server Action، احصل على النتيجة مرة واحدة وخزّنها في متغير محلي، لا تعتمد على cache() في ذلك السياق (مؤكد بالاختبار الفعلي بتاريخ اليوم).
export const getUserRole = cache(async function (userId: string): Promise<UserRole> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffData } = await (supabase as any)
    .from('staff_members')
    .select('id, is_active')
    .eq('auth_user_id', userId)
    .maybeSingle() as { data: { id: string; is_active: boolean } | null; error: unknown }

  if (staffData?.is_active) return 'staff'

  const { data: customerData } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (customerData) return 'customer'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contributorData } = await (supabase as any)
    .from('contributors')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle() as { data: { id: string } | null; error: unknown }

  if (contributorData) return 'contributor'

  return null
})

// ── Staff Permission Builder ──────────────────────────────────────────────────

// ⚠️ ملحوظة: cache() يعمل فقط داخل Server Components. إذا استُخدمت هذه الدالة مستقبلاً من Route Handler أو Server Action، احصل على النتيجة مرة واحدة وخزّنها في متغير محلي، لا تعتمد على cache() في ذلك السياق (مؤكد بالاختبار الفعلي بتاريخ اليوم).
export const getStaffPermissions = cache(async function (userId: string): Promise<StaffPermissions | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staff } = await (supabase as any)
    .from('staff_members')
    .select('id, staff_role, is_active, can_approve_requests, can_manage_merchants, can_view_financials')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle() as {
      data: {
        id: string
        staff_role: string | null
        is_active: boolean | null
        can_approve_requests: boolean | null
        can_manage_merchants: boolean | null
        can_view_financials: boolean | null
      } | null
      error: unknown
    }

  if (!staff) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: extraRoles } = await (supabase as any)
    .from('staff_member_roles')
    .select('role_code')
    .eq('staff_member_id', staff.id)
    .eq('is_active', true) as { data: Array<{ role_code: string }> | null; error: unknown }

  const primaryRole = staff.staff_role ?? ''
  const additionalRoles = (extraRoles ?? []).map((r) => r.role_code)
  const allRoles = new Set([primaryRole, ...additionalRoles].filter(Boolean))

  const has = (...roles: string[]) => roles.some((r) => allRoles.has(r))
  const isAdmin = has('admin', 'owner')

  return {
    staffId: staff.id,
    staffRole: primaryRole,
    allRoles: [...allRoles],
    isAdmin,
    isOwner: has('owner'),
    isActive: staff.is_active ?? false,

    // Operational
    canReviewIntake: isAdmin || has('reviewer') || !!staff.can_approve_requests,
    canResearch: isAdmin || has('researcher'),
    canSourceOffline: isAdmin || has('field_agent'),
    canReport: isAdmin || has('reporter'),
    canQualityReview: isAdmin || has('quality_reviewer'),

    // Customer-facing
    canManageCommunications: isAdmin || has('support', 'reviewer'),
    canManagePayments: isAdmin || has('payment_reviewer'),
    isPaymentReviewer: has('payment_reviewer'),

    // Vendor
    canManageVendors: isAdmin || has('vendor_relations') || !!staff.can_manage_merchants,

    // Marketing
    canManageDeals: isAdmin || has('deals_manager', 'content_manager'),
    canManageNews: isAdmin || has('news_manager', 'content_manager'),
    canManagePricing: isAdmin || has('pricing_manager'),
    canManageMarketing: isAdmin || has('content_manager', 'deals_manager', 'news_manager'),
    canManageContent: isAdmin || has('content_manager'),

    // Financial
    canViewFinancials: isAdmin || !!staff.can_view_financials,
    canManageFinancials: isAdmin,

    // Intelligence
    canViewIntelligence: isAdmin || has('support', 'reviewer', 'researcher', 'ai_manager'),
    canManageAI: isAdmin || has('ai_manager'),
    canManageFeatureFlags: isAdmin || has('ai_manager'),

    // User management
    canManageUsers: isAdmin,
    canHardDelete: has('owner'),

    // Contributors / HR
    canManageContributors: isAdmin || has('contributor_hr', 'contributor_admin'),
    isContributorHR: has('contributor_hr', 'contributor_admin'),
    canReviewFraud: isAdmin || has('fraud_reviewer'),

    // Economy
    isEconomyArchitect: isAdmin || has('economy_architect'),
  }
})

// ── Quick Permission Checks ───────────────────────────────────────────────────

export function assertAdmin(perms: StaffPermissions | null, action = 'perform this action'): void {
  if (!perms?.isAdmin) {
    throw new Error(`Admin access required to ${action}.`)
  }
}

export function assertPermission(
  perms: StaffPermissions | null,
  permission: keyof StaffPermissions,
  action = 'perform this action'
): void {
  if (!perms || !perms[permission]) {
    throw new Error(`Permission denied: cannot ${action}.`)
  }
}

// ── Role Label Helpers ────────────────────────────────────────────────────────

export function getRoleLabel(role: string, locale: 'ar' | 'en' = 'ar'): string {
  const labels: Record<string, { ar: string; en: string }> = {
    admin: { ar: 'مدير', en: 'Admin' },
    owner: { ar: 'مالك', en: 'Owner' },
    reviewer: { ar: 'مراجع', en: 'Reviewer' },
    researcher: { ar: 'باحث', en: 'Researcher' },
    field_agent: { ar: 'مندوب ميداني', en: 'Field Agent' },
    reporter: { ar: 'مُعِد تقارير', en: 'Reporter' },
    support: { ar: 'دعم عملاء', en: 'Support' },
    content_manager: { ar: 'مدير محتوى', en: 'Content Manager' },
    deals_manager: { ar: 'مدير عروض', en: 'Deals Manager' },
    news_manager: { ar: 'مدير أخبار', en: 'News Manager' },
    pricing_manager: { ar: 'مدير تسعير', en: 'Pricing Manager' },
    quality_reviewer: { ar: 'مراجع جودة', en: 'Quality Reviewer' },
    payment_reviewer: { ar: 'مراجع مدفوعات', en: 'Payment Reviewer' },
    vendor_relations: { ar: 'علاقات موردين', en: 'Vendor Relations' },
    contributor_hr: { ar: 'HR مساهمين', en: 'Contributor HR' },
    contributor_admin: { ar: 'إدارة مساهمين', en: 'Contributor Admin' },
    fraud_reviewer: { ar: 'مراجع احتيال', en: 'Fraud Reviewer' },
    economy_architect: { ar: 'مهندس اقتصاد', en: 'Economy Architect' },
    ai_manager: { ar: 'مدير الذكاء الاصطناعي', en: 'AI Manager' },
  }
  return labels[role]?.[locale] ?? role
}