const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://knsjvttjkbdztxmtjxpz.supabase.co'
const supabaseKey = 'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- ALL CUSTOMERS ---')
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone_number_raw, auth_user_id')
    .limit(10)
  
  if (error) {
    console.error('Error fetching customers:', error)
    return
  }

  console.log(JSON.stringify(customers, null, 2))
}
run()
