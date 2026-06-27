import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff'
import { getStabilizerHistory } from '@/lib/contributors/stabilizer'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Economy Control Panel — FINDORA Staff',
}

export default async function EconomyPanelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isAr = locale === 'ar'

  // Admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const staff = await getStaffMemberByAuthUserId(user.id)
  const perms = staff ? getStaffUiPermissions(staff) : null
  if (!perms?.isAdmin) redirect(`/${locale}/staff/contributors`)

  // Load data
  const db = createAdminClient()
  const [stabilizerHistory, configRes, levelsRes] = await Promise.all([
    getStabilizerHistory(14),
    db.from('economy_config').select('*').order('config_key'),
    db.from('contributor_levels').select('*').order('level_number'),
  ])

  const configs = configRes.data ?? []
  const levels = levelsRes.data ?? []

  const t = {
    title: isAr ? 'لوحة التحكم الاقتصادي' : 'Economy Control Panel',
    subtitle: isAr ? 'راقب وتحكم في نظام الاقتصاد بالكامل' : 'Monitor and control the entire economy system',
    stabilizer_title: isAr ? 'المثبت الاقتصادي' : 'Economy Stabilizer',
    stabilizer_desc: isAr
      ? 'يراقب معدل نمو المدفوعات أسبوعيًا ويخفض المضاعفات تلقائيًا عند الخطر'
      : 'Monitors weekly payout growth and auto-reduces multipliers when risk detected',
    config_title: isAr ? 'إعدادات النظام' : 'System Configuration',
    levels_title: isAr ? 'مستويات الإمكانيات (Access System)' : 'Capability Levels (Access System)',
    status_normal: isAr ? 'طبيعي' : 'Normal',
    status_warning: isAr ? 'تحذير' : 'Warning',
    status_critical: isAr ? 'حرج' : 'Critical',
    growth: isAr ? 'نمو' : 'Growth',
    multiplier: isAr ? 'مضاعف' : 'Multiplier',
    action: isAr ? 'إجراء' : 'Action',
    date: isAr ? 'التاريخ' : 'Date',
    referrals_needed: isAr ? 'إحالات للفتح' : 'Referrals to Unlock',
    cap: isAr ? 'الحد الشهري' : 'Monthly Cap',
    unlimited: isAr ? 'بلا حد' : 'Unlimited',
  }

  const statusColor: Record<string, string> = {
    normal: 'hsl(152,69%,51%)',
    warning: 'hsl(43,96%,56%)',
    critical: 'hsl(0,84%,60%)',
    frozen: 'hsl(0,60%,40%)',
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
    padding: 24, backdropFilter: 'blur(20px)',
    marginBottom: 24,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(220,25%,8%), hsl(240,20%,10%))',
      color: 'hsl(220,15%,95%)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href={`/${locale}/staff/contributors`} style={{
            color: 'hsl(258,89%,70%)', textDecoration: 'none', fontSize: 14,
            display: 'inline-flex', gap: 6, marginBottom: 16,
          }}>← {isAr ? 'HR للمساهمين' : 'Contributors HR'}</a>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>{t.title}</h1>
          <p style={{ color: 'hsl(220,10%,55%)', fontSize: 14 }}>{t.subtitle}</p>
        </div>

        {/* Economy Stabilizer History */}
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{t.stabilizer_title}</h2>
            <p style={{ fontSize: 13, color: 'hsl(220,10%,55%)' }}>{t.stabilizer_desc}</p>
            <div style={{
              marginTop: 12, padding: '10px 16px', borderRadius: 8,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: 13, color: 'hsl(43,96%,65%)',
            }}>
              ⚙️ {isAr
                ? 'قاعدة: نمو > 25% → مضاعف 0.85x | نمو > 50% → مضاعف 0.70x'
                : 'Rule: growth > 25% → 0.85x multiplier | growth > 50% → 0.70x multiplier'}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'hsl(220,10%,50%)' }}>
                  {[t.date, t.status_normal + ' / ' + t.status_warning, `${t.growth} %`, t.multiplier, t.action].map(h => (
                    <th key={h} style={{ textAlign: isAr ? 'right' : 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stabilizerHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: 'hsl(220,10%,45%)', fontSize: 13 }}>
                      {isAr ? 'لا توجد بيانات بعد — سيبدأ المثبت بعد تفعيل نظام المحفظة' : 'No data yet — stabilizer activates after wallet system is live'}
                    </td>
                  </tr>
                ) : stabilizerHistory.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px' }}>{s.snapshot_date}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 999, fontSize: 11,
                        color: statusColor[s.stabilizer_status] ?? 'hsl(220,10%,60%)',
                        background: `${statusColor[s.stabilizer_status] ?? 'hsl(220,10%,60%)'}22`,
                      }}>
                        {s.stabilizer_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: s.payout_growth_pct_wow > 25 ? 'hsl(0,84%,60%)' : 'hsl(152,69%,51%)' }}>
                      {s.payout_growth_pct_wow?.toFixed(1) ?? '—'}%
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.multiplier_adjustment}x</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'hsl(220,10%,50%)' }}>{s.auto_action_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capability Levels */}
        <div style={card}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>{t.levels_title}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'hsl(220,10%,50%)' }}>
                  {['Level', 'Name', t.referrals_needed, 'Multiplier', t.cap, 'Features'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levels.map((l: any) => (
                  <tr key={l.level_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px' }}>{l.badge_icon} {l.level_number}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: l.badge_color }}>{isAr ? l.name_ar : l.name_en}</td>
                    <td style={{ padding: '10px 12px' }}>{l.required_active_referrals}</td>
                    <td style={{ padding: '10px 12px', color: 'hsl(152,69%,60%)' }}>{l.cash_multiplier}x</td>
                    <td style={{ padding: '10px 12px' }}>{l.monthly_cap_egp ? `${l.monthly_cap_egp.toLocaleString()} EGP` : t.unlimited}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'hsl(220,10%,55%)' }}>
                      {Object.entries(l.unlocked_features)
                        .filter(([, v]) => v)
                        .map(([k]) => k.replace('_', ' '))
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'hsl(220,10%,45%)', marginTop: 12 }}>
            ℹ️ {isAr ? 'لتعديل المستويات، استخدم Supabase Dashboard مباشرة مع توثيق التغيير في fraud_audit_log' : 'To edit levels, use Supabase Dashboard directly with change documented in fraud_audit_log'}
          </p>
        </div>

        {/* System Config display */}
        <div style={card}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>{t.config_title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {configs.map((cfg: any) => (
              <div key={cfg.config_key} style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{cfg.config_key}</div>
                    <div style={{ fontSize: 12, color: 'hsl(220,10%,50%)' }}>{cfg.description_en}</div>
                  </div>
                  {cfg.is_system_controlled && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11,
                      background: 'rgba(139,92,246,0.12)', color: 'hsl(258,89%,70%)',
                    }}>system</span>
                  )}
                </div>
                <pre style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)', fontSize: 12,
                  color: 'hsl(152,69%,65%)', overflow: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {JSON.stringify(cfg.value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'hsl(220,10%,45%)', marginTop: 12 }}>
            ⚠️ {isAr ? 'تعديل الإعدادات متاح عبر Supabase Dashboard فقط (للمديرين)' : 'Config editing is available via Supabase Dashboard only (admins)'}
          </p>
        </div>
      </div>
    </div>
  )
}
