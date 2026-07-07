'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function reviewContributorApplication(
  contributorId: string,
  decision: 'approved' | 'rejected'
) {
  const db = createAdminClient()

  // Update contributor status
  const contributorStatus = decision === 'approved' ? 'active' : 'suspended'
  const { error: contribError } = await (db as any).from('contributors')
    .update({ 
      status: contributorStatus,
      approved_at: decision === 'approved' ? new Date().toISOString() : null
    })
    .eq('id', contributorId)

  if (contribError) {
    return { success: false, error: contribError.message }
  }

  // Update verification request
  const { error: verificationError } = await (db as any).from('contributor_verification_requests')
    .update({
      hr_decision: decision,
      hr_reviewed_at: new Date().toISOString()
    })
    .eq('contributor_id', contributorId)

  if (verificationError) {
    // Log warning but continue if verification request wasn't created
    console.warn('Could not update verification request:', verificationError.message)
  }

  revalidatePath('/[locale]/staff/contributors', 'page')
  return { success: true }
}
