/**
 * Structured Logger for Server-Side & API Operations
 * Provides unified JSON and formatted console output, sanitizes sensitive tokens,
 * and attaches correlation IDs to trace operations across services.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  correlationId?: string
  userId?: string
  endpoint?: string
  durationMs?: number
  [key: string]: unknown
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /apiKey/i,
]

function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > 4) return '[MaxDepthExceeded]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObject(val, depth + 1)
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

export const logger = {
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  },

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          }
        : { rawError: String(error) }

    this.log('error', message, {
      ...context,
      error: errorDetails,
    })
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context)
    }
  },

  log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const sanitizedContext = context ? sanitizeObject(context) : undefined

    const payload = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(sanitizedContext as Record<string, unknown>),
    }

    if (level === 'error') {
      console.error(JSON.stringify(payload))
    } else if (level === 'warn') {
      console.warn(JSON.stringify(payload))
    } else {
      console.log(JSON.stringify(payload))
    }
  },
}
