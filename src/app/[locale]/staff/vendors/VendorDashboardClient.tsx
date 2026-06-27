'use client'

import React, { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VendorWithCategories, AccountTier, SystemStatus } from '@/lib/dal/vendors'

// ─── i18n helper ─────────────────────────────────────────────────────────────
const t = (locale: string, en: string, ar: string) => locale === 'ar' ? ar : en

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({ score, locale }: { score: number; locale: string }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'
  const bg    = score >= 90 ? 'rgba(34,197,94,0.12)' : score >= 70 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
  const label = score >= 90 ? t(locale,'Excellent','ممتاز') : score >= 70 ? t(locale,'Good','جيد') : t(locale,'Low','ضعيف')
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:999,fontSize:'0.71rem',fontWeight:700,color,background:bg,border:`1px solid ${color}33` }}>
      <span style={{ width:7,height:7,borderRadius:'50%',background:color,display:'inline-block' }} />
      {score}% · {label}
    </span>
  )
}

// ─── Tier Badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: AccountTier }) {
  const map: Record<AccountTier, { color: string; icon: string }> = {
    Gold:   { color: '#f7d46b', icon: '🥇' },
    Silver: { color: '#94a3b8', icon: '🥈' },
    Bronze: { color: '#cd7f32', icon: '🥉' },
  }
  const { color, icon } = map[tier]
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:999,fontSize:'0.71rem',fontWeight:700,color,background:`${color}18`,border:`1px solid ${color}44` }}>
      {icon} {tier}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, locale }: { status: SystemStatus; locale: string }) {
  const map: Record<SystemStatus, { color: string; en: string; ar: string }> = {
    'Active':               { color: '#22c55e', en: 'Active',    ar: 'نشط' },
    'Suspended':            { color: '#ef4444', en: 'Suspended', ar: 'موقوف' },
    'Pending Verification': { color: '#8b5cf6', en: 'Pending',   ar: 'قيد المراجعة' },
  }
  const { color, en, ar } = map[status]
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:999,fontSize:'0.71rem',fontWeight:700,color,background:`${color}15`,border:`1px solid ${color}33` }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:color,display:'inline-block' }} />
      {t(locale, en, ar)}
    </span>
  )
}

// ─── Action Modal ─────────────────────────────────────────────────────────────
type ModalType = 'suspend' | 'activate' | 'message' | 'trust' | 'archive' | null

