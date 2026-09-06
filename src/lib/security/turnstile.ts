/**
 * Cloudflare Turnstile Verification Helper
 *
 * Server-side verification for Cloudflare Turnstile tokens.
 * Security Rules:
 *  - Native fetch to Cloudflare siteverify endpoint.
 *  - Never log or expose TURNSTILE_SECRET_KEY or full token.
 *  - In production (NODE_ENV=production or VERCEL_ENV=production):
 *      - If secret is missing: FAIL CLOSED.
 *      - If token is missing/invalid: FAIL CLOSED.
 *  - In non-production (development / test):
 *      - If secret is missing: allow safe local bypass with warning log.
 *      - Allow 'mock-turnstile-pass' for unit tests.
 */

export interface TurnstileVerificationResult {
  success: boolean
  error?: string
  challengeTs?: string
  hostname?: string
  bypassed?: boolean
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // 1. Missing secret key handling
  if (!secretKey) {
    if (isProduction) {
      console.error('[SECURITY][TURNSTILE] TURNSTILE_SECRET_KEY is missing in production. Failing closed.')
      return {
        success: false,
        error: 'TURNSTILE_CONFIGURATION_ERROR',
      }
    }

    // In local development or automated unit test without Turnstile credentials
    console.warn('[TURNSTILE] TURNSTILE_SECRET_KEY is not set. Bypassing Turnstile in non-production environment.')
    return {
      success: true,
      bypassed: true,
    }
  }

  // 2. Missing token handling
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      success: false,
      error: 'MISSING_TURNSTILE_TOKEN',
    }
  }

  const trimmedToken = token.trim()

  // 3. Testing mock token support (non-production only)
  if (!isProduction && trimmedToken === 'mock-turnstile-pass') {
    return {
      success: true,
      bypassed: true,
    }
  }

  if (!isProduction && trimmedToken === 'mock-turnstile-fail') {
    return {
      success: false,
      error: 'INVALID_TURNSTILE_TOKEN',
    }
  }

  // 4. Remote verification with Cloudflare API
  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', trimmedToken)
    if (remoteIp && remoteIp !== '127.0.0.1') {
      formData.append('remoteip', remoteIp)
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(5000), // 5-second bounded timeout
    })

    if (!res.ok) {
      console.error('[SECURITY][TURNSTILE] Cloudflare siteverify HTTP error:', res.status)
      return {
        success: false,
        error: 'VERIFICATION_ENDPOINT_ERROR',
      }
    }

    const data = await res.json()

    if (data.success) {
      return {
        success: true,
        challengeTs: data.challenge_ts,
        hostname: data.hostname,
      }
    }

    // Cloudflare returned unsuccessful validation
    const errorCodes = Array.isArray(data['error-codes'])
      ? data['error-codes'].join(', ')
      : 'unknown-error'

    console.warn('[SECURITY][TURNSTILE] Verification rejected by Cloudflare:', errorCodes)

    return {
      success: false,
      error: 'INVALID_OR_EXPIRED_TOKEN',
    }
  } catch (err: any) {
    console.error('[SECURITY][TURNSTILE] Network error during token verification:', err.message)
    // Fail-closed on network errors during verification in production
    return {
      success: false,
      error: 'VERIFICATION_NETWORK_FAILURE',
    }
  }
}
