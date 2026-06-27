import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { Locale } from '@/lib/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getArchiveRequestsAdmin } from '@/lib/dal/archive'
import type { ArchiveRequestFilter } from '@/lib/dal/archive'
import ArchiveClientPage from './ArchiveClientPage'

export default async function StaffArchivePage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  const sParams = await searchParams
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  // 1. Auth & Permissions
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staff = await getStaffMemberByAuthUserId(user.id)
  if (!staff || !staff.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staff)
  if (!permissions.canManageArchive) {
    // Only authorized staff see the archive/cleanup tool
    redirect(`/${locale}/staff/dashboard`)
  }

  // 2. Data Fetching
  const filter: ArchiveRequestFilter = {
    status: (sParams.status as any) || 'ARCHIVED',
    backupStatus: (sParams.backupStatus as any) || 'ALL',
    search: sParams.q as string,
    limit: parseInt(sParams.limit as string || '50'),
    offset: parseInt(sParams.offset as string || '0'),
    dateFrom: sParams.dateFrom as string,
    dateTo: sParams.dateTo as string
  }

  const { items, total } = await getArchiveRequestsAdmin(filter)

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="archive-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .archive-header { margin-bottom: 30px; }
        .archive-title { font-size: 2.2rem; font-weight: 900; margin-bottom: 8px; color: white; letter-spacing: -0.02em; }
        .archive-subtitle { color: rgba(255,255,255,0.5); font-size: 0.95rem; }
        
        .state-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .state-ARCHIVED { background: rgba(168,85,247,0.15); color: #c084fc; }
        .state-COMPLETED { background: rgba(34,197,94,0.15); color: #4ade80; }
        .state-ISSUES { background: rgba(239,68,68,0.15); color: #f87171; }
        
        .action-btn {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
        }
        
        .btn-backup { background: rgba(212,166,60,0.1); color: #d4a63c; border-color: rgba(212,166,60,0.2); }
        .btn-backup:hover { background: rgba(212,166,60,0.2); }
        
        .btn-download { background: rgba(59,130,246,0.1); color: #60a5fa; border-color: rgba(59,130,246,0.2); }
        .btn-download:hover { background: rgba(59,130,246,0.2); }
        
        .btn-delete { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }
        .btn-delete:hover { background: rgba(239,68,68,0.2); }

        .btn-archive { background: rgba(168,85,247,0.1); color: #c084fc; border-color: rgba(168,85,247,0.2); }
        .btn-archive:hover { background: rgba(168,85,247,0.2); }

        .btn-restore { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.2); }
        .btn-restore:hover { background: rgba(245,158,11,0.2); }
        
        .btn-secondary { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.1); }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); }
        
        .btn-disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
      ` }} />

      <header className="archive-header">
        <Link href={`/${locale}/staff/dashboard`} style={{ color: '#d4a63c', textDecoration: 'none', fontSize: '0.9rem', display: 'block', marginBottom: '10px' }}>
          {isRTL ? '← العودة للوحة التحكم' : '← Back to Dashboard'}
        </Link>
        <h1 className="archive-title">
          {isRTL ? 'الأرشيف وتنظيف البيانات' : 'Archive & Cleanup'}
        </h1>
        <p className="archive-subtitle">
          {isRTL 
            ? 'إدارة وحذف طلبات العملاء القديمة بشكل آمن. يجب أخذ نسخة احتياطية قبل الحذف النهائي.' 
            : 'Manage and safely delete legacy customer requests. A backup is mandatory before permanent deletion.'}
        </p>
      </header>

      <ArchiveClientPage 
        initialItems={items as any[]} 
        total={total} 
        locale={locale} 
        dict={dict} 
        permissions={permissions}
      />
    </div>
  )
}
