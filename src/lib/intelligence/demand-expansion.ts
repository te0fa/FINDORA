// src/lib/intelligence/demand-expansion.ts
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('intelligence/demand-expansion')

interface AIExpansionResponse {
  tasks: Array<{
    title_en: string
    title_ar: string
    description_en: string
    description_ar: string
    task_type: string
    base_reward_egp: number
  }>
}

/**
 * 1. The Real AI Call (Gemini/OpenAI)
 * In production, you would configure process.env.OPENAI_API_KEY
 */
async function callLLM(prompt: string): Promise<AIExpansionResponse | null> {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) return null // Fallback triggered automatically if no key

  try {
    // This is a generic fetch setup for an LLM like OpenAI
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: 'You are a retail task generation AI. Respond only in JSON.' }, { role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
      // Fast timeout so it fails quickly to fallback
      signal: AbortSignal.timeout(5000) 
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = JSON.parse(data.choices[0].message.content)
    return content as AIExpansionResponse
  } catch (error) {
    log.error('LLM API Error:', error)
    return null
  }
}

/**
 * 2. The Robust Fallback Programmatic Logic (Zero Cost, 100% Uptime)
 */
function programmaticFallback(productName: string, category: string): AIExpansionResponse {
  const tasks = []
  const prod = productName.toLowerCase()
  const cat = category.toLowerCase()

  // Primary Task
  tasks.push({
    title_en: `Find price for ${productName}`,
    title_ar: `إيجاد سعر لـ ${productName}`,
    description_en: `Get the exact current market price for ${productName} from a trusted store.`,
    description_ar: `ابحث عن السعر الحالي في السوق لـ ${productName} من متجر موثوق.`,
    task_type: 'price_quote',
    base_reward_egp: 20
  })

  // Accessory logic
  if (cat.includes('electronics') || cat.includes('phone') || prod.includes('iphone') || prod.includes('samsung')) {
    tasks.push({
      title_en: `Find compatible accessories for ${productName}`,
      title_ar: `البحث عن إكسسوارات متوافقة مع ${productName}`,
      description_en: `Find prices for covers, screen protectors, or chargers.`,
      description_ar: `ابحث عن أسعار الكفرات، الإسكرينات، أو الشواحن.`,
      task_type: 'market_intel',
      base_reward_egp: 10
    })
  }

  // Alternative logic
  if (cat.includes('appliance') || cat.includes('tv') || prod.includes('tv')) {
    tasks.push({
      title_en: `Find a cheaper alternative to ${productName}`,
      title_ar: `إيجاد بديل أرخص لـ ${productName}`,
      description_en: `Find a similar product with the same specs but a lower price.`,
      description_ar: `ابحث عن منتج مشابه بنفس المواصفات ولكن بسعر أقل.`,
      task_type: 'market_intel',
      base_reward_egp: 15
    })
  }

  // Warranty / Service logic
  tasks.push({
    title_en: `Check warranty details for ${productName}`,
    title_ar: `التحقق من تفاصيل الضمان لـ ${productName}`,
    description_en: `Ask stores about the warranty duration and local agent.`,
    description_ar: `اسأل المتاجر عن مدة الضمان واسم الوكيل المحلي.`,
    task_type: 'customer_assistance',
    base_reward_egp: 10
  })

  return { tasks: tasks.slice(0, 3) } // Return max 3 sub-tasks to avoid flooding
}


/**
 * 3. The Orchestrator
 */
export async function expandDemandAndCreateTasks(requestId: string, productName: string, category: string, location: string, createdByStaffId: string) {
  const supabase = await createClient()

  // Construct prompt for LLM
  const prompt = `
    A customer is looking to buy: "${productName}" (Category: ${category}) in ${location}.
    Generate 3 distinct 'platform_tasks' for gig workers to help fulfill or upsell this request.
    Task types must be one of: 'price_quote', 'market_intel', 'customer_assistance'.
    Base reward should be between 10 and 30 EGP.
    Output JSON format: { "tasks": [ { "title_en", "title_ar", "description_en", "description_ar", "task_type", "base_reward_egp" } ] }
  `

  // Check Feature Flag & Rate Caps
  let expansion = null
  try {
    const { getAIFeatureStatus, logAIFeatureUsage } = await import('@/lib/dal/ai-control')
    const status = await getAIFeatureStatus('flag_ai_demand_expansion')
    
    if (status.enabled) {
      expansion = await callLLM(prompt)
      if (expansion && expansion.tasks && expansion.tasks.length > 0) {
        await logAIFeatureUsage({
          featureKey: 'flag_ai_demand_expansion',
          success: true,
          estimatedCost: 0.02
        })
      } else {
        await logAIFeatureUsage({
          featureKey: 'flag_ai_demand_expansion',
          success: false,
          errorMessage: 'LLM returned empty or malformed tasks'
        })
      }
    } else {
      log.info('[GROWTH] AI Demand Expansion is disabled by AI Manager.')
      await logAIFeatureUsage({
        featureKey: 'flag_ai_demand_expansion',
        success: false,
        errorMessage: status.reason || 'Disabled'
      })
    }
  } catch (err: any) {
    log.error('AI Demand Expansion check failed:', err)
  }

  // Fallback to programmatic
  if (!expansion || !expansion.tasks || expansion.tasks.length === 0) {
    log.info('🤖 Falling back to programmatic expansion engine...')
    expansion = programmaticFallback(productName, category)
  }

  // Insert generated tasks into DB
  const tasksToInsert = expansion.tasks.map(t => ({
    parent_request_id: requestId,
    task_type: t.task_type,
    title_en: t.title_en,
    title_ar: t.title_ar,
    description_en: t.description_en,
    description_ar: t.description_ar,
    base_reward_egp: t.base_reward_egp,
    base_reward_points: t.base_reward_egp * 5, // 1 EGP = 5 points roughly
    location_data: { zone: location },
    min_level: 1, // Anyone can do it
    priority: 10, // Higher priority as it stems from real demand
    status: 'open',
    created_by_staff_id: createdByStaffId // System/Admin user attributing it
  }))

  const { error } = await (supabase.from('platform_tasks') as any).insert(tasksToInsert)
  
  if (error) {
    log.error('Failed to insert AI expanded tasks:', error)
    return false
  }

  // Mark request as expanded
  await (supabase.from('customer_requests') as any).update({ is_expanded_by_ai: true }).eq('id', requestId)

  return true
}
