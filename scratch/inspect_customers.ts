
import { createClient } from '@supabase/supabase-js'

async function inspectSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: cols, error: queryErr } = await supabase.from('customers').select('*').limit(1)
  console.log('Available columns in customers table:', Object.keys(cols?.[0] || {}))
}

inspectSchema()