function ActionModal({ type, vendorName, locale, onClose, onConfirm }: {
  type: ModalType; vendorName: string; locale: string
  onClose: () => void; onConfirm: (data: Record<string, string | number>) => void
}) {
  const [reason, setReason]   = useState('')
  const [message, setMessage] = useState('')
  const [delta, setDelta]     = useState<number>(0)
  const [isPending, start]    = useTransition()

  if (!type) return null

  const titles: Record<NonNullable<ModalType>, [string, string]> = {
    suspend:  ['Suspend Vendor',        'إيقاف المورد'],
    activate: ['Activate Vendor',       'تفعيل المورد'],
    message:  ['Send System Message',   'إرسال رسالة نظام'],
    trust:    ['Adjust Trust Score',    'تعديل رصيد الثقة'],
    archive:  ['Archive Vendor',        'أرشفة المورد'],
  }

  const handle = () => start(() => {
    if (type === 'suspend')  onConfirm({ reason })
    if (type === 'activate') onConfirm({})
    if (type === 'message')  onConfirm({ message })
    if (type === 'trust')    onConfirm({ delta, reason })
    if (type === 'archive')  onConfirm({ reason })
  })

  const isDanger = ['suspend', 'archive'].includes(type)
  const isSuccess = type === 'activate'

  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }} onClick={onClose}>
      <div style={{ background:'#0f172a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:32,maxWidth:480,width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h3 style={{ margin:0,fontSize:'1rem',fontWeight:800,color:'#f8fafc' }}>{t(locale,...titles[type])}</h3>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:'1.2rem' }}>✕</button>
        </div>
        <p style={{ margin:'0 0 18px',color:'#64748b',fontSize:'0.82rem' }}>
          {t(locale,'Vendor:','المورد:')} <strong style={{ color:'#e2e8f0' }}>{vendorName}</strong>
        </p>

        {type === 'suspend' && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>{t(locale,'Reason (optional)','سبب الإيقاف (اختياري)')}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} style={inp} rows={3} placeholder={t(locale,'Enter reason...','أدخل السبب...')} />
          </div>
        )}
        {type === 'archive' && (
          <div style={{ marginBottom:18 }}>
            <p style={{ color:'#f59e0b',fontSize:'0.82rem',margin:'0 0 10px' }}>
              {t(locale,'The vendor will be archived. Only an admin can permanently delete.','سيتم أرشفة المورد. الحذف النهائي للأدمن فقط.')}
            </p>
            <label style={lbl}>{t(locale,'Reason (optional)','السبب (اختياري)')}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} style={inp} rows={2} />
          </div>
        )}
        {type === 'message' && (
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>{t(locale,'Message text','نص الرسالة')}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} style={inp} rows={4} placeholder={t(locale,'Write message...','اكتب الرسالة هنا...')} />
          </div>
        )}
        {type === 'trust' && (
          <div style={{ marginBottom:18,display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <label style={lbl}>{t(locale,'Score change (+ or -)','التغيير في النقاط (+ أو -)')}</label>
              <input type="number" min={-100} max={100} value={delta} onChange={e => setDelta(Number(e.target.value))} style={{ ...inp,height:42 }} />
            </div>
            <div>
              <label style={lbl}>{t(locale,'Reason','السبب')}</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp,height:42 }} placeholder={t(locale,'Reason for adjustment','سبب التعديل')} />
            </div>
          </div>
        )}
        {type === 'activate' && (
          <p style={{ color:'#22c55e',fontSize:'0.82rem',marginBottom:18 }}>
            {t(locale,'Vendor will be set to "Active" status.','سيتم تفعيل المورد وإعادته إلى حالة "نشط".')}
          </p>
        )}

        <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 20px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:'0.83rem',fontWeight:600 }}>
            {t(locale,'Cancel','إلغاء')}
          </button>
          <button onClick={handle} disabled={isPending} style={{
            padding:'8px 20px',borderRadius:10,border:'1px solid',cursor:'pointer',fontSize:'0.83rem',fontWeight:700,
            background: isDanger ? 'rgba(239,68,68,0.12)' : isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
            color:      isDanger ? '#ef4444' : isSuccess ? '#22c55e' : '#60a5fa',
            borderColor: isDanger ? 'rgba(239,68,68,0.3)' : isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)',
          }}>
            {isPending ? '...' : type === 'suspend' ? t(locale,'Confirm Suspend','تأكيد الإيقاف')
              : type === 'activate' ? t(locale,'Activate','تفعيل')
              : type === 'message'  ? t(locale,'Send','إرسال')
              : type === 'archive'  ? t(locale,'Archive','أرشفة')
              : t(locale,'Apply','تطبيق')}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display:'block',marginBottom:6,color:'#94a3b8',fontSize:'0.78rem',fontWeight:600 }
const inp: React.CSSProperties = {
  width:'100%',padding:'10px 14px',borderRadius:10,boxSizing:'border-box' as const,
  background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#f8fafc',fontSize:'0.83rem',fontFamily:'inherit',resize:'vertical' as const,outline:'none'
}

