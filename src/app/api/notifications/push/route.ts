import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import webpush from 'web-push'

const log = createLogger('API:notifications/push')

// Configure VAPID keys if set in environment (otherwise fallback to simulated push for testing)
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
}

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:support@findora.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription, action, payload } = await request.json()

    // 1. If register action: Save subscription to user metadata
    if (action === 'register') {
      if (!subscription) {
        return NextResponse.json({ error: 'Subscription object is required' }, { status: 400 })
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { push_subscription: subscription }
      })

      if (updateError) {
        throw new Error(`Failed to save subscription: ${updateError.message}`)
      }

      return NextResponse.json({ success: true, message: 'Subscription registered successfully' })
    }

    // 2. If test trigger action: Send a push message to the registered subscription
    if (action === 'test') {
      // Get subscription from user metadata
      const userSubscription = user.user_metadata?.push_subscription

      if (!userSubscription) {
        return NextResponse.json({ 
          error: 'No active push subscription found. Please register first.' 
        }, { status: 404 })
      }

      const messagePayload = JSON.stringify({
        title: payload?.title || 'Findora Alert',
        body: payload?.body || 'Test notification from Findora systems.',
        data: {
          url: payload?.url || '/'
        }
      })

      if (vapidKeys.publicKey && vapidKeys.privateKey) {
        // Real push sending
        await webpush.sendNotification(userSubscription, messagePayload)
      } else {
        // Local simulation fallback if VAPID keys are not set
        log.info('Simulated push notification', { to: user.email })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Notification trigger initiated', 
        simulated: !vapidKeys.publicKey 
      })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push registration failed'
    log.error('Push API error', { message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
