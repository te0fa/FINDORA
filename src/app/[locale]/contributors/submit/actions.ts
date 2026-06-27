'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SubmissionPayload {
  submissionType: 'price_report' | 'product_link' | 'vendor_offer'
  priceReported?: number
  details: any
}

export async function submitMarketDataAction(payload: SubmissionPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Resolve Contributor
  const { data: contributor } = await (supabase
    .from('contributors') as any)
    .select('id, role, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!contributor || contributor.status !== 'active') {
    throw new Error('Only active contributors can submit data')
  }

  // 1. Mock AI Validation (Simulation)
  // In a real scenario, this would call Gemini/Vision API to verify images or NLP for details.
  const isSuspicious = payload.priceReported && (payload.priceReported < 10 || payload.priceReported > 100000)
  const aiConfidence = isSuspicious ? 35 : Math.floor(Math.random() * 20) + 75 // 75-95 if normal, 35 if suspicious
  
  const finalDetails = {
    ...payload.details,
    ai_analysis: {
      confidence_score: aiConfidence,
      flags: isSuspicious ? ['Suspiciously extreme price'] : [],
      processed_at: new Date().toISOString()
    }
  }

  // 2. Insert into DB
  const { data, error } = await (supabase
    .from('contributor_submissions') as any)
    .insert({
      contributor_id: contributor.id,
      submission_type: payload.submissionType,
      price_reported: payload.priceReported || null,
      details: finalDetails,
      status: 'pending' // Enforcing human-in-the-loop review
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save submission: ${error.message}`)
  }

  // 3. Trigger Gamification
  const { processGamificationEvent } = await import('@/lib/contributors/gamification/actions')
  await processGamificationEvent(contributor.id, 'submission')

  revalidatePath('/contributors/dashboard')
  
  return { success: true, submissionId: data.id, aiConfidence }
}