// ─── GOVERNORATES bilingual ───────────────────────────────────────────────────
const GOVERNORATES: [string, string][] = [
  ['Cairo','القاهرة'],['Giza','الجيزة'],['Alexandria','الإسكندرية'],
  ['Dakahlia','الدقهلية'],['Sharqia','الشرقية'],['Monufia','المنوفية'],
  ['Qalyubia','القليوبية'],['Gharbia','الغربية'],['Kafr El Sheikh','كفر الشيخ'],
  ['Damietta','دمياط'],['Beheira','البحيرة'],['Ismailia','الإسماعيلية'],
  ['Port Said','بورسعيد'],['Suez','السويس'],['Faiyum','الفيوم'],
  ['Beni Suef','بني سويف'],['Minya','المنيا'],['Assiut','أسيوط'],
  ['Sohag','سوهاج'],['Qena','قنا'],['Luxor','الأقصر'],['Aswan','أسوان'],
  ['Matruh','مطروح'],['New Valley','الوادي الجديد'],
  ['North Sinai','شمال سيناء'],['South Sinai','جنوب سيناء'],['Red Sea','البحر الأحمر'],
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorDashboardClient({
  vendors: initialVendors, locale, isAdmin
}: {
  vendors: VendorWithCategories[]
  locale: string
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [vendors, setVendors]           = useState<VendorWithCategories[]>(initialVendors)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTier, setFilterTier]     = useState<string>('all')
  const [filterGov, setFilterGov]       = useState<string>('all')
  const [filterSpec, setFilterSpec]     = useState<string>('all')
  const [modal, setModal]               = useState<{ type: ModalType; vendor: VendorWithCategories } | null>(null)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [, startTransition]             = useTransition()

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Collect all unique specializations for filter dropdown
  const allSpecs = Array.from(new Map(
    vendors.flatMap(v => v.specializations).map(s => [s.id, s])
  ).values())

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || v.display_name.toLowerCase().includes(q)
      || (v.governorate || '').toLowerCase().includes(q)
      || (v.whatsapp_number || '').includes(q)
    const matchStatus = filterStatus === 'all' || v.system_status === filterStatus
    const matchTier   = filterTier   === 'all' || v.account_tier  === filterTier
    const matchGov    = filterGov    === 'all' || v.governorate   === filterGov || v.governorate === GOVERNORATES.find(g => g[0] === filterGov)?.[1]
    const matchSpec   = filterSpec   === 'all' || v.specializations.some(s => s.id === filterSpec)
    return matchSearch && matchStatus && matchTier && matchGov && matchSpec
  })

  const handleAction = useCallback(async (data: Record<string, string | number>) => {
    if (!modal) return
    const { vendor, type } = modal
    setModal(null)

    try {
      let res: Response
      if (type === 'suspend')  res = await fetch(`/api/vendors/${vendor.id}/suspend`,    { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ reason: data.reason }) })
      else if (type === 'activate') res = await fetch(`/api/vendors/${vendor.id}/activate`,   { method:'POST' })
      else if (type === 'message')  res = await fetch(`/api/vendors/${vendor.id}/message`,    { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ message: data.message }) })
      else if (type === 'trust')    res = await fetch(`/api/vendors/${vendor.id}/trust-score`,{ method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ delta: data.delta, reason: data.reason }) })
      else if (type === 'archive')  res = await fetch(`/api/vendors/${vendor.id}/archive`,    { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ reason: data.reason }) })
      else return

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t(locale,'An error occurred','حدث خطأ'))

      showToast(
        type === 'message' ? t(locale,'Message sent ✓','تم إرسال الرسالة ✓')
        : type === 'archive' ? t(locale,'Vendor archived ✓','تم أرشفة المورد ✓')
        : t(locale,'Action completed ✓','تم تنفيذ الإجراء بنجاح ✓'),
        true
      )

      startTransition(() => { router.refresh() })

      setVendors(prev => prev.map(v => {
        if (v.id !== vendor.id) return v
        if (type === 'suspend' || type === 'archive') return { ...v, system_status: 'Suspended' as SystemStatus }
        if (type === 'activate') return { ...v, system_status: 'Active' as SystemStatus }
        if (type === 'trust') {
          const newScore = Math.max(0, Math.min(100, v.trust_score + (data.delta as number)))
          const tier: AccountTier = newScore >= 90 ? 'Gold' : newScore >= 70 ? 'Silver' : 'Bronze'
          return { ...v, trust_score: newScore, account_tier: tier }
        }
        return v
      }))
    } catch (e: any) {
      showToast(e.message, false)
    }
  }, [modal, router, locale])

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  // Stats
  const stats = {
    total:   vendors.length,
    active:  vendors.filter(v => v.system_status === 'Active').length,
    pending: vendors.filter(v => v.system_status === 'Pending Verification').length,
    gold:    vendors.filter(v => v.account_tier === 'Gold').length,
  }

  return (
    <div style={{ direction: dir, fontFamily: 'inherit' }}>
      <style>{`
        .vnd-table th {
          padding: 11px 16px; text-align: ${dir === 'rtl' ? 'right' : 'left'};
          font-size: 0.7rem; font-weight: 700; color: #475569; text-transform: uppercase;
          border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; letter-spacing: 0.06em;
        }
        .vnd-table td {
          padding: 13px 16px; font-size: 0.82rem; color: #e2e8f0;
          border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle;
        }
        .vnd-table tr:hover td { background: rgba(255,255,255,0.02); }
        .qa-btn { padding: 5px 11px; border-radius: 8px; font-size: 0.7rem; font-weight: 700;
          cursor: pointer; border: 1px solid; transition: all 0.15s; white-space: nowrap; background: transparent; }
        .qa-btn:hover { filter: brightness(1.4); }
        .flt-sel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.79rem;
          font-family: inherit; cursor: pointer; outline: none; }
        .flt-sel:focus { border-color: rgba(99,102,241,0.5); }
        .stat-card { padding: 16px 20px; border-radius: 14px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07); text-align: center; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed',bottom:32,right:32,zIndex:99999,
          background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#22c55e' : '#ef4444',
          padding:'12px 22px',borderRadius:12,fontWeight:700,fontSize:'0.83rem',
          backdropFilter:'blur(12px)',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ActionModal
          type={modal.type} vendorName={modal.vendor.display_name}
          locale={locale} onClose={() => setModal(null)} onConfirm={handleAction}
        />
      )}

      {/* Page Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28,flexWrap:'wrap',gap:16 }}>
        <div>
          <h1 style={{ margin:0,fontSize:'1.6rem',fontWeight:900,color:'#f8fafc',letterSpacing:'-0.02em' }}>
            {t(locale,'Vendor Management','إدارة الموردين')}
          </h1>
          <p style={{ margin:'6px 0 0',color:'#475569',fontSize:'0.83rem' }}>
            {t(locale,`${filtered.length} of ${vendors.length} vendors`,`${filtered.length} من أصل ${vendors.length} مورد`)}
          </p>
        </div>
        <Link href={`/${locale}/staff/vendors/new`} style={{
          display:'inline-flex',alignItems:'center',gap:8,padding:'10px 22px',borderRadius:12,
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontWeight:700,
          fontSize:'0.85rem',textDecoration:'none',boxShadow:'0 4px 16px rgba(99,102,241,0.35)',
          transition:'all 0.2s'
        }}>
          + {t(locale,'Register Vendor','تسجيل مورد جديد')}
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24 }}>
        {[
          { label: t(locale,'Total Vendors','إجمالي الموردين'), value: stats.total,   color:'#818cf8' },
          { label: t(locale,'Active','النشطين'),                value: stats.active,  color:'#22c55e' },
          { label: t(locale,'Pending Review','قيد المراجعة'),   value: stats.pending, color:'#8b5cf6' },
          { label: t(locale,'Gold Tier','الدرجة الذهبية'),      value: stats.gold,    color:'#f7d46b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize:'1.6rem',fontWeight:900,color }}>{value}</div>
            <div style={{ fontSize:'0.72rem',color:'#475569',marginTop:4,fontWeight:600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:20,padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t(locale,'🔍 Search by name, city, or WhatsApp...','🔍 بحث بالاسم أو المحافظة أو الواتساب...')}
          style={{ flex:1,minWidth:200,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#f8fafc',borderRadius:10,padding:'8px 14px',fontSize:'0.81rem',fontFamily:'inherit',outline:'none' }}
        />
        <select className="flt-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">{t(locale,'All Statuses','كل الحالات')}</option>
          <option value="Active">{t(locale,'Active','نشط')}</option>
          <option value="Suspended">{t(locale,'Suspended','موقوف')}</option>
          <option value="Pending Verification">{t(locale,'Pending','قيد المراجعة')}</option>
        </select>
        <select className="flt-sel" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="all">{t(locale,'All Tiers','كل الدرجات')}</option>
          <option value="Gold">Gold 🥇</option>
          <option value="Silver">Silver 🥈</option>
          <option value="Bronze">Bronze 🥉</option>
        </select>
        <select className="flt-sel" value={filterGov} onChange={e => setFilterGov(e.target.value)}>
          <option value="all">{t(locale,'All Regions','كل المحافظات')}</option>
          {GOVERNORATES.map(([en, ar]) => (
            <option key={en} value={en}>{t(locale, en, ar)}</option>
          ))}
        </select>
        <select className="flt-sel" value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
          <option value="all">{t(locale,'All Specializations','كل التخصصات')}</option>
          {allSpecs.map(s => (
            <option key={s.id} value={s.id}>{locale === 'ar' ? s.name_ar : s.name_en}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.01)',overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center',padding:'60px 24px',color:'#334155' }}>
            <div style={{ fontSize:'2.5rem',marginBottom:12 }}>🔍</div>
            <p style={{ margin:0,fontSize:'0.9rem' }}>
              {t(locale,'No vendors match your search','لا يوجد موردون يطابقون بحثك')}
            </p>
          </div>
        ) : (
          <table className="vnd-table" style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th>{t(locale,'Vendor','المورد')}</th>
                <th>{t(locale,'Region','المنطقة')}</th>
                <th>{t(locale,'Specialization','التخصص')}</th>
                <th>{t(locale,'Trust','الثقة')}</th>
                <th>{t(locale,'Tier','الدرجة')}</th>
                <th>{t(locale,'Status','الحالة')}</th>
                <th>{t(locale,'Deals','الصفقات')}</th>
                <th>{t(locale,'Rating','التقييم')}</th>
                <th>{t(locale,'WhatsApp','واتساب')}</th>
                <th>{t(locale,'Actions','إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(vendor => (
                <tr key={vendor.id}>
                  <td>
                    <Link href={`/${locale}/staff/vendors/${vendor.id}`} style={{ color:'#e2e8f0',fontWeight:700,textDecoration:'none',fontSize:'0.86rem' }}>
                      {vendor.display_name}
                    </Link>
                    {vendor.portal_enabled && (
                      <span style={{ marginLeft:6,padding:'1px 6px',borderRadius:999,fontSize:'0.62rem',fontWeight:700,background:'rgba(34,197,94,0.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)' }}>
                        {t(locale,'Portal','بوابة')}
                      </span>
                    )}
                    {vendor.commercial_reg_number && (
                      <div style={{ color:'#334155',fontSize:'0.68rem',marginTop:2 }}>
                        {t(locale,'Reg:','س.ت:')} {vendor.commercial_reg_number}
                      </div>
                    )}
                  </td>
                  <td style={{ color:'#64748b',fontSize:'0.79rem' }}>
                    {vendor.governorate ? (
                      locale === 'ar'
                        ? (GOVERNORATES.find(g => g[0] === vendor.governorate || g[1] === vendor.governorate)?.[1] || vendor.governorate)
                        : (GOVERNORATES.find(g => g[0] === vendor.governorate || g[1] === vendor.governorate)?.[0] || vendor.governorate)
                    ) : '—'}
                    {vendor.area && <span style={{ color:'#334155' }}> / {vendor.area}</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                      {vendor.specializations.map(s => (
                        <span key={s.id} style={{ padding:'2px 7px',borderRadius:999,fontSize:'0.67rem',fontWeight:600,background:'rgba(99,102,241,0.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.18)' }}>
                          {locale === 'ar' ? s.name_ar : s.name_en}
                        </span>
                      ))}
                      {vendor.specializations.length === 0 && <span style={{ color:'#334155',fontSize:'0.72rem' }}>—</span>}
                    </div>
                  </td>
                  <td><TrustBadge score={vendor.trust_score} locale={locale} /></td>
                  <td><TierBadge tier={vendor.account_tier} /></td>
                  <td><StatusBadge status={vendor.system_status} locale={locale} /></td>
                  <td style={{ color:'#94a3b8',fontWeight:700,fontSize:'0.85rem' }}>{vendor.total_successful_deals}</td>
                  <td>
                    {vendor.avg_rating != null ? (
                      <span style={{ color:'#f59e0b',fontWeight:700,fontSize:'0.82rem' }}>
                        ★ {vendor.avg_rating.toFixed(1)} <span style={{ color:'#334155',fontSize:'0.68rem',fontWeight:400 }}>({vendor.review_count})</span>
                      </span>
                    ) : <span style={{ color:'#334155',fontSize:'0.72rem' }}>—</span>}
                  </td>
                  <td style={{ fontSize:'0.75rem',fontFamily:'monospace' }}>
                    {vendor.whatsapp_number
                      ? <span style={{ color:'#22c55e',fontWeight:600 }}>✓ {vendor.whatsapp_number}</span>
                      : <span style={{ color:'#334155' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex',gap:5,flexWrap:'nowrap' }}>
                      {vendor.system_status !== 'Suspended' ? (
                        <button className="qa-btn" style={{ color:'#ef4444',borderColor:'rgba(239,68,68,0.25)' }}
                          onClick={() => setModal({ type:'suspend', vendor })}>
                          {t(locale,'Suspend','إيقاف')}
                        </button>
                      ) : (
                        <button className="qa-btn" style={{ color:'#22c55e',borderColor:'rgba(34,197,94,0.25)' }}
                          onClick={() => setModal({ type:'activate', vendor })}>
                          {t(locale,'Activate','تفعيل')}
                        </button>
                      )}
                      <button className="qa-btn" style={{ color:'#60a5fa',borderColor:'rgba(96,165,250,0.25)' }}
                        onClick={() => setModal({ type:'message', vendor })}>
                        {t(locale,'Msg','رسالة')}
                      </button>
                      <button className="qa-btn" style={{ color:'#f7d46b',borderColor:'rgba(247,212,107,0.25)' }}
                        onClick={() => setModal({ type:'trust', vendor })}>
                        {t(locale,'Trust','تقييم')}
                      </button>
                      <button className="qa-btn" style={{ color:'#94a3b8',borderColor:'rgba(148,163,184,0.2)' }}
                        onClick={() => setModal({ type:'archive', vendor })}>
                        {t(locale,'Archive','أرشفة')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin note */}
      {isAdmin && (
        <p style={{ marginTop:12,color:'#334155',fontSize:'0.72rem',textAlign:'center' }}>
          {t(locale,
            'Admin: permanent deletion available from vendor detail page.',
            'أدمن: الحذف النهائي متاح من صفحة تفاصيل المورد.'
          )}
        </p>
      )}
    </div>
  )
}
