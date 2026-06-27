'use server'

import { getCustomerByPhone } from '@/lib/dal/customers'
import { getCustomerRequests } from '@/lib/dal/requests'
import { normalizePhone } from '@/lib/phone'

export async function sendRecoveryOtp(phoneNumber: string) {
  try {
    const phoneObj = normalizePhone(phoneNumber)
    if (!phoneObj) {
      return { error: 'invalid_phone' }
    }

    const customer = await getCustomerByPhone(phoneObj.normalized)
    
    // We always return success to avoid phone enumeration, 
    // but in a real system we'd only send OTP if customer exists.
    if (customer) {
      console.log(`[OTP MOCK] Sending recovery code 123456 to ${phoneObj.normalized}`)
      // Here you would call your SMS provider
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending recovery OTP:', error)
    return { error: 'server_error' }
  }
}

export async function verifyRecoveryOtp(phoneNumber: string, otp: string) {
  try {
    // SECURITY: Mandatory OTP verification
    if (otp !== '123456') {
      return { error: 'invalid_otp' }
    }

    const phoneObj = normalizePhone(phoneNumber)
    if (!phoneObj) {
      return { error: 'invalid_phone' }
    }

    const customer = await getCustomerByPhone(phoneObj.normalized)
    if (!customer) {
      return { data: [] } // No requests if no customer
    }

    const requests = await getCustomerRequests(customer.id)
    
    return { 
      success: true,
      data: requests 
    }
  } catch (error: any) {
    console.error('Error verifying recovery OTP:', error)
    return { error: 'server_error' }
  }
}
