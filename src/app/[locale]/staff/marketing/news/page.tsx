import { 
  getStaffMemberByAuthUserId, 
  getStaffUiPermissions 
} from '@/lib/dal/staff'
import { 
  getAnnouncementsAdmin
} from '@/lib/dal/marketing'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { handleCreateAnnouncement, handleToggleAnnouncement } from './actions'

export default async function NewsManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const isRTL = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  const staffMember = await getStaffMemberByAuthUserId(user.id)
  if (!staffMember || !staffMember.is_active) {
    redirect(`/${locale}/auth/login`)
  }

  const permissions = getStaffUiPermissions(staffMember)
  if (!permissions.canManageNews && !permissions.canManageMarketing) {
    redirect(`/${locale}/staff/dashboard`)
  }

  const announcements = await getAnnouncementsAdmin()

  return (
    <main className="page-container" dir={isRTL ? 'rtl' : 'ltr'} data-testid="staff-marketing-news-page">
      <header className="py-8 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{dict.staff_dashboard.news_title}</h1>
            <p className="text-muted">{isRTL ? 'إدارة إعلانات وأخبار الصفحة الرئيسية' : 'Manage homepage announcements and news.'}</p>
          </div>
          <Link href={`/${locale}/staff/dashboard`} className="btn-secondary text-sm">
            {isRTL ? 'العودة للوحة القيادة' : 'Back to Dashboard'}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {announcements.map((item: any) => (
            <div key={item.id} className="glass-card p-6" data-testid="announcement-row">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">
                    {isRTL ? item.title_ar : item.title_en}
                  </h3>
                  <div className="text-xs text-muted mt-1">
                    <span className="badge badge-secondary mr-2" style={{ textTransform: 'uppercase' }}>{item.announcement_type}</span>
                    <span>{dict.staff_dashboard.news_priority}: {item.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.is_active ? (
                    <span className="badge badge-success text-xs">
                      {dict.staff_dashboard.news_active}
                    </span>
                  ) : (
                    <span className="badge badge-error text-xs">
                      {dict.staff_dashboard.news_inactive}
                    </span>
                  )}
                  
                  <form action={handleToggleAnnouncement}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="is_active" value={(!item.is_active).toString()} />
                    <button 
                      type="submit" 
                      className={`text-xs px-3 py-1 rounded-md border ${item.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'} transition-colors`}
                      data-testid="announcement-active-toggle"
                    >
                      {item.is_active ? (isRTL ? 'تعطيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
                    </button>
                  </form>
                </div>
              </div>

              <div className="text-sm text-muted mb-4 border-l-2 border-white/10 pl-4 py-1">
                {isRTL ? item.body_ar : item.body_en}
              </div>

              {item.link_url && (
                <div className="text-xs">
                  <span className="text-muted">Link: </span>
                  <a href={item.link_url} target="_blank" className="text-brand-gold hover:underline">
                    {item.link_url}
                  </a>
                </div>
              )}
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="text-center py-12 text-muted">
              {isRTL ? 'لا توجد إعلانات حالياً' : 'No announcements found.'}
            </div>
          )}
        </div>

        <div>
          <section className="glass-card p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-6">{dict.staff_dashboard.news_create_btn}</h2>
            <form action={handleCreateAnnouncement} className="space-y-4" data-testid="announcement-create-form">
              <input type="hidden" name="locale" value={locale} />
              
              <div>
                <label className="label-small">{dict.staff_dashboard.news_title_en}</label>
                <input type="text" name="title_en" className="input-small w-full" data-testid="announcement-title-en-input" placeholder="Special Offer" required />
              </div>

              <div>
                <label className="label-small">{dict.staff_dashboard.news_title_ar}</label>
                <input type="text" name="title_ar" className="input-small w-full" data-testid="announcement-title-ar-input" placeholder="عرض خاص" required />
              </div>

              <div>
                <label className="label-small">{dict.staff_dashboard.news_body_en}</label>
                <textarea name="body_en" className="input-small w-full h-24" data-testid="announcement-body-en-input" placeholder="Detailed description..." />
              </div>

              <div>
                <label className="label-small">{dict.staff_dashboard.news_body_ar}</label>
                <textarea name="body_ar" className="input-small w-full h-24" data-testid="announcement-body-ar-input" placeholder="وصف تفصيلي..." />
              </div>

              <div>
                <label className="label-small">{dict.staff_dashboard.news_link}</label>
                <input type="text" name="link_url" className="input-small w-full" data-testid="announcement-link-input" placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-small">{isRTL ? 'النوع' : 'Type'}</label>
                  <select name="announcement_type" className="select-small w-full">
                    <option value="news">News</option>
                    <option value="offer">Offer</option>
                    <option value="event">Event</option>
                    <option value="system">System</option>
                    <option value="deal">Deal</option>
                  </select>
                </div>
                <div>
                  <label className="label-small">{dict.staff_dashboard.news_priority}</label>
                  <input type="number" name="priority" defaultValue="0" className="input-small w-full" data-testid="announcement-priority-input" />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-4" data-testid="announcement-save-button">
                {dict.staff_dashboard.news_save_btn}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
