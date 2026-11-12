import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'
import { normalizeAccountRole } from '@/lib/teacher-access'

const allowedProfileKeys = ['full_name', 'first_name', 'last_name', 'phone']

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const [{ data: profile, error }, { data: teacherRow }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, phone, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('teachers')
        .select('id, name, phone, role, subject, department, assigned_classes, assigned_subjects')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
    ])

    if (error && error.code !== 'PGRST116') {
      console.error('settings/user GET error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const rawRole =
      teacherRow?.role ||
      profile?.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'Class Teacher'
    const canonicalRole = normalizeAccountRole(rawRole, teacherRow?.subject || user.user_metadata?.subject || '')
    const derivedFullName =
      profile?.full_name ||
      teacherRow?.name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      ''

    const payload = {
      id: user.id,
      email: user.email || '',
      full_name: derivedFullName,
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || teacherRow?.phone || '',
      role: rawRole,
      canonical_role: canonicalRole,
      department: teacherRow?.department || (canonicalRole === 'DOS Theology' ? 'theology' : canonicalRole === 'DOS Secular' ? 'secular' : 'both'),
      assigned_classes: Array.isArray(teacherRow?.assigned_classes) ? teacherRow.assigned_classes : [],
      assigned_subjects: Array.isArray(teacherRow?.assigned_subjects) ? teacherRow.assigned_subjects : [],
      avatar_url: user.user_metadata?.avatar_url || profile?.avatar_url || null,
    }

    return withCors(request, NextResponse.json({ data: payload }))
  } catch (err: any) {
    console.error('settings/user GET exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const updates: Record<string, string> = {}
    Object.entries(body).forEach(([key, value]) => {
      if (!allowedProfileKeys.includes(key)) return
      if (typeof value === 'string') {
        updates[key] = key === 'phone' ? normalizePhone(value) : normalizeString(value)
      }
    })

    if (updates.full_name && !updates.first_name) {
      const parts = updates.full_name.split(/\s+/).filter(Boolean)
      updates.first_name = parts[0] || ''
      updates.last_name = parts.slice(1).join(' ')
    }

    if (Object.keys(updates).length === 0) {
      return withCors(request, NextResponse.json({ error: 'No valid profile fields provided' }, { status: 400 }))
    }

    const { error } = await supabase.from('profiles').upsert([{ id: user.id, ...updates }], { onConflict: 'id' })
    if (error) {
      console.error('settings/user PATCH error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    // Sync teacher record if present
    try {
      const teacherUpdates: Record<string, any> = {}
      if (updates.full_name) teacherUpdates.name = updates.full_name
      if (updates.phone !== undefined) teacherUpdates.phone = updates.phone || null
      if (Object.keys(teacherUpdates).length > 0) {
        await supabase.from('teachers').update(teacherUpdates).eq('auth_user_id', user.id)
      }
    } catch {}

    await recordActivity(supabase, user.id, 'update_user_profile', updates)

    return withCors(request, NextResponse.json({ success: true, data: updates }))
  } catch (err: any) {
    console.error('settings/user PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
