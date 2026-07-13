import { NextResponse } from 'next/server'

type RateLimitContext = {
  count: number
  lastReset: number
}

// In-memory store for simple rate limiting
// Note: In a multi-serverless environment (like Vercel Edge), this store is scoped per isolate.
// For strict global rate limiting, a persistent store like Redis (Vercel KV) is recommended.
const rateLimitCache = new Map<string, RateLimitContext>()

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

export function applyRateLimit(
  ip: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 20 }
) {
  const now = Date.now()
  const context = rateLimitCache.get(ip)

  if (!context) {
    rateLimitCache.set(ip, { count: 1, lastReset: now })
    return { success: true, remaining: options.maxRequests - 1 }
  }

  // Reset window
  if (now - context.lastReset > options.windowMs) {
    context.count = 1
    context.lastReset = now
    return { success: true, remaining: options.maxRequests - 1 }
  }

  // Increment and check
  context.count += 1
  if (context.count > options.maxRequests) {
    return { success: false, remaining: 0 }
  }

  return { success: true, remaining: options.maxRequests - context.count }
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
