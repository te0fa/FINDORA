import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export interface CronAuthResult {
  authorized: boolean
}

/**
 * Timing-safe, fail-closed authentication for Vercel Cron routes.
 *
 * Requirements:
 * 1. process.env.CRON_SECRET must be defined and non-empty.
 * 2. Authorization header must follow exact "Bearer <token>" format.
 * 3. Token is compared using constant-time comparison over SHA-256 digests.
 * 4. Never logs or exposes the secret or token values.
 * 5. Fails closed unconditionally under all circumstances if secret or token is missing/invalid.
 */
export function verifyCronAuth(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return { authorized: false }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || typeof authHeader !== 'string') {
    return { authorized: false }
  }

  const trimmedHeader = authHeader.trim()
  if (!trimmedHeader.startsWith('Bearer ')) {
    return { authorized: false }
  }

  const token = trimmedHeader.slice(7).trim()
  if (!token) {
    return { authorized: false }
  }

  // Constant-time comparison using fixed-length SHA-256 hashes to prevent timing attacks and length leaks
  const expectedHash = createHash('sha256').update(secret).digest()
  const receivedHash = createHash('sha256').update(token).digest()

  if (expectedHash.length !== receivedHash.length || !timingSafeEqual(expectedHash, receivedHash)) {
    return { authorized: false }
  }

  return { authorized: true }
}

/**
 * Standard 401 Unauthorized response for cron routes
 */
export function unauthorizedCronResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
