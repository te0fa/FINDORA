import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://knsjvttjkbdztxmtjxpz.supabase.co',
  'sb_secret_1sBkgbeLcPIpIgnddqOFoA_1wxO5XQw'
)

async function main() {
  console.log("Inserting flag_economy_stabilizer_active into economy_config...")
  
  const { data, error } = await supabase
    .from('economy_config')
    .upsert({
      config_key: 'flag_economy_stabilizer_active',
      value: 'false',
      description_en: 'Economy Stabilizer Guard: Master toggle to enable or disable all 5 economy stabilizer cron processes',
      description_ar: 'مفتاح موازن الاقتصاد: الحارس الرئيسي لتشغيل أو تعطيل عمليات موازن الاقتصاد الـ 5 بالكامل',
      is_system_controlled: false
    }, { onConflict: 'config_key' })

  if (error) {
    console.error("Error inserting feature flag:", error.message)
    process.exit(1)
  }

  console.log("Successfully inserted/updated flag_economy_stabilizer_active!")
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
