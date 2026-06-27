import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history = [] } = await request.json()
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check Feature Flag and Rate Caps for support chat assistant
    const { getAIFeatureStatus, logAIFeatureUsage } = await import('@/lib/dal/ai-control')
    const status = await getAIFeatureStatus('flag_ai_support_chat')
    if (!status.enabled) {
      await logAIFeatureUsage({
        featureKey: 'flag_ai_support_chat',
        success: false,
        errorMessage: status.reason || 'Disabled'
      })
      return NextResponse.json({ 
        error: 'SUPPORT_CHAT_DISABLED', 
        message: status.reason || 'Support AI chatbot is temporarily offline. Please submit a support ticket manually.' 
      }, { status: 403 })
    }

    // 1. Fetch user's active requests and status for chatbot context
    let userRequests: any[] = []
    try {
      const { data } = await supabase
        .from('requests')
        .select('id, title, request_code, payment_policy, service_fee_amount, created_at')
        .eq('customer_id', user.id)
      if (data) userRequests = data
    } catch (err) {
      // log.warn('[SUPPORT CHAT] Failed to load requests context', err)
    }


    // 2. Build AI instructions
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    const systemInstruction = `
You are the Findora Customer Support & Dispute Resolution Assistant. You help users solve issues, handle disputes with merchants, or request refunds on platform fees.
Context about the user's current requests:
${JSON.stringify(userRequests || [], null, 2)}

Instructions:
1. Act as a professional, empathetic customer care specialist.
2. If a user raises a dispute or refund request:
   - Politely ask for the specific request code (from the list above or input by user).
   - Inform them that refund requests are processed within 3 business days by our finance team once submitted.
   - Reassure them that Findora protects payment deposits and only releases payments to merchants if options match verification criteria.
3. Answer questions about how the platform works, dispute processes, and refund rules.
4. Keep answers clear, supportive, and formatted in markdown. Support both Arabic and English.
    `

    const formattedContents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I will help the user resolve disputes, support queries, and clarify refund states politely.' }] },
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    const result = await model.generateContent({
      contents: formattedContents
    })

    const responseText = result.response.text()

    await logAIFeatureUsage({
      featureKey: 'flag_ai_support_chat',
      success: true,
      estimatedCost: 0.01
    })

    return NextResponse.json({ response: responseText })
  } catch (err: any) {
    // log.error('[SUPPORT CHAT ERROR]', err.message)
    try {
      const { logAIFeatureUsage } = await import('@/lib/dal/ai-control')
      await logAIFeatureUsage({
        featureKey: 'flag_ai_support_chat',
        success: false,
        errorMessage: err.message || String(err)
      })
    } catch {}
    return NextResponse.json({ error: 'Failed to process support chat' }, { status: 500 })
  }
}
