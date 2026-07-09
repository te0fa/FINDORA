const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://knsjvttjkbdztxmtjxpz.supabase.co'
const supabaseKey = 'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- ALL REQUESTS WITH BIDS ---')
  const { data: customerRequests, error: errReq } = await supabase
    .from('customer_requests')
    .select('id, category, max_price, status, created_at')
  
  if (errReq) {
    console.error('Error fetching customer requests:', errReq)
    return
  }

  const { data: bids, error: errBids } = await supabase
    .from('vendor_bids')
    .select('request_id, price_amount')

  if (errBids) {
    console.error('Error fetching bids:', errBids)
    return
  }

  console.log(`Total Customer Requests: ${customerRequests.length}`)
  console.log(JSON.stringify(customerRequests, null, 2))
  console.log(`\nTotal Bids: ${bids.length}`)
  console.log(JSON.stringify(bids, null, 2))
}
run()
