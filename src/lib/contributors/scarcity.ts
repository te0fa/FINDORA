/**
 * FINDORA Economy OS — Scarcity & Growth Hack System
 * Manages active registration slots and batch countdowns.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface ScarcityStatus {
  has_slots: boolean
  open_slots: number
  max_slots: number
  closes_at: string | null
  is_active: boolean
}

/**
 * Get the current registration availability (scarcity state)
 */
export async function getRegistrationAvailability(): Promise<ScarcityStatus> {
  const db = createAdminClient()
  
  const { data: limit, error } = await (db as any).from('contributor_scarcity_limits')
    .select('max_slots, taken_slots, closes_at, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !limit) {
    return {
      has_slots: false,
      open_slots: 0,
      max_slots: 0,
      closes_at: null,
      is_active: false
    }
  }

  const openSlots = Math.max(0, limit.max_slots - limit.taken_slots)
  const isTimeUp = new Date(limit.closes_at) <= new Date()

  return {
    has_slots: openSlots > 0 && !isTimeUp && limit.is_active,
    open_slots: openSlots,
    max_slots: limit.max_slots,
    closes_at: limit.closes_at,
    is_active: limit.is_active
  }
}

/**
 * Increment taken slots atomically (reserve slot during register)
 * Throws error if no slots available
 */
export async function reserveRegistrationSlot(): Promise<void> {
  const db = createAdminClient()

  // Find the active limit
  const { data: limit, error } = await (db as any).from('contributor_scarcity_limits')
    .select('id, max_slots, taken_slots, closes_at, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !limit) {
    throw new Error('Registration system is currently offline')
  }

  if (!limit.is_active) {
    throw new Error('Registration is currently disabled')
  }

  const isTimeUp = new Date(limit.closes_at) <= new Date()
  if (isTimeUp) {
    throw new Error('Registration window has closed')
  }

  if (limit.taken_slots >= limit.max_slots) {
    throw new Error('All registration slots have been claimed')
  }

  // Update slots
  const { error: updateError } = await (db as any).from('contributor_scarcity_limits')
    .update({ taken_slots: limit.taken_slots + 1 })
    .eq('id', limit.id)
    .lt('taken_slots', limit.max_slots) // DB concurrency safety guard

  if (updateError) {
    throw new Error('Failed to secure registration slot, please try again')
  }
}
