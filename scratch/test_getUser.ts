import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const secretKey = process.env.SUPABASE_SECRET_KEY!

  const email = process.env.E2E_STAFF_EMAIL!
  const password = process.env.E2E_STAFF_PASSWORD!

  // Sign in to get tokens
  const supabaseClient = createClient(url, publishableKey)
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('SignIn failed:', error.message)
    return
  }

  const session = data.session!
  const projectRef = url.split('//')[1].split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user
  }
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(sessionData)).toString('base64')

  console.log(`Simulating request with cookie: ${cookieName}`)

  // Create server client
  const fakeCookies = [
    { name: cookieName, value: cookieValue }
  ]

  const supabaseServer = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return fakeCookies
      },
      setAll() {}
    }
  })

  const { data: userData, error: userError } = await supabaseServer.auth.getUser()
  if (userError) {
    console.error('getUser failed:', userError.message, userError)
  } else {
    console.log('getUser succeeded! User ID:', userData.user?.id)
  }
}

check().catch(console.error)
