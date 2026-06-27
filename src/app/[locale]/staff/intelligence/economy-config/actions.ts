'use server'

import { updateEconomyConfig, simulateImpact } from '@/lib/contributors/config'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function simulateConfigAction(configKey: string, oldValue: any, newValue: any) {
  // Authentication check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Run simulation
  return simulateImpact(configKey, oldValue, newValue)
}

export async function updateConfigAction(configKey: string, newValue: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Resolve staff ID
  const { data: staff } = await (supabase
    .from('staff_members') as any)
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!staff) throw new Error('Staff not found')

  const result = await updateEconomyConfig(configKey, newValue, staff.id)
  
  if (result.success) {
    revalidatePath('/staff/intelligence/economy-config')
    revalidatePath('/contributors/dashboard')
    revalidatePath('/contributors/wallet')
  }

  return result
}
