import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function insertFlags() {
  const db = createAdminClient()
  const flagsToInsert = [
    {
      config_key: 'flag_merchant_bidding',
      value: 'true',
      description_en: 'Merchant Bidding: Allow vendors to bid on report option snapshots via cryptographically signed tokens.',
      description_ar: 'مزايدات التجار: السماح للتجار بتقديم عروض أسعار مباشرة للمهام عبر روابط مشفرة.'
    },
    {
      config_key: 'flag_support_chatbot',
      value: 'true',
      description_en: 'AI Support Chatbot: Empathic Gemini agent answering disputes, request status, and refund questions.',
      description_ar: 'مساعد الدعم الذكي: وكيل ذكاء اصطناعي للرد على النزاعات وحالة الطلبات واسترجاع الأموال.'
    },
    {
      config_key: 'flag_founder_dashboard',
      value: 'true',
      description_en: 'Founder Live KPIs: Show request volume, active scouts, and sourcing stats in admin hub.',
      description_ar: 'مؤشرات المؤسسين الحية: عرض مؤشرات الأداء الكلية للمنصة وعدد المناديب والتوريد الحية.'
    }
  ]

  for (const flag of flagsToInsert) {
    // Check if it exists
    const { data: existing } = await (db.from('economy_config') as any)
      .select('id')
      .eq('config_key', flag.config_key)
      .maybeSingle()

    if (!existing) {
      const { error } = await (db.from('economy_config') as any)
        .insert({
          ...flag,
          is_system_controlled: false,
          updated_at: new Date().toISOString()
        })
      if (error) {
        console.error(`Failed to insert flag ${flag.config_key}:`, error.message)
      } else {
        console.log(`Inserted flag ${flag.config_key} successfully.`)
      }
    } else {
      console.log(`Flag ${flag.config_key} already exists.`)
    }
  }
}

insertFlags()
