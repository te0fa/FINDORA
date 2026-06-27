import { NextResponse } from 'next/server'
import { updateAIAgentConfigAdmin } from '@/lib/dal/ai-control'

export async function POST(request: Request) {
  try {
    const { agent_code, enabled } = await request.json()

    if (!agent_code || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await updateAIAgentConfigAdmin({ agent_code, enabled })

    return NextResponse.json({ success: true, agent_code, enabled })
  } catch (err: any) {
    // log.error('[AGENT_TOGGLE]', err)
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
