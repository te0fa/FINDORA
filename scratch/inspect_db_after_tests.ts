import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log("=== DB INSPECTION AFTER EXECUTION TESTS ===")

  // 1. Check economy stabilizer snapshots
  const { data: snapshots, error: err1 } = await supabase
    .from('economy_stabilizer_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(3)

  console.log("Latest Stabilizer Snapshots:", err1 ? err1.message : snapshots)

  // 2. Check economy stabilizer events
  const { data: events, error: err2 } = await supabase
    .from('economy_stabilizer_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  console.log("Latest Stabilizer Events:", err2 ? err2.message : events)

  // 3. Check challenge progress or badges (recalculate-networks synced these for active contributors)
  const { data: progress, error: err3 } = await supabase
    .from('contributor_challenge_progress')
    .select('*')
    .limit(3)

  console.log("Challenge Progress Rows:", err3 ? err3.message : progress)

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
