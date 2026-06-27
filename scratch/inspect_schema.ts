
import { createClient } from '@supabase/supabase-js'

async function inspectSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'requests' })

  if (error) {
    // If RPC fails, try information_schema
    const { data: cols, error: queryErr } = await supabase.from('requests').select('*').limit(1)
    console.log('Available columns:', Object.keys(cols?.[0] || {}))
    
    // Try to get types via a different RPC if possible or just assume
    console.log('Fetching types via information_schema query...')
    const { data: types, error: typeErr } = await supabase.from('_columns_info').select('*').eq('table_name', 'requests')
    // Wait, _columns_info is likely not a real table. 
  } else {
    console.log('Column Details:', data)
  }
}

inspectSchema()
