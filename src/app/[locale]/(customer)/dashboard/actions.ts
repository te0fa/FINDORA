'use server'

import { verifyCustomerPhone } from '@/lib/dal/customers'
import { revalidatePath } from 'next/cache'

export async function handleVerifyPhone(customerId: string, locale: string) {
  try {
    await verifyCustomerPhone(customerId)
    revalidatePath(`/${locale}/dashboard`)
    return { success: true }
  } catch (error: any) {
    console.error('Error verifying customer phone:', error)
    return { success: false, error: error.message }
  }
}
