export const dynamic = 'force-dynamic'

import { 
  getStaffMemberByAuthUserId, 
  getStaffUiPermissions 
} from '@/lib/dal/staff'
import { 
  getDealsAdmin
} from '@/lib/dal/marketing'
import { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { handleCreateDeal, handleUpdateDeal, handleToggleDeal } from './actions'
import { ArchiveDealButton, HardDeleteDealButton, ToggleFeatureButton, CategoryFilter } from './ActionButtons'
import VendorFieldClient from './VendorFieldClient'

export default async function DealsManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ success?: string; error?: string; tab?: string; edit?: string; category?: string }>
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
  if (!permissions.canManageDeals && !permissions.canManageMarketing) {
    redirect(`/${locale}/staff/dashboard`)
  }

  const { success, error, tab = 'active', edit, category = 'all' } = await searchParams
  let allDeals: any[] = await getDealsAdmin() || []
  
  if (category && category !== 'all') {
    allDeals = allDeals.filter((d: any) => d.category === category)
  }

  // Derived datasets
  const now = new Date()
  const nonDeletedDeals = allDeals.filter((d: any) => d.deal_status === 'active')
  const activeDeals = nonDeletedDeals.filter((d: any) => d.is_active && (!d.starts_at || new Date(d.starts_at) <= now) && (!d.ends_at || new Date(d.ends_at) > now))
  const scheduledDeals = nonDeletedDeals.filter((d: any) => d.is_active && d.starts_at && new Date(d.starts_at) > now)
  const expiredDeals = nonDeletedDeals.filter((d: any) => !d.is_active || (d.ends_at && new Date(d.ends_at) <= now))
  const deletedDeals = allDeals.filter((d: any) => d.deal_status === 'archived')
  const featuredDeals = nonDeletedDeals.filter((d: any) => d.featured_on_homepage)

  const currentList = 
    tab === 'scheduled' ? scheduledDeals :
    tab === 'expired' ? expiredDeals :
    tab === 'deleted' ? deletedDeals :
    tab === 'featured' ? featuredDeals :
    activeDeals

  const editingDeal = edit ? (await getDealsAdmin() || []).find((d: any) => d.id === edit) : null
  const isEditing = !!editingDeal

  const successMsg = success === 'true' || success === 'updated' || success === 'archived' || success === 'deleted_permanently' || success === 'toggled_feature' || success === 'toggled'
  const errorMsg = error

  const categories = [
    { value: 'General', labelAr: 'عام / غير مصنف', labelEn: 'General / Uncategorized' },
    { value: 'Electronics - Mobiles', labelAr: 'إلكترونيات - هواتف وأجهزة', labelEn: 'Electronics - Mobiles & Devices' },
    { value: 'Electronics - Accessories', labelAr: 'إلكترونيات - إكسسوارات', labelEn: 'Electronics - Accessories' },
    { value: 'Home & Furniture', labelAr: 'المنزل والأثاث', labelEn: 'Home & Furniture' },
    { value: 'Auto - Cars', labelAr: 'سيارات ومركبات', labelEn: 'Auto - Vehicles' },
    { value: 'Auto - Spare Parts', labelAr: 'سيارات - قطع غيار وإكسسوارات', labelEn: 'Auto - Spare Parts & Accessories' },
    { value: 'Business & Wholesale', labelAr: 'أعمال وتجارة الجملة', labelEn: 'Business & Wholesale' },
    { value: 'Fashion & Clothing', labelAr: 'أزياء وملابس', labelEn: 'Fashion & Clothing' },
    { value: 'Custom Orders', labelAr: 'طلبات خاصة / خدمات', labelEn: 'Custom Orders & Services' }
  ]

  // Formatter for datetime-local
  const formatDatetimeForInput = (isoStr?: string) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  return (
    <main 
      dir={isRTL ? 'rtl' : 'ltr'} 
      style={{ 
        minHeight: '100vh', 
        background: '#060810',
        color: '#f1f5f9',
        fontFamily: "'Inter', 'Outfit', sans-serif"
      }}
      data-testid="staff-marketing-deals-page"
    >
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #d4a63c, #f59e0b, #d4a63c)', boxShadow: '0 0 20px rgba(212,166,60,0.5)' }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,166,60,0.15)', border: '1px solid rgba(212,166,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  🛍️
                </div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 0%, #d4a63c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {isRTL ? 'متجر المنتجات (Store)' : 'Store Management'}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                {isRTL ? 'إدارة المنتجات، المخزون، وأسعار المنتجات الحقيقية وتصنيفاتها.' : 'Manage physical products, inventory, categories, and store deals.'}
              </p>
            </div>
            <Link 
              href={`/${locale}/staff/dashboard`} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s' }}
            >
              ← {isRTL ? 'لوحة القيادة' : 'Dashboard'}
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <Link 
              href={`/${locale}/staff/marketing/deals`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: '#d4a63c', color: '#000', textDecoration: 'none', boxShadow: '0 0 15px rgba(212,166,60,0.3)', transition: 'all 0.2s' }}
            >
              {isRTL ? 'المنتجات (Deals)' : 'Products (Deals)'}
            </Link>
            <Link 
              href={`/${locale}/staff/marketing/pricing`} 
              style={{ padding: '0.5rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              {isRTL ? 'خصومات الباقات (Offers)' : 'Service Offers (Pricing)'}
            </Link>
          </div>
        </header>

        {successMsg && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✅ {isRTL ? 'تم تنفيذ العملية بنجاح.' : 'Operation completed successfully.'}
          </div>
        )}
        {errorMsg && (
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ {errorMsg.replace(/_/g, ' ')}
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: isRTL ? 'نشط' : 'Active Products', value: activeDeals.length, color: '#34d399', icon: '🟢' },
            { label: isRTL ? 'مجدول' : 'Scheduled', value: scheduledDeals.length, color: '#60a5fa', icon: '📅' },
            { label: isRTL ? 'مميز بالواجهة' : 'Featured', value: featuredDeals.length, color: '#f472b6', icon: '✨' },
            { label: isRTL ? 'الكل' : 'Total', value: nonDeletedDeals.length, color: '#d4a63c', icon: '📦' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.icon} {stat.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>

          {/* LEFT COLUMN: Products List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Tab Bar */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.35rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'active', label: isRTL ? 'النشطة' : 'Active', count: activeDeals.length },
                  { id: 'scheduled', label: isRTL ? 'مجدولة' : 'Scheduled', count: scheduledDeals.length },
                  { id: 'featured', label: isRTL ? 'المميزة' : 'Featured', count: featuredDeals.length },
                  { id: 'expired', label: isRTL ? 'منتهية / غير نشطة' : 'Expired/Inactive', count: expiredDeals.length },
                  { id: 'deleted', label: isRTL ? 'الأرشيف' : 'Archive', count: deletedDeals.length },
                ].map(t => (
                  <Link
                    key={t.id}
                    href={`/${locale}/staff/marketing/deals?tab=${t.id}${category !== 'all' ? `&category=${category}` : ''}`}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      ...(tab === t.id
                        ? { background: '#d4a63c', color: '#0a0a0a', boxShadow: '0 2px 12px rgba(212,166,60,0.3)' }
                        : { color: 'rgba(255,255,255,0.4)', background: 'transparent' })
                    }}
                  >
                    {t.label}
                    <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '6px', background: tab === t.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', fontSize: '0.65rem' }}>
                      {t.count}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{isRTL ? 'تصفية:' : 'Filter:'}</span>
                <div style={{ position: 'relative' }}>
                  <CategoryFilter locale={locale} tab={tab} edit={edit} defaultCategory={category} categories={categories} />
                </div>
              </div>
            </div>

            {currentList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                {isRTL ? 'لا توجد منتجات في هذا القسم.' : 'No products found in this tab.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {currentList.map((d: any) => {
                  const showPromo = d.original_price && d.deal_price < d.original_price

                  return (
                    <div
                      key={d.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: edit === d.id ? '1px solid #d4a63c' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '18px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {d.featured_on_homepage && (
                        <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <a href={`/${locale}/deals/${d.slug}`} target="_blank" rel="noreferrer" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.2s', cursor: 'pointer' }}>
                            {d.image_path ? (
                              <img src={d.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1.5rem' }}>📦</span>
                            )}
                          </a>
                          <div>
                            <a href={`/${locale}/deals/${d.slug}`} target="_blank" rel="noreferrer" style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white', marginBottom: '0.15rem', display: 'block', textDecoration: 'none' }}>
                              {isRTL ? d.title_ar : d.title_en} ↗
                            </a>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                {d.category || 'General'}
                              </div>
                              {d.vendor_name_snapshot && (
                                <div style={{ fontSize: '0.65rem', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99,102,241,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                  <span>👤 {d.vendor_name_snapshot}</span>
                                  {d.vendors?.trust_score !== undefined && d.vendors?.trust_score !== null && (
                                    <span style={{
                                      fontSize: '0.55rem', fontWeight: 800,
                                      color: d.vendors.trust_score >= 90 ? '#22c55e' : d.vendors.trust_score >= 70 ? '#f59e0b' : '#ef4444',
                                    }}>
                                      ({d.vendors.trust_score}%)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <ToggleFeatureButton id={d.id} locale={locale} isFeatured={d.featured_on_homepage} />
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {isRTL ? d.description_ar : d.description_en}
                      </div>

                      <div>
                        {showPromo ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d4a63c', lineHeight: 1 }}>{d.deal_price}</span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{d.currency_code || 'EGP'}</span>
                            <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'rgba(255,255,255,0.25)' }}>{d.original_price} {d.currency_code || 'EGP'}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{d.deal_price}</span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{d.currency_code || 'EGP'}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <Link 
                          href={`/${locale}/staff/marketing/deals?tab=${tab}&edit=${d.id}`}
                          style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4a63c', textDecoration: 'none', padding: '0.4rem 0.8rem', background: 'rgba(212,166,60,0.1)', borderRadius: '8px' }}
                        >
                          {isRTL ? 'تعديل ✏️' : 'Edit ✏️'}
                        </Link>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {tab !== 'deleted' && (
                            <form action={handleToggleDeal}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="id" value={d.id} />
                              <input type="hidden" name="is_active" value={(!d.is_active).toString()} />
                              <button 
                                type="submit" 
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', border: 'none', color: d.is_active ? '#fbbf24' : '#34d399', background: d.is_active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)' }}
                              >
                                {d.is_active ? (isRTL ? 'إيقاف' : 'Pause') : (isRTL ? 'تفعيل' : 'Activate')}
                              </button>
                            </form>
                          )}
                          
                          {/* Soft Delete -> Archive for all staff */}
                          {tab !== 'deleted' && (
                            <ArchiveDealButton id={d.id} locale={locale} />
                          )}

                          {/* Hard Delete -> Admin Only */}
                          {permissions.isAdmin && (
                            <HardDeleteDealButton id={d.id} locale={locale} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Create/Edit Form */}
          <div style={{ position: 'sticky', top: '1.5rem' }}>
            <section style={{ background: 'rgba(255,255,255,0.02)', border: isEditing ? '1px solid #d4a63c' : '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem', backdropFilter: 'blur(12px)', boxShadow: isEditing ? '0 0 20px rgba(212,166,60,0.15)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{isEditing ? '✏️' : '➕'}</span>
                  {isEditing ? (isRTL ? 'تعديل المنتج' : 'Edit Product') : (isRTL ? 'إضافة منتج جديد' : 'Create New Product')}
                </h2>
                {isEditing && (
                  <Link href={`/${locale}/staff/marketing/deals?tab=${tab}`} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 600 }}>
                    {isRTL ? 'إلغاء التعديل ✕' : 'Cancel ✕'}
                  </Link>
                )}
              </div>
              
              <form action={isEditing ? handleUpdateDeal : handleCreateDeal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input type="hidden" name="locale" value={locale} />
                {isEditing && <input type="hidden" name="id" value={editingDeal.id} />}
                
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'الاسم بالإنجليزية' : 'Title (English)'}
                  </label>
                  <input type="text" name="title_en" defaultValue={editingDeal?.title_en || ''} required style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'الاسم بالعربية' : 'Title (Arabic)'}
                  </label>
                  <input type="text" name="title_ar" defaultValue={editingDeal?.title_ar || ''} required style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                </div>

                <VendorFieldClient 
                  locale={locale} 
                  initialVendor={editingDeal?.vendor_id ? { id: editingDeal.vendor_id, display_name: editingDeal.vendor_name_snapshot || '' } : null} 
                />

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'التصنيف الشامل' : 'Detailed Category'}
                  </label>
                  <select name="category" defaultValue={editingDeal?.category || 'General'} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }}>
                    {categories.map(c => (
                      <option key={c.value} value={c.value} style={{ color: '#000' }}>{isRTL ? c.labelAr : c.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'الوصف الإنجليزي' : 'Description (English)'}
                  </label>
                  <textarea name="description_en" rows={3} defaultValue={editingDeal?.description_en || ''} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'الوصف العربي' : 'Description (Arabic)'}
                  </label>
                  <textarea name="description_ar" rows={3} defaultValue={editingDeal?.description_ar || ''} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'السعر الفعلي' : 'Deal Price'}
                    </label>
                    <input type="number" name="deal_price" defaultValue={editingDeal?.deal_price || ''} required min="0" step="0.01" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'السعر الأصلي' : 'Original Price'}
                    </label>
                    <input type="number" name="original_price" defaultValue={editingDeal?.original_price || ''} min="0" step="0.01" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'تاريخ البدء' : 'Starts At'}
                    </label>
                    <input type="datetime-local" name="starts_at" defaultValue={formatDatetimeForInput(editingDeal?.starts_at)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isRTL ? 'تاريخ الانتهاء' : 'Ends At'}
                    </label>
                    <input type="datetime-local" name="ends_at" defaultValue={formatDatetimeForInput(editingDeal?.ends_at)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isRTL ? 'صورة المنتج' : 'Product Image'}
                  </label>
                  <input type="file" name="image_file" accept="image/*" style={{ width: '100%', color: 'white', fontSize: '0.85rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{isRTL ? 'أو' : 'OR'}</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                  </div>
                  <input type="url" name="image_path" defaultValue={editingDeal?.image_path || ''} placeholder={isRTL ? "رابط الصورة (URL)" : "Image URL (Fallback)"} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.85rem' }} />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: '1rem', borderRadius: '12px' }}>
                  <input type="checkbox" name="featured_on_homepage" defaultChecked={editingDeal ? editingDeal.featured_on_homepage : false} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{isRTL ? 'عرض في قسم المميزات' : 'Feature in Highlights'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{isRTL ? 'سيظهر المنتج في الويدجت العائم بالرئيسية' : 'Show this product in the floating Deals widget'}</span>
                  </div>
                </label>

                <button 
                  type="submit" 
                  style={{ width: '100%', padding: '1rem', marginTop: '0.5rem', background: '#d4a63c', color: '#000', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212,166,60,0.3)', transition: 'all 0.2s' }}
                >
                  {isEditing ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') : (isRTL ? 'إنشاء وإضافة للمتجر' : 'Create & Add to Store')}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
