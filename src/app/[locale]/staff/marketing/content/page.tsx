import { 
  getStaffMemberByAuthUserId, 
  getStaffUiPermissions 
} from '@/lib/dal/staff'
import { 
  getContentBlocksAdmin
} from '@/lib/dal/marketing'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { handleSaveContentBlock, handleTogglePublish } from './actions'
import { DynamicListEditor } from './DynamicListEditor'

export default async function ContentManagementPage({
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
  if (!permissions.canManageContent && !permissions.canManageMarketing) {
    redirect(`/${locale}/staff/dashboard`)
  }

  const blocks = await getContentBlocksAdmin()
  
  const getBlock = (key: string) => blocks?.find((b: any) => b.block_key === key) || { block_key: key, content_json: {}, is_published: false }

  const faqLabels = {
    question_en: dict.staff_dashboard.cms_q_en,
    question_ar: dict.staff_dashboard.cms_q_ar,
    answer_en: dict.staff_dashboard.cms_a_en,
    answer_ar: dict.staff_dashboard.cms_a_ar,
    add_item: dict.staff_dashboard.cms_add_faq
  }

  const stepLabels = {
    title_en: dict.staff_dashboard.cms_step_title_en,
    title_ar: dict.staff_dashboard.cms_step_title_ar,
    description_en: dict.staff_dashboard.cms_step_desc_en,
    description_ar: dict.staff_dashboard.cms_step_desc_ar,
    add_item: dict.staff_dashboard.cms_add_step
  }

  return (
    <main className="page-container" dir={isRTL ? 'rtl' : 'ltr'} data-testid="staff-content-page">
      <header className="py-8 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{dict.staff_dashboard.cms_manage}</h1>
            <p className="text-muted">{isRTL ? 'إدارة محتوى الموقع وتعديل النصوص' : 'Manage site content and edit copy.'}</p>
          </div>
          <Link href={`/${locale}/staff/dashboard`} className="btn-secondary text-sm">
            {isRTL ? 'العودة للوحة القيادة' : 'Back to Dashboard'}
          </Link>
        </div>
      </header>

      <div className="bg-brand-gold/10 border border-brand-gold/20 p-4 rounded-xl mb-8 flex items-center gap-3">
        <span className="text-brand-gold text-lg">💡</span>
        <p className="text-sm text-brand-gold font-bold">{dict.staff_dashboard.cms_pricing_warn}</p>
      </div>

      <div className="space-y-12 pb-20">
        
        {/* 1. Homepage Hero */}
        <section className="glass-card p-8" data-testid="content-block-card">
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold">{dict.staff_dashboard.cms_hero}</h2>
              <code className="text-[10px] opacity-40 uppercase tracking-widest" data-testid="content-block-slug">homepage_hero</code>
            </div>
            <PublishToggle block={getBlock('homepage_hero')} locale={locale} dict={dict} />
          </header>

          <form action={handleSaveContentBlock} className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="content-homepage-hero-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="block_key" value="homepage_hero" />
            
            <div className="space-y-4">
               <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_en}</label>
                <input type="text" name="title_en" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.title_en} data-testid="content-title-en-input" />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_subtitle_en}</label>
                <textarea name="subtitle_en" className="input-small w-full h-24" defaultValue={getBlock('homepage_hero').content_json?.subtitle_en} data-testid="content-subtitle-en-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-small">{dict.staff_dashboard.cms_cta_p_en}</label>
                  <input type="text" name="cta_primary_en" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.cta_primary_en} />
                </div>
                <div>
                  <label className="label-small">{dict.staff_dashboard.cms_cta_s_en}</label>
                  <input type="text" name="cta_secondary_en" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.cta_secondary_en} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_ar}</label>
                <input type="text" name="title_ar" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.title_ar} data-testid="content-title-ar-input" />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_subtitle_ar}</label>
                <textarea name="subtitle_ar" className="input-small w-full h-24" defaultValue={getBlock('homepage_hero').content_json?.subtitle_ar} data-testid="content-subtitle-ar-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-small">{dict.staff_dashboard.cms_cta_p_ar}</label>
                  <input type="text" name="cta_primary_ar" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.cta_primary_ar} />
                </div>
                <div>
                  <label className="label-small">{dict.staff_dashboard.cms_cta_s_ar}</label>
                  <input type="text" name="cta_secondary_ar" className="input-small w-full" defaultValue={getBlock('homepage_hero').content_json?.cta_secondary_ar} />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button type="submit" className="btn-primary w-full md:w-auto px-12" data-testid="content-save-button">
                {dict.staff_dashboard.cms_save}
              </button>
            </div>
          </form>
        </section>

        {/* 2. How it works */}
        <section className="glass-card p-8" data-testid="content-block-card">
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold">{dict.staff_dashboard.cms_how}</h2>
              <code className="text-[10px] opacity-40 uppercase tracking-widest" data-testid="content-block-slug">homepage_how_it_works</code>
            </div>
            <PublishToggle block={getBlock('homepage_how_it_works')} locale={locale} dict={dict} />
          </header>

          <form action={handleSaveContentBlock} className="space-y-6" data-testid="content-how-it-works-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="block_key" value="homepage_how_it_works" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_en}</label>
                <input type="text" name="section_title_en" className="input-small w-full" defaultValue={getBlock('homepage_how_it_works').content_json?.section_title_en} />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_ar}</label>
                <input type="text" name="section_title_ar" className="input-small w-full" defaultValue={getBlock('homepage_how_it_works').content_json?.section_title_ar} />
              </div>
            </div>

            <DynamicListEditor 
              initialItems={getBlock('homepage_how_it_works').content_json?.steps || []} 
              fieldName="steps_json"
              itemSchema={{ title_en: '', title_ar: '', description_en: '', description_ar: '' }}
              labels={stepLabels}
            />

            <div className="pt-4">
              <button type="submit" className="btn-primary w-full md:w-auto px-12" data-testid="content-save-button">
                {dict.staff_dashboard.cms_save}
              </button>
            </div>
          </form>
        </section>

        {/* 3. FAQ */}
        <section className="glass-card p-8" data-testid="content-block-card">
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold">{dict.staff_dashboard.cms_faq}</h2>
              <code className="text-[10px] opacity-40 uppercase tracking-widest" data-testid="content-block-slug">homepage_faq</code>
            </div>
            <PublishToggle block={getBlock('homepage_faq')} locale={locale} dict={dict} />
          </header>

          <form action={handleSaveContentBlock} className="space-y-6" data-testid="content-faq-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="block_key" value="homepage_faq" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_en}</label>
                <input type="text" name="section_title_en" className="input-small w-full" defaultValue={getBlock('homepage_faq').content_json?.section_title_en} />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_ar}</label>
                <input type="text" name="section_title_ar" className="input-small w-full" defaultValue={getBlock('homepage_faq').content_json?.section_title_ar} />
              </div>
            </div>

            <DynamicListEditor 
              initialItems={getBlock('homepage_faq').content_json?.items || []} 
              fieldName="items_json"
              itemSchema={{ question_en: '', question_ar: '', answer_en: '', answer_ar: '' }}
              labels={faqLabels}
            />

            <div className="pt-4">
              <button type="submit" className="btn-primary w-full md:w-auto px-12" data-testid="content-save-button">
                {dict.staff_dashboard.cms_save}
              </button>
            </div>
          </form>
        </section>

        {/* 4. Service Copy */}
        <section className="glass-card p-8" data-testid="content-block-card">
          <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold">{dict.staff_dashboard.cms_service} (Everyday Purchase)</h2>
              <code className="text-[10px] opacity-40 uppercase tracking-widest" data-testid="content-block-slug">service_everyday_purchase_copy</code>
            </div>
            <PublishToggle block={getBlock('service_everyday_purchase_copy')} locale={locale} dict={dict} />
          </header>

          <form action={handleSaveContentBlock} className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="content-service-copy-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="block_key" value="service_everyday_purchase_copy" />
            
            <div className="space-y-4">
               <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_en}</label>
                <input type="text" name="title_en" className="input-small w-full" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.title_en} />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_desc_en}</label>
                <textarea name="description_en" className="input-small w-full h-32" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.description_en} />
              </div>
              <div>
                <label className="label-small">Benefits EN (one per line)</label>
                <textarea name="benefits_en" className="input-small w-full h-24" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.benefits_en?.join('\n')} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_title_ar}</label>
                <input type="text" name="title_ar" className="input-small w-full" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.title_ar} />
              </div>
              <div>
                <label className="label-small">{dict.staff_dashboard.cms_desc_ar}</label>
                <textarea name="description_ar" className="input-small w-full h-32" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.description_ar} />
              </div>
               <div>
                <label className="label-small">Benefits AR (one per line)</label>
                <textarea name="benefits_ar" className="input-small w-full h-24" defaultValue={getBlock('service_everyday_purchase_copy').content_json?.benefits_ar?.join('\n')} />
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button type="submit" className="btn-primary w-full md:w-auto px-12" data-testid="content-save-button">
                {dict.staff_dashboard.cms_save}
              </button>
            </div>
          </form>
        </section>

      </div>
    </main>
  )
}

function PublishToggle({ block, locale, dict }: { block: any, locale: string, dict: any }) {
  if (!block.id) return <span className="text-[10px] opacity-40 uppercase tracking-widest">{dict.staff_dashboard.cms_draft} (New)</span>

  return (
    <div className="flex items-center gap-4">
      {block.is_published ? (
        <span className="badge badge-success text-[10px] px-3">{dict.staff_dashboard.cms_published}</span>
      ) : (
        <span className="badge badge-secondary text-[10px] px-3">{dict.staff_dashboard.cms_draft}</span>
      )}
      
      <form action={handleTogglePublish}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={block.id} />
        <input type="hidden" name="is_published" value={(!block.is_published).toString()} />
        <button 
          type="submit" 
          className="text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:underline"
          data-testid="content-publish-toggle"
        >
          {block.is_published ? dict.staff_dashboard.cms_unpublish : dict.staff_dashboard.cms_publish}
        </button>
      </form>
    </div>
  )
}
