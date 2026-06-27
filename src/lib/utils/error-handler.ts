/**
 * FINDORA — Global Error Handler
 * Centralized error capture, classification, and safe user-facing responses.
 * Ready for Sentry/Datadog integration.
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

const errorLogger = logger.child('ErrorHandler')

// ── Error Types ───────────────────────────────────────────────────────────────

export class FindoraError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'FindoraError'
  }
}

export class ValidationError extends FindoraError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthError extends FindoraError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends FindoraError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends FindoraError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends FindoraError {
  constructor() {
    super('Too many requests', 'RATE_LIMITED', 429)
    this.name = 'RateLimitError'
  }
}

// ── Error Classifier ──────────────────────────────────────────────────────────

interface ClassifiedError {
  statusCode: number
  code: string
  message: string
  userMessage: string
}

function classifyError(error: unknown): ClassifiedError {
  if (error instanceof FindoraError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      userMessage: error.message,
    }
  }

  if (error instanceof Error) {
    // Supabase errors
    if (error.message.includes('JWT')) {
      return { statusCode: 401, code: 'AUTH_ERROR', message: error.message, userMessage: 'Session expired. Please log in again.' }
    }
    if (error.message.includes('duplicate key')) {
      return { statusCode: 409, code: 'DUPLICATE_ERROR', message: error.message, userMessage: 'This record already exists.' }
    }
    if (error.message.includes('foreign key')) {
      return { statusCode: 422, code: 'REFERENCE_ERROR', message: error.message, userMessage: 'Referenced record not found.' }
    }
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      return { statusCode: 503, code: 'SERVICE_UNAVAILABLE', message: error.message, userMessage: 'Service temporarily unavailable. Please try again.' }
    }
    return { statusCode: 500, code: 'INTERNAL_ERROR', message: error.message, userMessage: 'An unexpected error occurred.' }
  }

  return { statusCode: 500, code: 'UNKNOWN_ERROR', message: String(error), userMessage: 'An unexpected error occurred.' }
}

// ── API Route Error Handler ───────────────────────────────────────────────────

/**
 * Wraps an API route handler with centralized error handling.
 * Automatically logs errors and returns safe user-facing JSON responses.
 *
 * Usage:
 * ```ts
 * export const POST = handleApiError(async (req) => {
 *   // your handler
 * })
 * ```
 */
export function handleApiError(
  handler: (req: Request, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: Request, ...args: unknown[]): Promise<NextResponse> => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      const classified = classifyError(error)

      if (classified.statusCode >= 500) {
        errorLogger.error('Unhandled API error', {
          code: classified.code,
          message: classified.message,
          url: req.url,
          method: req.method,
        })
      } else {
        errorLogger.warn('Client error in API route', {
          code: classified.code,
          message: classified.message,
          url: req.url,
        })
      }

      return NextResponse.json(
        {
          error: classified.userMessage,
          code: classified.code,
        },
        { status: classified.statusCode }
      )
    }
  }
}

// ── Server Action Error Handler ───────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Wraps a Server Action with error handling.
 * Returns a typed ActionResult instead of throwing.
 */
export async function safeAction<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const classified = classifyError(error)
    errorLogger.error(`Action failed${context ? ` [${context}]` : ''}`, {
      code: classified.code,
      message: classified.message,
    })
    return { success: false, error: classified.userMessage, code: classified.code }
  }
}

// ── Supabase Error Helper ─────────────────────────────────────────────────────

/**
 * Asserts a Supabase query result is successful.
 * Throws a typed FindoraError if not.
 */
export function assertSupabase<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context = 'Database operation'
): T {
  if (result.error) {
    throw new FindoraError(
      `${context}: ${result.error.message}`,
      result.error.code ?? 'DB_ERROR',
      500,
      result.error
    )
  }
  if (result.data === null) {
    throw new NotFoundError(context)
  }
  return result.data
}
