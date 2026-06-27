import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://knsjvttjkbdztxmtjxpz.supabase.co',
  'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
)

async function inspect(viewName: string) {
  const { data, error } = await supabase.from(viewName).select('*').limit(1)
  if (error) { console.log(`${viewName}: ERROR ${error.message}`); return }
  if (!data?.length) { console.log(`${viewName}: EMPTY`); return }
  console.log(`\n=== ${viewName} (${Object.keys(data[0]).length} cols) ===`)
  Object.entries(data[0]).forEach(([k,v]) => {
    console.log(`  ${k.padEnd(50)} [${(v===null?'null':typeof v).padEnd(8)}] ${String(v).slice(0,70)}`)
  })
}

async function main() {
  await inspect('v_customer_request_portal_overview')
  await inspect('v_staff_request_workspace_overview')
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
