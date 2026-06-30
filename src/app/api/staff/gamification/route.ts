import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: staffData } = await (supabase
      .from('staff_members') as any)
      .select('id, staff_role')
      .eq('auth_user_id', user.id)
      .single()

    if (!staffData || (staffData.staff_role !== 'admin' && staffData.staff_role !== 'owner' && staffData.staff_role !== 'economy_architect')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await req.json()
    
    // Support both old direct payload and new structured payload
    const referralSettings = payload.referral_settings || payload
    const roleMultipliers = payload.role_multipliers || null
    const revenueSplit = payload.revenue_split || null

    const updates = []

    // 1. Upsert referral_settings
    updates.push(supabase
      .from('economy_config')
      .upsert(
        {
          config_key: 'referral_settings',
          value: referralSettings,
          description_en: 'Referral velocity and L2 chain settings',
          description_ar: 'إعدادات سرعة الإحالة وسلسلة المستوى الثاني',
          is_system_controlled: false,
          updated_by_staff_id: staffData.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'config_key' }
      )
    )

    // 2. Upsert role_multipliers
    if (roleMultipliers) {
      updates.push(supabase
        .from('economy_config')
        .upsert(
          {
            config_key: 'role_multipliers',
            value: roleMultipliers,
            description_en: 'Base earning multipliers by contributor role',
            description_ar: 'معاملات الأرباح الأساسية حسب دور المندوب',
            is_system_controlled: false,
            updated_by_staff_id: staffData.id,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'config_key' }
        )
      )
    }

    // 3. Upsert revenue_split
    if (revenueSplit) {
      updates.push(supabase
        .from('economy_config')
        .upsert(
          {
            config_key: 'revenue_split',
            value: revenueSplit,
            description_en: 'Revenue distribution percentages for incoming payments',
            description_ar: 'نسب توزيع الأرباح للمدفوعات الواردة',
            is_system_controlled: false,
            updated_by_staff_id: staffData.id,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'config_key' }
        )
      )
    }

    // Execute all upserts concurrently
    const results = await Promise.all(updates)
    
    for (const res of results) {
      if (res.error) throw res.error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // log.error('Gamification config error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
