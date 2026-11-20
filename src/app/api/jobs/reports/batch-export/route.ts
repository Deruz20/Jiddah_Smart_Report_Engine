import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import { resolveCurrentSchoolId, DEFAULT_SCHOOL_ID } from '@/lib/tenant-context'
import {
  saveJob,
  getJobById,
  processBatchExportJob,
  PdfExportJob,
} from '@/lib/pdf-export-worker'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

/**
 * POST /api/jobs/reports/batch-export
 * Enqueues a batch report PDF generation job, returns HTTP 202 Accepted immediately,
 * and launches background processing.
 */
export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Authenticate user
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

    // 2. Authorize via verifyDataAccess
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_reports')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to export report cards.' },
          { status: 403 }
        )
      )
    }

    // 3. Resolve tenant school_id
    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    // 4. Parse request parameters
    const body = await request.json().catch(() => ({}))
    const {
      enrollment_ids = [],
      class_id = null,
      term_id = null,
      score_type = 'mot',
      curriculum = 'secular',
      stamp_date = undefined,
      studioFormatting = {},
    } = body

    // 5. Create new job record
    const jobId = crypto.randomUUID()
    const newJob: PdfExportJob = {
      id: jobId,
      school_id: schoolId || DEFAULT_SCHOOL_ID,
      class_id,
      term_id,
      status: 'pending',
      progress_current: 0,
      progress_total: Array.isArray(enrollment_ids) && enrollment_ids.length > 0 ? enrollment_ids.length : 1,
      file_url: null,
      file_name: null,
      error_message: null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        score_type,
        curriculum,
        stamp_date,
        studioFormatting,
      },
    }

    // Attempt to persist to Supabase or in-memory
    let supabaseAdmin = null
    try {
      supabaseAdmin = createAdminClient(cookieStore)
    } catch {
      // Fallback
    }

    await saveJob(newJob, supabaseAdmin)

    // 6. Spawn background processing asynchronously (fire-and-forget to return 202 immediately)
    void processBatchExportJob(
      jobId,
      {
        job_id: jobId,
        school_id: schoolId || DEFAULT_SCHOOL_ID,
        user_id: user.id,
        class_id,
        term_id,
        enrollment_ids,
        score_type,
        curriculum,
        stamp_date,
        studioFormatting,
      },
      supabaseAdmin
    ).catch((err) => {
      logger.error('Unhandled failure in background export worker task', { jobId, err: err?.message })
    })

    // 7. Return 202 Accepted
    return withCors(
      request,
      NextResponse.json(
        {
          success: true,
          job_id: jobId,
          status: 'pending',
          progress_current: 0,
          progress_total: newJob.progress_total,
          message: 'Batch report export job accepted and enqueued for background processing.',
        },
        { status: 202 }
      )
    )
  } catch (error: any) {
    logger.error('Failed to enqueue batch report export job', { error: error?.message })
    return withCors(
      request,
      NextResponse.json(
        { error: 'Internal Server Error: Failed to initialize batch export job.' },
        { status: 500 }
      )
    )
  }
}

/**
 * GET /api/jobs/reports/batch-export?job_id=...
 * Returns the current status and progress of an export job.
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
          { error: authRes.message || 'Forbidden: Insufficient permissions to view job status.' },
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

    let supabaseAdmin = null
    try {
      supabaseAdmin = createAdminClient(cookieStore)
    } catch {
      // Fallback
    }

    const job = await getJobById(jobId, supabaseAdmin)
    if (!job) {
      return withCors(
        request,
        NextResponse.json({ error: 'Job not found.' }, { status: 404 })
      )
    }

    return withCors(
      request,
      NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress_current: job.progress_current,
          progress_total: job.progress_total,
          file_url: job.file_url,
          file_name: job.file_name,
          error_message: job.error_message,
          created_at: job.created_at,
          updated_at: job.updated_at,
        },
      })
    )
  } catch (error: any) {
    logger.error('Failed to get batch report export job status', { error: error?.message })
    return withCors(
      request,
      NextResponse.json(
        { error: 'Internal Server Error: Failed to retrieve job status.' },
        { status: 500 }
      )
    )
  }
}
