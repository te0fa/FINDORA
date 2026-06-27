import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://knsjvttjkbdztxmtjxpz.supabase.co',
  'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
)

async function main() {
  console.log("Checking DB users and data...")

  // 1. Contributors count
  const { count: contributorsCount, error: err1 } = await supabase
    .from('contributors')
    .select('id', { count: 'exact', head: true })
  
  console.log('Contributors count:', err1 ? err1.message : contributorsCount)

  // 2. Referrals count
  const { count: referralsCount, error: err2 } = await supabase
    .from('contributor_referrals')
    .select('id', { count: 'exact', head: true })

  console.log('Referrals count:', err2 ? err2.message : referralsCount)

  // 3. Check existing feature flags
  const { data: flags, error: err3 } = await supabase
    .from('economy_config')
    .select('config_key, value')
    .like('config_key', 'flag_%')

  console.log('Feature Flags in DB:', err3 ? err3.message : flags)

  // 4. Check if flag_economy_stabilizer_active exists
  const { data: stabFlag, error: err4 } = await supabase
    .from('economy_config')
    .select('*')
    .eq('config_key', 'flag_economy_stabilizer_active')

  console.log('flag_economy_stabilizer_active exists:', err4 ? err4.message : (stabFlag && stabFlag.length > 0 ? 'YES' : 'NO'))

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
