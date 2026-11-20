import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import { getZipArchive } from '@/lib/pdf-export-worker'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

/**
 * GET /api/jobs/reports/download?job_id=...
 * Streams the generated batch PDF .zip archive.
 */
export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return withCors(
        request,
        NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 })
      )
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_reports')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to download reports.' },
          { status: 403 }
        )
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return withCors(
        request,
        NextResponse.json({ error: 'job_id query parameter is required.' }, { status: 400 })
      )
    }

    const archive = getZipArchive(jobId)
    if (!archive) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'Archive not found or expired. Please re-trigger the export job.' },
          { status: 404 }
        )
      )
    }

    return new NextResponse(new Uint8Array(archive.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archive.fileName || `ReportCards_${jobId.slice(0, 8)}.zip`}"`,
        'Content-Length': archive.buffer.length.toString(),
        'Cache-Control': 'no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    logger.error('Failed to download report archive', { error: error?.message })
    return withCors(
      request,
      NextResponse.json(
        { error: 'Internal Server Error: Failed to download archive.' },
        { status: 500 }
      )
    )
  }
}
