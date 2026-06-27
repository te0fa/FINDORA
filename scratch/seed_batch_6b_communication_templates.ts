import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const db = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Seeding Batch 6B Communication Templates (Idempotent)...')

  const templates = [
    {
      template_code: 'source_unlocked',
      channel: 'email',
      language_code: 'ar',
      subject_template: 'تم فتح بيانات البائع - Findora',
      body_template: 'مرحباً {{customer_name}}، لقد تم كشف بيانات المصدر لطلبك بناءً على موافقتك. يمكنك الآن زيارة لوحة التحكم للوصول للبيانات.',
      is_active: true
    },
    {
      template_code: 'source_unlocked',
      channel: 'email',
      language_code: 'en',
      subject_template: 'Source details unlocked - Findora',
      body_template: 'Hello {{customer_name}}, the source details for your request have been unlocked based on your approval. You can now access them from your dashboard.',
      is_active: true
    }
  ]

  for (const t of templates) {
    const { error } = await db
      .from('communication_templates')
      .upsert(t, { onConflict: 'template_code, channel, language_code' })
    
    if (error) {
      console.error(`Error upserting ${t.template_code} (${t.language_code}):`, error.message)
    } else {
      console.log(`Upserted ${t.template_code} (${t.language_code})`)
    }
  }

  console.log('Seeding complete.')
}

run()
