import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { config_key, value } = await request.json()

    if (!config_key || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const db = createAdminClient()
    const { error } = await (db as any).from('economy_config')
      .update({
        value: String(value),
        updated_at: new Date().toISOString(),
      })
      .eq('config_key', config_key)

    if (error) {
      // log.error('[FEATURE_FLAG_TOGGLE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, config_key, value })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await (db as any).from('economy_config')
      .select('config_key, value, description_en, description_ar')
      .like('config_key', 'flag_%')
      .order('config_key', { ascending: true })

    if (error) return NextResponse.json({ flags: [] })
    return NextResponse.json({ flags: data ?? [] })
  } catch {
    return NextResponse.json({ flags: [] })
  }
}
