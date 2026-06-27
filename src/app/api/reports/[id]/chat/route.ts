import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCustomerReportSnapshots } from '@/lib/dal/reports'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params
  
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

    // Fetch report snapshots (this safely enforces ownership and masking)
    const snapshots = await getCustomerReportSnapshots(requestId, user.id)
    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ error: 'Report not found or inaccessible' }, { status: 404 })
    }

    // Check Feature Flag and Rate Caps for report chat assistant
    const { getAIFeatureStatus, logAIFeatureUsage } = await import('@/lib/dal/ai-control')
    const status = await getAIFeatureStatus('flag_ai_report_chat')
    if (!status.enabled) {
      await logAIFeatureUsage({
        featureKey: 'flag_ai_report_chat',
        success: false,
        errorMessage: status.reason || 'Disabled'
      })
      return NextResponse.json({ 
        error: 'AI_CHAT_DISABLED', 
        message: status.reason || 'Sourcing AI chatbot is temporarily offline. Please contact our support team.' 
      }, { status: 403 })
    }

    // Determine if the report has been unlocked
    const isUnlocked = snapshots.some(s => !s.reveal_locked)

    // Build model system instructions with context
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    const systemInstruction = `
You are the Findora AI Sourcing and Negotiation Assistant. You help customers review and compare their customized search report and negotiate/decide between options.
Here is the context about the sourced options compiled for the customer:
- Current Report Lock Status: ${isUnlocked ? 'UNLOCKED (Full vendor contact, exact name, and maps are visible)' : 'LOCKED (Only preview summaries are visible, prices are shown but vendor details are hidden until payment)'}

Sourced Snapshot Options:
${JSON.stringify(snapshots.map(s => ({
  title: s.option_label,
  match_score: s.final_score,
  price: s.display_price_amount,
  currency: s.currency_code,
  advantages: s.advantages_en || s.reason_summary,
  disadvantages: s.disadvantages_en || 'None specified',
  store_name: s.revealedSourceText || 'Locked (Payment required)',
  contact_info: s.revealedContactInfo || 'Locked (Payment required)',
  location: s.revealedMerchantLocation || 'Locked (Payment required)',
  link: s.revealedSourceUrl || '#'
})), null, 2)}

Instructions:
1. Act as a friendly, expert sourcing negotiator.
2. If the report is LOCKED and the user asks for vendor names, phones, or maps, remind them politely in both English and Arabic that they need to click the payment panel above to unlock full details.
3. Help them compare prices, specs, pros/cons, and match scores.
4. Keep your answers concise, structured, and helpful. You can respond in the language they ask (Arabic or English).
    `

    // Setup chat with history
    const formattedContents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I will help the customer compare and negotiate these options, keeping lock states in mind.' }] },
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    const result = await model.generateContent({
      contents: formattedContents
    })

    const response = await result.response
    const responseText = response.text()

    await logAIFeatureUsage({
      featureKey: 'flag_ai_report_chat',
      success: true,
      estimatedCost: 0.01
    })

    return NextResponse.json({ response: responseText })
  } catch (err: any) {
    console.error('[CHAT API ERROR]', err.message)
    try {
      const { logAIFeatureUsage } = await import('@/lib/dal/ai-control')
      await logAIFeatureUsage({
        featureKey: 'flag_ai_report_chat',
        success: false,
        errorMessage: err.message || String(err)
      })
    } catch {}
    return NextResponse.json({ error: 'Failed to process chat session' }, { status: 500 })
  }
}
