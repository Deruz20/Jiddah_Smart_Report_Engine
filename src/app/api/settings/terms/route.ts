import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { recordActivity } from '@/lib/api-server'
import { resolveCurrentSchoolId, applyTenantScope, withTenantPayload } from '@/lib/tenant-context'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    const { isAdministratorRole } = await import('@/lib/teacher-access')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.canonicalRole || authRes.role) || !hasPermission(authRes, 'manage_settings')) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 }))
    }

    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let query = supabase
      .from('terms')
      .select('id, label, academic_year, term_number, is_current, start_date, end_date, next_term_start')
      .order('academic_year', { ascending: false })
      .order('term_number', { ascending: true })

    query = applyTenantScope(query, schoolId)

    const { data, error } = await query

    if (error) {
      console.error('settings/terms GET error:', error)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ data: data || [] }))
  } catch (err: any) {
    console.error('settings/terms GET error:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'write')
    const { isAdministratorRole } = await import('@/lib/teacher-access')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.canonicalRole || authRes.role) || !hasPermission(authRes, 'manage_settings')) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 }))
    }

    const body = await request.json()
    const academic_year = Number(body.academic_year || body.year)
    const term_number = Number(body.term_number || 1)
    const label = String(body.label || `Term ${term_number}`).trim()

    if (!Number.isFinite(academic_year) || academic_year < 2000 || academic_year > 2100) {
      return withCors(request, NextResponse.json({ error: 'Valid academic_year (2000–2100) is required' }, { status: 400 }))
    }
    if (![1, 2, 3].includes(term_number)) {
      return withCors(request, NextResponse.json({ error: 'term_number must be 1, 2, or 3' }, { status: 400 }))
    }

    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    const insertPayload = withTenantPayload({
      academic_year,
      term_number,
      label,
      is_current: false,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      next_term_start: body.next_term_start || null,
    }, schoolId)

    const { data, error } = await supabase
      .from('terms')
      .insert([insertPayload])
      .select('id, label, academic_year, term_number, is_current, start_date, end_date, next_term_start')
      .single()

    if (error) {
      console.error('settings/terms POST error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'create_term', { term_id: data?.id, label, academic_year, term_number })
    return withCors(request, NextResponse.json({ success: true, data }, { status: 201 }))
  } catch (err: any) {
    console.error('settings/terms POST error:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'write')
    const { isAdministratorRole } = await import('@/lib/teacher-access')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.canonicalRole || authRes.role) || !hasPermission(authRes, 'manage_settings')) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 }))
    }

    const body = await request.json()
    const { termId, label, start_date, end_date, next_term_start } = body

    if (!termId) {
      return withCors(request, NextResponse.json({ error: 'termId is required' }, { status: 400 }))
    }

    const updatePayload: Record<string, string | null> = {}
    if (label !== undefined && typeof label === 'string' && label.trim()) updatePayload.label = label.trim()
    if (start_date !== undefined) updatePayload.start_date = start_date || null
    if (end_date !== undefined) updatePayload.end_date = end_date || null
    if (next_term_start !== undefined) updatePayload.next_term_start = next_term_start || null

    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let updateQuery = supabase
      .from('terms')
      .update(updatePayload)
      .eq('id', termId)
    updateQuery = applyTenantScope(updateQuery, schoolId)

    const { error } = await updateQuery

    if (error) {
      console.error('settings/terms PATCH error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'update_term_dates', { term_id: termId, ...updatePayload })
    return withCors(request, NextResponse.json({ success: true, message: 'Term dates updated' }))
  } catch (err: any) {
    console.error('settings/terms PATCH error:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'write')
    const { isAdministratorRole } = await import('@/lib/teacher-access')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.canonicalRole || authRes.role) || !hasPermission(authRes, 'manage_settings')) {
      return withCors(request, NextResponse.json({ error: 'Access Denied: Administrator only' }, { status: 403 }))
    }

    const { searchParams } = new URL(request.url)
    let termId = searchParams.get('termId') || searchParams.get('id')
    if (!termId) {
      try {
        const body = await request.json()
        termId = body?.termId || body?.id
      } catch {}
    }

    if (!termId) {
      return withCors(request, NextResponse.json({ error: 'termId is required' }, { status: 400 }))
    }

    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let existingQuery = supabase.from('terms').select('is_current, label').eq('id', termId)
    existingQuery = applyTenantScope(existingQuery, schoolId)
    const { data: existing } = await existingQuery.maybeSingle()
    if (existing?.is_current) {
      return withCors(request, NextResponse.json({ error: 'Cannot archive or delete the currently active term. Switch active term first.' }, { status: 400 }))
    }

    let deleteQuery = supabase.from('terms').delete().eq('id', termId)
    deleteQuery = applyTenantScope(deleteQuery, schoolId)
    const { error } = await deleteQuery
    if (error) {
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'delete_term', { term_id: termId, label: existing?.label })
    return withCors(request, NextResponse.json({ success: true }))
  } catch (err: any) {
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
