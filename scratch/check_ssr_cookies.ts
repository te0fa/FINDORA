import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createServerClient } from '@supabase/ssr'

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  const email = process.env.E2E_STAFF_EMAIL!
  const password = process.env.E2E_STAFF_PASSWORD!

  const writtenCookies: any[] = []

  const supabaseServer = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll(cookiesToSet) {
        writtenCookies.push(...cookiesToSet)
      }
    }
  })

  // Sign in to trigger cookie writing
  const { data, error } = await supabaseServer.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('SignIn failed:', error.message)
    return
  }

  console.log('SignIn succeeded!')
  console.log('Cookies written by @supabase/ssr:')
  console.log(JSON.stringify(writtenCookies, null, 2))
}

check().catch(console.error)
