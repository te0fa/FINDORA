'use server'

import { trackRequestByCodeAndPhone } from '@/lib/dal/requests'
import { normalizePhone } from '@/lib/phone'

export async function getTrackResult(prevState: any, formData: FormData) {
  try {
    const requestCode = formData.get('request_code') as string
    const rawPhone = formData.get('phone_number') as string

    if (!requestCode || !rawPhone) {
      return { error: 'missing_fields' }
    }

    const phoneObj = normalizePhone(rawPhone)
    if (!phoneObj) {
      return { error: 'invalid_phone' }
    }

    const result = await trackRequestByCodeAndPhone(requestCode, phoneObj.normalized)

    if (!result) {
      return { error: 'not_found' }
    }

    return {
      success: true,
      data: result
    }

  } catch (error: any) {
    console.error('Error tracking request:', error)
    return { error: error.message || 'unknown_error' }
  }
}
