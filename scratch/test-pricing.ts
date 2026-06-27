import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '')
      process.env[key] = val
    }
  })
}

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data, error } = await supabase
    .from('service_pricing_versions')
    .select('*')
    .eq('service_key', 'everyday_purchase')
    .order('version_no', { ascending: false })
  
  if (error) {
    console.error('Error fetching pricing:', error)
    return
  }
  
  console.log('--- ALL PRICING VERSIONS FOR everyday_purchase ---')
  console.log(JSON.stringify(data, null, 2))
}

run()
