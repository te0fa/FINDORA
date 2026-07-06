import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { i18nConfig } from '@/lib/i18n/config'
import { createAdminClient } from '@/lib/supabase/admin'

function getLocale(request: NextRequest): string {
  const referer = request.headers.get('referer')
  if (referer) {
    if (referer.includes('/en/') || referer.endsWith('/en')) return 'en'
    if (referer.includes('/ar/') || referer.endsWith('/ar')) return 'ar'
  }

  const path = request.nextUrl.pathname
  const matchedLocale = i18nConfig.locales.find(
    (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)
  )

  return matchedLocale ?? i18nConfig.defaultLocale
}

function resolveStaffHomePath(allRoles: string[], locale: string) {
  const roles = new Set(allRoles.map((r) => r.toLowerCase()))

  if (roles.has('owner') || roles.has('admin')) {
    return `/${locale}/staff/dashboard`
  }

  if (
    roles.has('reviewer') ||
    roles.has('researcher') ||
    roles.has('field_agent') ||
    roles.has('reporter')
  ) {
    return `/${locale}/staff/queue`
  }

  return `/${locale}/staff/dashboard`
}

function canAccessStaffDashboard(allRoles: string[]) {
  const roles = new Set(allRoles.map((r) => r.toLowerCase()))
  return (
    roles.has('owner') ||
    roles.has('admin') ||
    roles.has('support') ||
    roles.has('reviewer') ||
    roles.has('researcher') ||
    roles.has('field_agent') ||
    roles.has('reporter')
  )
}

function canAccessStaffWorkspace(allRoles: string[]) {
  const roles = new Set(allRoles.map((r) => r.toLowerCase()))
  return (
    roles.has('owner') ||
    roles.has('admin') ||
    roles.has('reviewer') ||
    roles.has('researcher') ||
    roles.has('field_agent') ||
    roles.has('reporter')
  )
}

function isStaffPath(path: string) {
  return i18nConfig.locales.some(
    (locale) => path === `/${locale}/staff` || path.startsWith(`/${locale}/staff/`)
  )
}

function isCustomerPath(path: string) {
  return i18nConfig.locales.some((locale) => {
    const dashboard = path === `/${locale}/dashboard` || path.startsWith(`/${locale}/dashboard/`)
    const requests = path === `/${locale}/requests` || path.startsWith(`/${locale}/requests/`)
    const reports = path === `/${locale}/reports` || path.startsWith(`/${locale}/reports/`)
    const customer = path === `/${locale}/customer` || path.startsWith(`/${locale}/customer/`)
    const staff = path === `/${locale}/staff` || path.startsWith(`/${locale}/staff/`)
    return !staff && (dashboard || requests || reports || customer)
  })
}

function isContributorPath(path: string) {
  return i18nConfig.locales.some((locale) => {
    const isDashboard = path === `/${locale}/contributors/dashboard` || path.startsWith(`/${locale}/contributors/dashboard/`)
    const isSubmit = path === `/${locale}/contributors/submit` || path.startsWith(`/${locale}/contributors/submit/`)
    const isWallet = path === `/${locale}/contributors/wallet` || path.startsWith(`/${locale}/contributors/wallet/`)
    return isDashboard || isSubmit || isWallet
  })
}

function isAuthPath(path: string) {
  return i18nConfig.locales.some(
    (locale) => path === `/${locale}/auth` || path.startsWith(`/${locale}/auth/`)
  )
}

export async function updateSession(request: NextRequest, existingUser?: any) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and a publishable key.'
    )
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const user = existingUser !== undefined ? existingUser : (await supabase.auth.getUser()).data.user

  const url = request.nextUrl.clone()
  const locale = getLocale(request)

  let cachedStaffMember:
    | {
        id: string
        staff_role: string
        is_active: boolean
        allRoles: string[]
      }
    | null
    | undefined = undefined

  async function getActiveStaffMember() {
    if (!user) return null
    if (cachedStaffMember !== undefined) return cachedStaffMember

    const adminClient = createAdminClient()
    const { data: staff, error: staffError } = await adminClient
      .from('staff_members')
      .select('id, staff_role, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError || !staff) {
      cachedStaffMember = null
      return null
    }

    const { data: roles } = await adminClient
      .from('staff_member_roles')
      .select('role_code')
      .eq('staff_member_id', staff.id)
      .eq('is_active', true)

    cachedStaffMember = {
      ...staff,
      allRoles: [staff.staff_role, ...(roles || []).map((r: any) => r.role_code)].filter(Boolean),
    }

    return cachedStaffMember
  }

  const nextParam = encodeURIComponent(url.pathname + url.search)
  const loginUrl = new URL(`/${locale}/auth/login?next=${nextParam}`, request.url)

  if (isStaffPath(url.pathname)) {
    if (!user) {
      return NextResponse.redirect(loginUrl)
    }

    const staffMember = await getActiveStaffMember()

    if (!staffMember) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
    }

    const staffHome = resolveStaffHomePath(staffMember.allRoles, locale)

    if (url.pathname === `/${locale}/staff`) {
      return NextResponse.redirect(new URL(staffHome, request.url))
    }

    if (
      url.pathname === `/${locale}/staff/dashboard` &&
      !canAccessStaffDashboard(staffMember.allRoles)
    ) {
      return NextResponse.redirect(new URL(staffHome, request.url))
    }

    if (
      url.pathname.startsWith(`/${locale}/staff/workspace`) &&
      !canAccessStaffWorkspace(staffMember.allRoles)
    ) {
      return NextResponse.redirect(new URL(staffHome, request.url))
    }
  }

  if (isCustomerPath(url.pathname)) {
    const isRequestDetailPage = url.pathname.includes('/customer/request/')
    const isGuestTracking = url.searchParams.has('requestId') || isRequestDetailPage

    if (!user && !isGuestTracking) {
      return NextResponse.redirect(loginUrl)
    }

    const staffMember = await getActiveStaffMember()
    if (staffMember) {
      const targetPath = resolveStaffHomePath(staffMember.allRoles, locale)
      return NextResponse.redirect(new URL(targetPath, request.url))
    }
  }

  if (isContributorPath(url.pathname)) {
    if (!user) {
      return NextResponse.redirect(loginUrl)
    }
  }

  if (isAuthPath(url.pathname) && user && !url.pathname.includes('/actions')) {
    const staffMember = await getActiveStaffMember()

    if (staffMember) {
      const targetPath = resolveStaffHomePath(staffMember.allRoles, locale)
      return NextResponse.redirect(new URL(targetPath, request.url))
    }

    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return response
}

export const proxySession = updateSession