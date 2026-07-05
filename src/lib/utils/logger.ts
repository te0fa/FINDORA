/**
 * FINDORA — Production Logger
 * Replaces all console.log/warn/error calls with structured, level-aware logging.
 * In production: suppresses debug/info logs, captures errors for monitoring.
 * In development: full verbose output with color and context.
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown> | unknown

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  source?: string
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_TEST = process.env.NODE_ENV === 'test'

// Color codes for development
const COLORS = {
  debug: '\x1b[36m',   // Cyan
  info:  '\x1b[32m',   // Green
  warn:  '\x1b[33m',   // Yellow
  error: '\x1b[31m',   // Red
  reset: '\x1b[0m',
} as const

function formatEntry(entry: LogEntry): string {
  const ts = entry.timestamp.slice(11, 23) // HH:MM:SS.mmm
  const color = COLORS[entry.level]
  const lvl = entry.level.toUpperCase().padEnd(5)
  const src = entry.source ? `[${entry.source}] ` : ''
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
  return `${color}${ts} ${lvl}${COLORS.reset} ${src}${entry.message}${ctx}`
}

function sendToMonitoring(entry: LogEntry): void {
  if (entry.level === 'error') {
    // Determine the error object to capture: if context is an instance of Error, use it,
    // otherwise wrap message in an Error.
    const errorObj = entry.context instanceof Error 
      ? entry.context 
      : new Error(entry.message);

    // Prepare extra details
    let extra: Record<string, unknown> = {};
    if (entry.context && typeof entry.context === 'object') {
      if (entry.context instanceof Error) {
        extra = { 
          errorMessage: entry.context.message,
          errorStack: entry.context.stack
        };
      } else {
        extra = entry.context as Record<string, unknown>;
      }
    } else if (entry.context !== undefined) {
      extra = { contextDetails: entry.context };
    }

    Sentry.captureException(errorObj, {
      extra,
      tags: {
        source: entry.source || 'default',
        logger_name: 'production_logger'
      }
    });
  }
}

class Logger {
  private source?: string

  constructor(source?: string) {
    this.source = source
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (IS_TEST) return

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      source: this.source,
    }

    // In production: only log warnings and errors
    if (IS_PRODUCTION && (level === 'debug' || level === 'info')) return

    const formatted = IS_PRODUCTION
      ? JSON.stringify(entry)  // Structured JSON for log aggregators
      : formatEntry(entry)

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        sendToMonitoring(entry)
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context)
  }

  /** Create a child logger with a specific source label */
  child(source: string): Logger {
    return new Logger(source)
  }
}

// Default export — root logger
export const logger = new Logger()

// Factory for module-scoped loggers
export function createLogger(source: string): Logger {
  return new Logger(source)
}

export default logger
