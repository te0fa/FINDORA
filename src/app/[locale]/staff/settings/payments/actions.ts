'use server'

import { revalidatePath } from 'next/cache'

export async function savePaymentGatewaySettings(prevState: any, formData: FormData) {
  try {
    const gateway = formData.get('gateway') as string
    const isActive = formData.get('isActive') === 'on'
    
    // Simulate saving to DB
    console.log(`Saving payment gateway settings for ${gateway}`, { isActive })
    
    // Fake delay
    await new Promise(r => setTimeout(r, 500))

    const referer = formData.get('referer') as string
    if (referer) {
      revalidatePath(referer)
    }

    return { success: true, message: 'Payment settings saved successfully.' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save payment settings.' }
  }
}
