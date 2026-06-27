
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: constraints, error: cErr } = await supabase.rpc('fn_inspect_constraints', { p_table_name: 'requests' })
  
  if (cErr) {
    // If RPC doesn't exist, try raw query if possible, but Supabase JS doesn't support raw SQL easily unless there's an RPC
    console.error('RPC fn_inspect_constraints failed, trying another way...')
    
    // Let's try to just select from a table to confirm connectivity
    const { data: test, error: tErr } = await supabase.from('requests').select('intake_mode').limit(1)
    if (tErr) {
      console.error('Test query failed:', tErr.message)
    } else {
      console.log('Connected. intake_mode exists.')
    }
  } else {
    console.log('Constraints:', JSON.stringify(constraints, null, 2))
  }
}

main()
