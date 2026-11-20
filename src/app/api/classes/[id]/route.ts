import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { resolveCurrentSchoolId, applyTenantScope } from '@/lib/tenant-context'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const resolvedParams = await params
    const body = await request.json()
    if (!body.class_name || !body.section) {
      return withCors(request, NextResponse.json({ error: 'class_name and section are required' }, { status: 400 }))
    }

    const validSections = ['nursery', 'lower_primary', 'upper_primary']
    if (!validSections.includes(body.section)) {
      return withCors(request, NextResponse.json({ error: 'Invalid section' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let updateQuery = supabase
      .from('circular_classes')
      .update({ class_name: body.class_name.trim(), section: body.section })
      .eq('id', resolvedParams.id)
      .select()
    updateQuery = applyTenantScope(updateQuery, schoolId)

    const { data, error } = await updateQuery

    if (error) return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    return withCors(request, NextResponse.json({ data }, { status: 200 }))
  } catch (err) {
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const resolvedParams = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let deleteQuery = supabase.from('circular_classes').delete().eq('id', resolvedParams.id)
    deleteQuery = applyTenantScope(deleteQuery, schoolId)

    const { error } = await deleteQuery

    if (error) return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    return withCors(request, NextResponse.json({ success: true }, { status: 200 }))
  } catch (err) {
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
