import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.DASHBOARD_ORIGIN,
].filter(Boolean) as string[]

export function withCors<T>(request: Request, response: NextResponse<T>): NextResponse<T> {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
  )
  return response
}

export function corsPreflight(request: Request): NextResponse | null {
  if (request.method !== 'OPTIONS') return null
  return withCors(request, new NextResponse(null, { status: 204 }))
}

export function apiOptions(request: Request): NextResponse {
  return corsPreflight(request) ?? new NextResponse(null, { status: 204 })
}
