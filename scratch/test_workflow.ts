import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecret = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseSecret)

async function test() {
  const { data: runs, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching workflow runs:', error)
  } else {
    console.log('Recent workflow runs:', runs)
  }
}

test()
