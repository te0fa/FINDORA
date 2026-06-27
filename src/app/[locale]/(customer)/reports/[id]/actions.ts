'use server'

import { unlockSnapshot } from '@/lib/dal/reports'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function handleUnlock(formData: FormData) {
  const snapshotId = formData.get('snapshotId') as string
  const locale = (formData.get('locale') as string) || 'en'
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  try {
    const result = await unlockSnapshot(snapshotId, user.id)
    
    // Use derived request_id for precise revalidation and redirection
    if (result?.request_id) {
       revalidatePath(`/${locale}/reports/${result.request_id}`)
       revalidatePath('/', 'layout')
       redirect(`/${locale}/reports/${result.request_id}?success=option_unlocked`)
    } else {
       redirect(`/${locale}/dashboard`)
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('[Action] Unlock failed:', err.message)
    redirect(`/${locale}/dashboard?error=unlock_failed`)
  }
}
