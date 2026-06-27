'use server'

import { revalidatePath } from 'next/cache'

export async function saveVerificationSettings(prevState: any, formData: FormData) {
  try {
    const isEnabled = formData.get('isEnabled') === 'on'
    const provider = formData.get('provider')
    const apiKey = formData.get('apiKey')
    const senderId = formData.get('senderId')

    console.log('[Admin] Saving Phone Verification Settings:', { isEnabled, provider, apiKey: apiKey ? '***' : '', senderId })
    
    // Here we would typically save to a system_settings table or secure vault
    // await db.from('system_settings').upsert({ key: 'sms_verification', value: { isEnabled, provider, senderId } })
    // await secureVault.store('sms_api_key', apiKey)

    // Revalidate paths that might depend on this setting
    revalidatePath('/', 'layout')

    return { success: true, message: 'Settings saved successfully' }
  } catch (error: any) {
    console.error('Error saving verification settings:', error)
    return { success: false, error: error.message || 'Failed to save settings' }
  }
}
