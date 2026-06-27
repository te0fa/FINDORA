import {
  getStaffManagementList,
  getStaffMemberByAuthUserId,
  getStaffUiPermissions,
} from '@/lib/dal/staff'
import { getAllCustomersAdmin, getCustomerOrders } from '@/lib/dal/customers'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { 
  handleUpdateStaff, 
  handlePromoteToStaff,
  handleCreateStaff,
  handleDeleteStaff,
  handleToggleArchiveStaff,
  handleBlockCustomer,
  handleUnblockCustomer,
  handleToggleCustomerArchive,
  handleDeleteCustomer,
  handleCancelRequest,
  handleReactivateRequest
} from './actions'
import Link from 'next/link'
import { createAdminClient } from '@/lib/dal/customers'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ModalBackdrop } from '@/components/ModalBackdrop'


function formatDate(dateStr: string | null | undefined, locale: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function StaffManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ 
    tab?: string; 
    role?: string; 
    team?: string; 
    active?: string; 
    showAdmins?: string; 
    q?: string;
    customerStatus?: string;
    selectedCustomer?: string;
    editStaff?: string;
    editCustomer?: string;
  }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'
  const resolvedSearchParams = searchParams ? await searchParams : {}
  
  const activeTab = resolvedSearchParams?.tab || 'staff' // 'staff' or 'customers' or 'blocked_list'
  const filterRole = resolvedSearchParams?.role
  const filterTeam = resolvedSearchParams?.team
  const filterActive = resolvedSearchParams?.active
  const showAdmins = resolvedSearchParams?.showAdmins === 'true'
  const searchQ = (resolvedSearchParams?.q as string || '').toLowerCase().trim()
  const filterCustomerStatus = resolvedSearchParams?.customerStatus || 'all' // all, active, suspended, blocked, archived
  const selectedCustomerId = resolvedSearchParams?.selectedCustomer
  const editStaffId = resolvedSearchParams?.editStaff
  const editCustomerId = resolvedSearchParams?.editCustomer

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const currentStaff = await getStaffMemberByAuthUserId(user.id)
  if (!currentStaff || !currentStaff.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(currentStaff)
  if (!permissions.isAdmin) {
    redirect(`/${locale}/staff/dashboard`)
  }

  let allStaff = await getStaffManagementList()
  let allCustomers = await getAllCustomersAdmin()

  // Apply staff filters
  let filteredStaff = allStaff.filter(s => {
    const roleMatch = !filterRole || s.role === filterRole
    const teamMatch = !filterTeam || s.team === filterTeam
    
    // active filter
    let activeMatch = true
    if (filterActive === 'true') activeMatch = s.is_active && !s.is_archived
    else if (filterActive === 'false') activeMatch = !s.is_active && !s.is_archived
    else if (filterActive === 'archived') activeMatch = !!s.is_archived
    else activeMatch = !s.is_archived // by default hide archived staff

    const adminExclusion = showAdmins || (s.role !== 'admin' && s.role !== 'owner')
    const searchMatch = !searchQ || 
      (s.name || '').toLowerCase().includes(searchQ) || 
      (s.auth_id || '').toLowerCase().includes(searchQ)
    
    return roleMatch && teamMatch && activeMatch && adminExclusion && searchMatch
  })

  // Prefetch order counts in memory (Optimized)
  const adminClient = await createAdminClient()
  const { data: allReqs } = await adminClient.from('requests').select('id, customer_id')
  const phoneCountMap = new Map<string, number>()
  const emailCountMap = new Map<string, number>()

  allReqs?.forEach(r => {
    const cust = allCustomers.find(c => c.id === r.customer_id)
    if (cust) {
      if (cust.phone_number_normalized) {
        phoneCountMap.set(cust.phone_number_normalized, (phoneCountMap.get(cust.phone_number_normalized) || 0) + 1)
      }
      if (cust.email) {
        emailCountMap.set(cust.email, (emailCountMap.get(cust.email) || 0) + 1)
      }
    }
  })

  // Apply customer filters and status resolution
  let filteredCustomers = allCustomers.map(c => {
    const phoneCount = c.phone_number_normalized ? (phoneCountMap.get(c.phone_number_normalized) || 0) : 0
    const emailCount = c.email ? (emailCountMap.get(c.email) || 0) : 0
    const directCount = allReqs?.filter(r => r.customer_id === c.id).length || 0
    const orderCount = Math.max(phoneCount, emailCount, directCount)
    
    return {
      ...c,
      orderCount
    }
  }).filter(c => {
    // Search match
    const searchMatch = !searchQ || 
      (c.full_name || '').toLowerCase().includes(searchQ) || 
      (c.customer_code || '').toLowerCase().includes(searchQ) || 
      (c.email || '').toLowerCase().includes(searchQ) ||
      (c.phone_number_raw || '').toLowerCase().includes(searchQ) ||
      (c.phone_number_normalized || '').toLowerCase().includes(searchQ)

    // Customer status match
    let statusMatch = true
    if (filterCustomerStatus === 'active') {
      statusMatch = c.status === 'active' && !c.is_archived
    } else if (filterCustomerStatus === 'suspended') {
      statusMatch = c.status === 'suspended' && !c.is_archived
    } else if (filterCustomerStatus === 'blocked') {
      statusMatch = c.status === 'blocked' && !c.is_archived
    } else if (filterCustomerStatus === 'archived') {
      statusMatch = !!c.is_archived
    } else {
      // Default: hide archived
      statusMatch = !c.is_archived
    }

    // Special tab blocked list filter
    if (activeTab === 'blocked_list') {
      statusMatch = c.status === 'blocked'
    }

    return searchMatch && statusMatch
  })

  // Fetch orders for selected customer if requested
  let selectedCustomerData = null
  let selectedCustomerOrders: any[] = []
  if (selectedCustomerId) {
    selectedCustomerData = allCustomers.find(c => c.id === selectedCustomerId)
    if (selectedCustomerData) {
      selectedCustomerOrders = await getCustomerOrders(selectedCustomerData.email, selectedCustomerData.phone_number_normalized)
    }
  }

  // Edit Staff Modal Resolution
  const editingStaff = editStaffId ? allStaff.find(s => s.id === editStaffId) : null
  
  // Edit Customer Modal Resolution
  const editingCustomer = editCustomerId ? allCustomers.find(c => c.id === editCustomerId) : null

  return (
    <main className="page-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="flex justify-between items-center py-8 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="mb-0 text-2xl font-black">{isRTL ? 'إدارة المستخدمين والصلاحيات' : 'User & Staff Management'}</h1>
          <p className="text-muted mt-2">{isRTL ? 'التحكم الكامل في الموظفين وإدارة العملاء وحظر الحسابات والطلبات' : 'Full control over employees, customer suspension, blocking, and request status'}</p>
        </div>
      </header>

      {/* Tabs Controller */}
      <div className="flex gap-2 mb-8 p-1" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', maxWidth: '600px' }}>
        <Link 
          href={`/${locale}/staff/users?tab=staff`}
          className="flex-1 text-center py-3 font-bold" 
          style={{ 
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            background: activeTab === 'staff' ? 'rgba(212,166,60,0.1)' : 'transparent',
            border: activeTab === 'staff' ? '1px solid var(--accent)' : '1px solid transparent',
            color: activeTab === 'staff' ? 'var(--accent)' : 'rgba(255,255,255,0.6)'
          }}
        >
          {isRTL ? '👥 الموظفين والشركاء' : '👥 Staff & Employees'} ({allStaff.filter(s => !s.is_archived).length})
        </Link>
        <Link 
          href={`/${locale}/staff/users?tab=customers`}
          className="flex-1 text-center py-3 font-bold"
          style={{ 
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            background: activeTab === 'customers' ? 'rgba(212,166,60,0.1)' : 'transparent',
            border: activeTab === 'customers' ? '1px solid var(--accent)' : '1px solid transparent',
            color: activeTab === 'customers' ? 'var(--accent)' : 'rgba(255,255,255,0.6)'
          }}
        >
          {isRTL ? '🛍️ العملاء المسجلين' : '🛍️ Customers'} ({allCustomers.filter(c => !c.is_archived).length})
        </Link>
        <Link 
          href={`/${locale}/staff/users?tab=blocked_list`}
          className="flex-1 text-center py-3 font-bold"
          style={{ 
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            background: activeTab === 'blocked_list' ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: activeTab === 'blocked_list' ? '1px solid #ef4444' : '1px solid transparent',
            color: activeTab === 'blocked_list' ? '#ef4444' : 'rgba(255,255,255,0.6)'
          }}
        >
          {isRTL ? '🚫 قائمة الحظر' : '🚫 Blocked List'} ({allCustomers.filter(c => c.status === 'blocked').length})
        </Link>
      </div>

      {/* Add Employee Form (Only on Staff tab) */}
      {activeTab === 'staff' && (
        <section className="glass-card p-6 mb-8" style={{ borderRadius: '24px', border: '1px dashed rgba(212,166,60,0.3)' }}>
          <h2 className="text-lg font-black mb-4 text-accent">{isRTL ? '➕ إضافة موظف جديد' : '➕ Create New Staff Member'}</h2>
          <form action={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="hidden" name="locale" value={locale} />
            
            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'الاسم بالكامل' : 'Full Name'}</label>
              <input type="text" name="fullName" placeholder={isRTL ? 'أحمد محمد' : 'John Doe'} className="filter-input py-2 px-4 text-sm" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input type="email" name="email" placeholder="staff@findora.io" className="filter-input py-2 px-4 text-sm" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
              <input type="text" name="phone" placeholder="+2010..." className="filter-input py-2 px-4 text-sm" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'كلمة المرور' : 'Password'}</label>
              <input type="password" name="password" placeholder="••••••••" className="filter-input py-2 px-4 text-sm" required minLength={6} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'الدور الأساسي' : 'Primary Role'}</label>
              <select name="role" className="select-small py-2 px-4 text-sm" defaultValue="reviewer">
                <option value="reviewer">{dict.roles.reviewer}</option>
                <option value="researcher">{dict.roles.researcher}</option>
                <option value="reporter">{dict.roles.reporter}</option>
                <option value="field_agent">{dict.roles.field_agent}</option>
                <option value="contributor_hr">{isRTL ? 'إدارة الموارد البشرية (HR)' : 'HR / Recruitment'}</option>
                <option value="contributor_admin">{isRTL ? 'مدير شبكة المساهمين' : 'Network Admin'}</option>
                <option value="fraud_reviewer">{isRTL ? 'مراقب الاحتيال والجودة' : 'Fraud Reviewer'}</option>
                <option value="quality_reviewer">{isRTL ? 'مراجع تقييمات' : 'Quality Reviewer'}</option>
                <option value="payment_reviewer">{isRTL ? 'مراجع مالي' : 'Payment Reviewer'}</option>
                <option value="admin">{dict.roles.admin}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="label text-xs">{isRTL ? 'فريق العمل' : 'Team Assignment'}</label>
              <select name="team" className="select-small py-2 px-4 text-sm" defaultValue="operations">
                <option value="operations">{dict.teams.operations}</option>
                <option value="online_research">{dict.teams.online_research}</option>
                <option value="offline_sourcing">{dict.teams.offline_sourcing}</option>
                <option value="reporting">{dict.teams.reporting}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <label className="label text-xs">{isRTL ? 'صلاحيات وقدرات إضافية' : 'Extra Capabilities & Permissions'}</label>
              <div className="flex gap-4 flex-wrap p-3" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                {[
                  { code: 'reviewer', label: dict.roles.reviewer },
                  { code: 'researcher', label: dict.roles.researcher },
                  { code: 'field_agent', label: dict.roles.field_agent },
                  { code: 'reporter', label: dict.roles.reporter },
                  { code: 'deals_manager', label: dict.roles.deals_manager },
                  { code: 'news_manager', label: dict.roles.news_manager },
                  { code: 'pricing_manager', label: dict.roles.pricing_manager },
                  { code: 'content_manager', label: dict.roles.content_manager },
                  { code: 'vendor_relations', label: isRTL ? 'علاقات الموردين' : 'Vendor Relations' },
                  { code: 'contributor_hr', label: isRTL ? 'موارد بشرية (HR)' : 'HR' },
                  { code: 'contributor_admin', label: isRTL ? 'مدير شبكة' : 'Network Admin' },
                  { code: 'fraud_reviewer', label: isRTL ? 'مراقب احتيال' : 'Fraud Reviewer' },
                  { code: 'quality_reviewer', label: isRTL ? 'مراجع تقييمات' : 'Quality Reviewer' },
                  { code: 'payment_reviewer', label: isRTL ? 'مراجع مالي' : 'Payment Reviewer' }
                ].map(rc => (
                  <label key={`add-cap-${rc.code}`} className="flex items-center gap-1 text-xs" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" name="extra_roles" value={rc.code} style={{ accentColor: 'var(--accent)' }} />
                    {rc.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="btn-accent px-8 py-3 font-bold text-sm" style={{ width: 'auto' }}>
                {isRTL ? '💾 حفظ وإضافة الموظف' : '💾 Create Employee Account'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Search & Filters */}
      <section className="glass-card p-6 mb-8" style={{ borderRadius: '24px' }}>
        <form action="" method="GET" className="flex gap-4 items-center flex-wrap">
          <input type="hidden" name="tab" value={activeTab} />
          
          <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '240px' }}>
            <label className="label">{isRTL ? 'بحث بالاسم، الكود، أو البريد' : 'Search by Name, Code, or Email'}</label>
            <input 
              type="text" 
              name="q" 
              placeholder={isRTL ? 'اكتب كلمة البحث هنا...' : 'Type search terms here...'} 
              className="filter-input py-2 px-4 text-sm" 
              defaultValue={searchQ}
            />
          </div>

          {activeTab === 'staff' && (
            <>
              <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '180px' }}>
                <label className="label">{dict.staff_management.filter_role}</label>
                <select name="role" className="select-small py-2 px-4 text-sm" defaultValue={filterRole || ''}>
                  <option value="">{dict.staff_management.filter_all_roles}</option>
                  <option value="admin">{dict.roles.admin}</option>
                  <option value="reviewer">{dict.roles.reviewer}</option>
                  <option value="researcher">{dict.roles.researcher}</option>
                  <option value="reporter">{dict.roles.reporter}</option>
                  <option value="field_agent">{dict.roles.field_agent}</option>
                  <option value="contributor_hr">{isRTL ? 'إدارة الموارد البشرية (HR)' : 'HR / Recruitment'}</option>
                  <option value="contributor_admin">{isRTL ? 'مدير شبكة المساهمين' : 'Network Admin'}</option>
                  <option value="fraud_reviewer">{isRTL ? 'مراقب الاحتيال والجودة' : 'Fraud Reviewer'}</option>
                  <option value="quality_reviewer">{isRTL ? 'مراجع تقييمات' : 'Quality Reviewer'}</option>
                  <option value="payment_reviewer">{isRTL ? 'مراجع مالي' : 'Payment Reviewer'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '180px' }}>
                <label className="label">{dict.staff_management.filter_team}</label>
                <select name="team" className="select-small py-2 px-4 text-sm" defaultValue={filterTeam || ''}>
                  <option value="">{dict.staff_management.filter_all_teams}</option>
                  <option value="operations">{dict.teams.operations}</option>
                  <option value="online_research">{dict.teams.online_research}</option>
                  <option value="offline_sourcing">{dict.teams.offline_sourcing}</option>
                  <option value="reporting">{dict.teams.reporting}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '150px' }}>
                <label className="label">{dict.staff_management.filter_status}</label>
                <select name="active" className="select-small py-2 px-4 text-sm" defaultValue={filterActive || ''}>
                  <option value="">{isRTL ? 'الكل (نشط وغير نشط)' : 'All (Active & Inactive)'}</option>
                  <option value="true">{dict.staff_management.filter_active_only}</option>
                  <option value="false">{dict.staff_management.filter_inactive_only}</option>
                  <option value="archived">{isRTL ? 'الموظفين المؤرشفين' : 'Archived Staff'}</option>
                </select>
              </div>

              <div className="flex items-center gap-2" style={{ alignSelf: 'flex-end', paddingBottom: '12px' }}>
                <input type="checkbox" name="showAdmins" id="showAdmins" value="true" defaultChecked={showAdmins} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                <label htmlFor="showAdmins" className="label mb-0" style={{ textTransform: 'none' }}>{dict.staff_management.include_admins}</label>
              </div>
            </>
          )}

          {activeTab === 'customers' && (
            <div className="flex flex-col gap-2 flex-1" style={{ minWidth: '180px' }}>
              <label className="label">{isRTL ? 'حالة العميل' : 'Customer Status'}</label>
              <select name="customerStatus" className="select-small py-2 px-4 text-sm" defaultValue={filterCustomerStatus}>
                <option value="all">{isRTL ? 'الكل (نشط ومعطل)' : 'All (Active & Suspended)'}</option>
                <option value="active">{isRTL ? 'نشط فقط' : 'Active Only'}</option>
                <option value="suspended">{isRTL ? 'معطل / موقوف مؤقتاً' : 'Suspended Only'}</option>
                <option value="blocked">{isRTL ? 'المحظورين' : 'Blocked'}</option>
                <option value="archived">{isRTL ? 'المؤرشفين' : 'Archived'}</option>
              </select>
            </div>
          )}

          <div className="flex gap-2" style={{ alignSelf: 'flex-end', paddingBottom: '4px' }}>
            <button type="submit" className="btn-accent px-6 py-2" style={{ width: 'auto' }}>
              {isRTL ? '🔍 تطبيق التصفية' : '🔍 Apply Filters'}
            </button>
            <Link href={`/${locale}/staff/users?tab=${activeTab}`} className="lang-btn lang-btn-inactive px-6 py-2 block" style={{ textDecoration: 'none' }}>
              {dict.staff_management.btn_reset}
            </Link>
          </div>
        </form>
      </section>

      {/* Selected Customer Orders Panel */}
      {selectedCustomerData && (
        <section className="glass-card p-6 mb-8 border-accent" style={{ borderRadius: '24px', border: '1px solid var(--accent)' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-black mb-1">
                {isRTL ? `🛍️ طلبات العميل: ${selectedCustomerData.full_name || 'بـدون اسـم'}` : `🛍️ Orders of Customer: ${selectedCustomerData.full_name || 'No Name'}`}
              </h2>
              <p className="text-xs text-muted">
                {isRTL 
                  ? `بريد: ${selectedCustomerData.email || '—'} | هاتف: ${selectedCustomerData.phone_number_raw || '—'}` 
                  : `Email: ${selectedCustomerData.email || '—'} | Phone: ${selectedCustomerData.phone_number_raw || '—'}`
                }
              </p>
            </div>
            <Link href={`/${locale}/staff/users?tab=${activeTab}`} className="badge badge-muted py-2 px-4 text-xs font-bold" style={{ textDecoration: 'none' }}>
              {isRTL ? '❌ إغلاق عرض الطلبات' : '❌ Close View'}
            </Link>
          </div>

          {selectedCustomerOrders.length === 0 ? (
            <div className="p-8 text-center text-muted italic">
              {isRTL ? 'لا توجد طلبات مسجلة لهذا العميل' : 'No requests recorded for this customer.'}
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{isRTL ? 'كود الطلب والعنوان' : 'Request Code & Title'}</th>
                    <th>{isRTL ? 'تاريخ الإنشاء' : 'Date Created'}</th>
                    <th>{isRTL ? 'حالة الطلب' : 'Request Status'}</th>
                    <th>{isRTL ? 'التحكم بالطلب' : 'Request Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomerOrders.map((order) => {
                    const isCancelled = order.is_cancelled || order.current_status === 'cancelled'
                    return (
                      <tr key={`req-${order.id}`}>
                        <td>
                          <div className="font-bold text-white">{order.title}</div>
                          <span className="badge badge-muted font-mono mt-1">{order.request_code}</span>
                        </td>
                        <td>{formatDate(order.created_at, locale)}</td>
                        <td>
                          <span className={`badge ${isCancelled ? 'badge-red' : 'badge-green'}`}>
                            {isCancelled ? (isRTL ? '❌ ملغي / موقوف' : '❌ Cancelled / Suspended') : order.current_status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {isCancelled ? (
                              <form action={handleReactivateRequest}>
                                <input type="hidden" name="requestId" value={order.id} />
                                <input type="hidden" name="locale" value={locale} />
                                <button type="submit" className="btn-action-sm py-1 px-3" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none' }}>
                                  {isRTL ? '✔️ تفعيل الطلب' : '✔️ Reactivate'}
                                </button>
                              </form>
                            ) : (
                              <form action={handleCancelRequest} className="flex gap-1 items-center">
                                <input type="hidden" name="requestId" value={order.id} />
                                <input type="hidden" name="locale" value={locale} />
                                <input 
                                  type="text" 
                                  name="reason" 
                                  placeholder={isRTL ? 'سبب الإيقاف...' : 'Reason...'} 
                                  className="filter-input py-1 px-2 text-xs" 
                                  style={{ width: '120px' }} 
                                  required 
                                />
                                <button type="submit" className="btn-action-sm py-1 px-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }}>
                                  {isRTL ? '🛑 إيقاف الطلب' : '🛑 Suspend'}
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ✏️ EDIT STAFF MODAL OVERLAY */}
      {editingStaff && (
        <ModalBackdrop closeHref={`/${locale}/staff/users?tab=staff&q=${searchQ}`}>
          <div className="glass-card w-full relative" style={{ borderRadius: '20px', border: '1px solid rgba(212,166,60,0.35)', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-[10px] text-accent/60 font-medium uppercase tracking-widest mb-0.5">{isRTL ? 'تعديل بيانات موظف' : 'Edit Employee'}</div>
                <h2 className="text-sm font-black text-white mb-0 leading-tight">{editingStaff.name}</h2>
              </div>
              <Link href={`/${locale}/staff/users?tab=staff&q=${searchQ}`} className="text-white/40 hover:text-white/70 transition-colors text-lg leading-none" style={{ textDecoration: 'none' }}>✕</Link>
            </div>

            <form action={handleUpdateStaff} className="flex flex-col gap-2.5">
              <input type="hidden" name="staffId" value={editingStaff.id} />
              <input type="hidden" name="locale" value={locale} />

              <div className="flex flex-col gap-1">
                <label className="label text-[10px] mb-0.5">{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                <input type="text" name="fullName" defaultValue={editingStaff.name || ''} className="filter-input py-2 px-3 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-[10px] mb-0.5">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                <input type="email" name="email" defaultValue={editingStaff.email || ''} className="filter-input py-2 px-3 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="label text-[10px] mb-0.5">{isRTL ? 'رقم الهاتف' : 'Phone'}</label>
                  <input type="text" name="phone" defaultValue={editingStaff.phone || ''} className="filter-input py-2 px-3 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="label text-[10px] mb-0.5">{isRTL ? 'كلمة مرور جديدة' : 'New Password'}</label>
                  <input type="password" name="password" placeholder="••••••" className="filter-input py-2 px-3 text-xs" minLength={6} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="label text-[10px] mb-0.5">{isRTL ? 'الدور' : 'Role'}</label>
                  <select name="role" className="select-small py-2 px-2 text-xs" defaultValue={editingStaff.role || ''}>
                    <option value="admin">{dict.roles.admin}</option>
                    <option value="reviewer">{dict.roles.reviewer}</option>
                    <option value="researcher">{dict.roles.researcher}</option>
                    <option value="reporter">{dict.roles.reporter}</option>
                    <option value="field_agent">{dict.roles.field_agent}</option>
                    <option value="contributor_hr">{isRTL ? 'إدارة الموارد البشرية (HR)' : 'HR / Recruitment'}</option>
                    <option value="contributor_admin">{isRTL ? 'مدير شبكة المساهمين' : 'Network Admin'}</option>
                    <option value="fraud_reviewer">{isRTL ? 'مراقب الاحتيال والجودة' : 'Fraud Reviewer'}</option>
                    <option value="quality_reviewer">{isRTL ? 'مراجع تقييمات' : 'Quality Reviewer'}</option>
                    <option value="payment_reviewer">{isRTL ? 'مراجع مالي' : 'Payment Reviewer'}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="label text-[10px] mb-0.5">{isRTL ? 'الفريق' : 'Team'}</label>
                  <select name="team" className="select-small py-2 px-2 text-xs" defaultValue={editingStaff.team || ''}>
                    <option value="operations">{dict.teams.operations}</option>
                    <option value="online_research">{dict.teams.online_research}</option>
                    <option value="offline_sourcing">{dict.teams.offline_sourcing}</option>
                    <option value="reporting">{dict.teams.reporting}</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Extra Capabilities */}
              <details className="w-full">
                <summary className="cursor-pointer outline-none" style={{ listStyle: 'none' }}>
                  <div className="modal-section-toggle">
                    <span>🛡️ {isRTL ? 'الصلاحيات الإضافية' : 'Extra Permissions'}</span>
                    <span className="modal-toggle-arrow">▾</span>
                  </div>
                </summary>
                <div className="modal-capabilities-grid">
                  {[
                    { code: 'reviewer', label: dict.roles.reviewer },
                    { code: 'researcher', label: dict.roles.researcher },
                    { code: 'field_agent', label: dict.roles.field_agent },
                    { code: 'reporter', label: dict.roles.reporter },
                    { code: 'deals_manager', label: dict.roles.deals_manager },
                    { code: 'news_manager', label: dict.roles.news_manager },
                    { code: 'pricing_manager', label: dict.roles.pricing_manager },
                    { code: 'content_manager', label: dict.roles.content_manager },
                    { code: 'vendor_relations', label: isRTL ? 'علاقات الموردين' : 'Vendor Relations' },
                    { code: 'contributor_hr', label: isRTL ? 'موارد بشرية (HR)' : 'HR' },
                    { code: 'contributor_admin', label: isRTL ? 'مدير شبكة' : 'Network Admin' },
                    { code: 'fraud_reviewer', label: isRTL ? 'مراقب احتيال' : 'Fraud Reviewer' },
                    { code: 'quality_reviewer', label: isRTL ? 'مراجع تقييمات' : 'Quality Reviewer' },
                    { code: 'payment_reviewer', label: isRTL ? 'مراجع مالي' : 'Payment Reviewer' }
                  ].map(rc => (
                    <label key={`modal-staff-cap-${rc.code}`} className="modal-cap-item">
                      <input
                        type="checkbox"
                        name="extra_roles"
                        value={rc.code}
                        defaultChecked={(editingStaff as any).extra_roles?.includes(rc.code)}
                        style={{ accentColor: 'var(--accent)', width: '12px', height: '12px', flexShrink: 0 }}
                      />
                      <span>{rc.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              <button type="submit" className="btn-accent py-2.5 w-full font-bold text-xs mt-1" style={{ borderRadius: '10px' }}>
                💾 {dict.staff_management.save_changes}
              </button>
            </form>

            {/* More Options */}
            <details className="w-full mt-3">
              <summary className="cursor-pointer outline-none" style={{ listStyle: 'none' }}>
                <div className="modal-more-btn">
                  <span>⚙️ {isRTL ? 'خيارات إضافية' : 'More Options'}</span>
                  <span className="modal-toggle-arrow">▾</span>
                </div>
              </summary>
              <div className="modal-more-panel">
                {/* Disable/Enable */}
                <form action={handleUpdateStaff}>
                  <input type="hidden" name="staffId" value={editingStaff.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="fullName" value={editingStaff.name || ''} />
                  <input type="hidden" name="email" value={editingStaff.email || ''} />
                  <input type="hidden" name="phone" value={editingStaff.phone || ''} />
                  <input type="hidden" name="role" value={editingStaff.role || ''} />
                  <input type="hidden" name="team" value={editingStaff.team || ''} />
                  <input type="hidden" name="currentActive" value={editingStaff.is_active ? 'true' : 'false'} />
                  {(editingStaff as any).extra_roles?.map((r: string) => (
                    <input key={`extra-role-hidden-${r}`} type="hidden" name="extra_roles" value={r} />
                  ))}
                  <button type="submit" name="toggleActive" value="true" className="modal-action-btn" style={{ color: editingStaff.is_active ? '#ef4444' : '#22c55e', borderColor: editingStaff.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)', background: editingStaff.is_active ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)' }}>
                    {editingStaff.is_active ? (isRTL ? '⏸ تعطيل الحساب' : '⏸ Disable Account') : (isRTL ? '▶ تفعيل الحساب' : '▶ Enable Account')}
                  </button>
                </form>

                {/* Archive */}
                <form action={handleToggleArchiveStaff}>
                  <input type="hidden" name="staffId" value={editingStaff.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="currentArchived" value={editingStaff.is_archived ? 'true' : 'false'} />
                  <button type="submit" className="modal-action-btn" style={{ color: 'var(--accent)', borderColor: 'rgba(212,166,60,0.2)', background: 'rgba(212,166,60,0.05)' }}>
                    {editingStaff.is_archived ? (isRTL ? '📂 إلغاء الأرشفة' : '📂 Unarchive') : (isRTL ? '🗄️ أرشفة الموظف' : '🗄️ Archive')}
                  </button>
                </form>

                {/* Delete */}
                <form action={handleDeleteStaff}>
                  <input type="hidden" name="staffId" value={editingStaff.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <ConfirmButton
                    confirmMessage={isRTL ? 'هل أنت متأكد من حذف هذا الموظف نهائياً؟' : 'Are you sure you want to delete this employee?'}
                    className="modal-action-btn w-full"
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                  >
                    {isRTL ? '🗑️ حذف نهائي' : '🗑️ Permanent Delete'}
                  </ConfirmButton>
                </form>
              </div>
            </details>
          </div>
        </ModalBackdrop>
      )}

      {/* ⚙️ MANAGE CUSTOMER MODAL OVERLAY */}
      {editingCustomer && (
        <ModalBackdrop closeHref={`/${locale}/staff/users?tab=customers&q=${searchQ}`}>
          <div className="glass-card w-full relative" style={{ borderRadius: '20px', border: '1px solid rgba(212,166,60,0.35)', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-[10px] text-accent/60 font-medium uppercase tracking-widest mb-0.5">{isRTL ? 'إدارة عميل' : 'Manage Customer'}</div>
                <h2 className="text-sm font-black text-white mb-0 leading-tight">{editingCustomer.full_name || '—'}</h2>
              </div>
              <Link href={`/${locale}/staff/users?tab=customers&q=${searchQ}`} className="text-white/40 hover:text-white/70 transition-colors text-lg leading-none" style={{ textDecoration: 'none' }}>✕</Link>
            </div>

            <div className="flex flex-col gap-3">
              <div className="modal-info-card">
                <div className="modal-info-row">
                  <span className="modal-info-label">{isRTL ? 'الكود' : 'Code'}</span>
                  <span className="modal-info-val font-mono text-accent">{editingCustomer.customer_code}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">{isRTL ? 'البريد' : 'Email'}</span>
                  <span className="modal-info-val">{editingCustomer.email || '—'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">{isRTL ? 'الهاتف' : 'Phone'}</span>
                  <span className="modal-info-val">{editingCustomer.phone_number_raw || '—'}</span>
                </div>
              </div>

              {/* Customer Actions */}
              <details className="w-full">
                <summary className="cursor-pointer outline-none" style={{ listStyle: 'none' }}>
                  <div className="modal-more-btn">
                    <span>⚙️ {isRTL ? 'إجراءات الحساب' : 'Account Actions'}</span>
                    <span className="modal-toggle-arrow">▾</span>
                  </div>
                </summary>

                <div className="modal-more-panel">
                  {/* Suspend / Activate */}
                  <form action={async () => {
                    'use server'
                    const isSuspended = editingCustomer.status === 'suspended'
                    const adminClient = await createAdminClient()
                    await adminClient.from('customers').update({
                      status: isSuspended ? 'active' : 'suspended'
                    }).eq('id', editingCustomer.id)
                    redirect(`/${locale}/staff/users?tab=customers`)
                  }}>
                    <button type="submit" className="modal-action-btn" style={{
                      color: editingCustomer.status === 'suspended' ? '#22c55e' : '#f59e0b',
                      borderColor: editingCustomer.status === 'suspended' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)',
                      background: editingCustomer.status === 'suspended' ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)'
                    }}>
                      {editingCustomer.status === 'suspended' ? (isRTL ? '✔️ تفعيل الحساب' : '✔️ Activate Account') : (isRTL ? '🛑 إيقاف الحساب' : '🛑 Suspend Account')}
                    </button>
                  </form>

                  {/* Block / Unblock */}
                  {editingCustomer.status === 'blocked' ? (
                    <form action={handleUnblockCustomer}>
                      <input type="hidden" name="customerId" value={editingCustomer.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="modal-action-btn" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)' }}>
                        🔓 {isRTL ? 'فك الحظر' : 'Unblock Account'}
                      </button>
                    </form>
                  ) : (
                    <form action={handleBlockCustomer} className="flex flex-col gap-1.5">
                      <input type="hidden" name="customerId" value={editingCustomer.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <label className="label text-[10px] mb-0">{isRTL ? '🚫 حظر الحساب' : '🚫 Block Account'}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="reason"
                          placeholder={isRTL ? 'سبب الحظر...' : 'Block reason...'}
                          className="filter-input py-1.5 px-2.5 text-xs flex-1"
                          required
                        />
                        <button type="submit" className="modal-action-btn-sm" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)' }}>
                          🚫 {isRTL ? 'حظر' : 'Block'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Archive & Delete row */}
                  <div className="flex gap-2 pt-1 border-t border-white/5 mt-1">
                    <form action={handleToggleCustomerArchive} className="flex-1">
                      <input type="hidden" name="customerId" value={editingCustomer.id} />
                      <input type="hidden" name="currentArchived" value={editingCustomer.is_archived ? 'true' : 'false'} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="modal-action-btn w-full text-[11px]" style={{ color: 'var(--accent)', borderColor: 'rgba(212,166,60,0.2)', background: 'rgba(212,166,60,0.05)' }}>
                        {editingCustomer.is_archived ? (isRTL ? '📂 إلغاء الأرشفة' : '📂 Unarchive') : (isRTL ? '🗄️ أرشفة' : '🗄️ Archive')}
                      </button>
                    </form>
                    <form action={handleDeleteCustomer} className="flex-1">
                      <input type="hidden" name="customerId" value={editingCustomer.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <ConfirmButton
                        confirmMessage={isRTL ? 'هل أنت متأكد من مسح حساب هذا العميل نهائياً؟' : 'Are you sure you want to delete this customer?'}
                        className="modal-action-btn w-full text-[11px]"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                      >
                        {isRTL ? '🗑️ مسح نهائي' : '🗑️ Delete'}
                      </ConfirmButton>
                    </form>
                  </div>

                  {/* Promote to Staff */}
                  {editingCustomer.auth_user_id ? (
                    <form action={handlePromoteToStaff} className="flex flex-col gap-1.5 pt-1 border-t border-white/5 mt-1">
                      <input type="hidden" name="customerId" value={editingCustomer.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <label className="label text-[10px] mb-0">💼 {isRTL ? 'توظيف كموظف' : 'Promote to Staff'}</label>
                      <div className="flex gap-2">
                        <select name="role" className="select-small flex-1 py-1.5 px-2 text-xs" defaultValue="reviewer">
                          <option value="reviewer">{dict.roles.reviewer}</option>
                          <option value="researcher">{dict.roles.researcher}</option>
                          <option value="reporter">{dict.roles.reporter}</option>
                          <option value="field_agent">{dict.roles.field_agent}</option>
                          <option value="contributor_hr">{isRTL ? 'إدارة الموارد البشرية (HR)' : 'HR / Recruitment'}</option>
                          <option value="contributor_admin">{isRTL ? 'مدير شبكة المساهمين' : 'Network Admin'}</option>
                          <option value="fraud_reviewer">{isRTL ? 'مراقب الاحتيال والجودة' : 'Fraud Reviewer'}</option>
                          <option value="quality_reviewer">{isRTL ? 'مراجع تقييمات' : 'Quality Reviewer'}</option>
                          <option value="payment_reviewer">{isRTL ? 'مراجع مالي' : 'Payment Reviewer'}</option>
                          <option value="admin">{dict.roles.admin}</option>
                        </select>
                        <select name="team" className="select-small flex-1 py-1.5 px-2 text-xs" defaultValue="operations">
                          <option value="operations">{dict.teams.operations}</option>
                          <option value="online_research">{dict.teams.online_research}</option>
                          <option value="offline_sourcing">{dict.teams.offline_sourcing}</option>
                          <option value="reporting">{dict.teams.reporting}</option>
                        </select>
                      </div>
                      <button type="submit" className="btn-accent py-2 text-xs font-bold" style={{ borderRadius: '8px' }}>
                        💼 {isRTL ? 'ترقية وتعيين' : 'Promote & Assign'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-[10px] italic text-red-300/50 text-center pt-1">
                      {isRTL ? 'حساب زائر — يجب التسجيل للترقية' : 'Guest account — must register to promote'}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {activeTab === 'staff' ? (
        /* 👥 STAFF / EMPLOYEES PANEL */
        <div className="data-table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{dict.staff_management.table_employee}</th>
                <th>{dict.staff_management.table_role_team}</th>
                <th>{dict.staff_management.table_status}</th>
                <th>{dict.staff_management.table_workload}</th>
                <th>{dict.staff_management.table_stats}</th>
                <th>{dict.staff_management.table_last_activity}</th>
                <th>{dict.staff_management.table_actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s, idx) => (
                <tr key={`staff-${s.id}-${idx}`}>
                  <td>
                    <div className="font-bold text-base text-white">{s.name}</div>
                    <div className="text-xs mt-1 text-accent font-medium">{s.email}</div>
                    <div className="text-xs mt-1 text-white/50">{s.phone}</div>
                    {s.is_archived && <span className="badge badge-muted mt-1">{isRTL ? '🗄️ مؤرشف' : '🗄️ Archived'}</span>}
                  </td>
                  <td>
                    <div className="text-xs font-black text-accent uppercase">{dict.roles[s.role as keyof typeof dict.roles] || s.role}</div>
                    <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.team ? (dict.teams[s.team as keyof typeof dict.teams] || s.team) : dict.staff_management.no_team}</div>
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                      {s.is_active ? dict.staff_management.active : dict.staff_management.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <span className={`workload-dot ${s.workload > 2 ? 'workload-busy' : 'workload-ready'}`}></span>
                      <span className="text-sm">{s.workload} {dict.staff_management.workload_jobs}</span>
                    </div>
                  </td>
                  <td>
                    <div className="font-bold text-white">{s.approval_rate}% {dict.staff_management.stats_accuracy}</div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {dict.staff_management.stats_summary
                        .replace('{a}', String(s.approved_count))
                        .replace('{r}', String(s.rejected_count))
                        .replace('{c}', String(s.clarification_count))}
                    </div>
                  </td>
                  <td className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {formatDate(s.last_activity, locale)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link 
                        href={`/${locale}/staff/users?tab=staff&editStaff=${s.id}&q=${searchQ}`} 
                        className="btn-accent px-4 py-2 text-xs font-bold block text-center" 
                        style={{ textDecoration: 'none', borderRadius: '12px', minWidth: '80px' }}
                      >
                        ✏️ {isRTL ? 'تعديل' : 'Edit'}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 🛍️ CUSTOMERS & BLOCKED LIST PANEL */
        <div className="data-table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isRTL ? 'العميل والكود' : 'Customer & Code'}</th>
                <th>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</th>
                <th>{isRTL ? 'الهاتف والطلبات' : 'Phone Number & Orders'}</th>
                <th>{isRTL ? 'الحالة الحالية' : 'Account Status'}</th>
                <th>{isRTL ? 'الفترة المجانية' : 'Everyday Trial Offer'}</th>
                <th>{isRTL ? 'التحكم والإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const isPhoneVerified = !!c.phone_verified_at
                const isFreeTrialUsed = !!c.free_trial_used_at
                const isBlocked = c.status === 'blocked'
                const isSuspended = c.status === 'suspended'

                return (
                  <tr key={`customer-${c.id}`} style={{ borderLeft: isBlocked ? '4px solid #ef4444' : isSuspended ? '4px solid #f59e0b' : 'none' }}>
                    <td>
                      <div className="font-bold text-base text-white">{c.full_name || '-'}</div>
                      <span className="badge badge-muted mt-1 font-mono text-10">{c.customer_code}</span>
                      {c.is_archived && <span className="badge badge-muted mt-1 ms-1">{isRTL ? '🗄️ مؤرشف' : '🗄️ Archived'}</span>}
                    </td>
                    <td className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.email || '—'}</td>
                    <td>
                      <div className="text-sm font-bold text-white">{c.phone_number_raw || '—'}</div>
                      <div className="text-xs mt-1" style={{ opacity: 0.5 }}>{c.phone_number_normalized || ''}</div>
                      
                      {/* Linked Orders Count Display */}
                      <div className="mt-2 flex items-center gap-2">
                        <Link href={`/${locale}/staff/users?tab=${activeTab}&selectedCustomer=${c.id}&q=${searchQ}&customerStatus=${filterCustomerStatus}`} className="badge badge-gold font-black" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                          📦 {isRTL ? `الطلبات (${c.orderCount})` : `Orders (${c.orderCount})`}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`badge ${isBlocked ? 'badge-red' : isSuspended ? 'badge-muted' : 'badge-green'}`}>
                          {isBlocked 
                            ? (isRTL ? '🚫 محظور' : '🚫 Blocked') 
                            : isSuspended 
                              ? (isRTL ? '🛑 معطل' : '🛑 Suspended')
                              : (isRTL ? '✔️ نشط' : '✔️ Active')
                          }
                        </span>
                        {isBlocked && c.block_reason && (
                          <div className="text-xs text-red-400 mt-1 italic max-w-xs" style={{ whiteSpace: 'normal' }}>
                            {isRTL ? `السبب: ${c.block_reason}` : `Reason: ${c.block_reason}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {isFreeTrialUsed ? (
                        <span className="badge badge-muted">
                          {isRTL ? `تم استخدامه 🎫` : `Consumed 🎫`}
                        </span>
                      ) : isPhoneVerified ? (
                        <span className="badge badge-gold font-black">
                          {isRTL ? 'متاح للاستخدام 🎁' : 'Available / Free Sourcing Ready 🎁'}
                        </span>
                      ) : (
                        <span className="badge badge-red" style={{ opacity: 0.6 }}>
                          {isRTL ? 'غير مؤهل (أكد رقم الهاتف)' : 'Not Eligible (Verify Phone)'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link 
                          href={`/${locale}/staff/users?tab=customers&editCustomer=${c.id}&q=${searchQ}`} 
                          className="btn-accent px-4 py-2 text-xs font-bold block text-center" 
                          style={{ textDecoration: 'none', borderRadius: '12px', minWidth: '80px' }}
                        >
                          ⚙️ {isRTL ? 'إدارة' : 'Manage'}
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
