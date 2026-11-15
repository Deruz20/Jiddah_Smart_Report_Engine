import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'

function isAllowedSignatureUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const supaHost = new URL(supabaseUrl).hostname
      if (parsed.hostname === supaHost) {
        return parsed.pathname.includes('/storage/v1/object/') || parsed.pathname.includes('/signatures/')
      }
    }

    // Permit same-host Supabase / local object paths only
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.pathname.includes('/signatures/') || parsed.pathname.includes('/storage/v1/object/'))
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetUrl = request.nextUrl.searchParams.get('url') || ''
    if (!targetUrl || !isAllowedSignatureUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid signature URL' }, { status: 400 })
    }

    const upstream = await fetch(targetUrl, {
      headers: { Accept: 'image/*' },
      cache: 'force-cache',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch signature (${upstream.status})` },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream resource is not an image' }, { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('signatures/proxy GET exception:', err)
    return NextResponse.json({ error: err?.message || 'Proxy error' }, { status: 500 })
  }
}
