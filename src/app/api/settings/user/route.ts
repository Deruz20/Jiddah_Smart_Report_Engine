import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'
import { normalizeAccountRole, resolveRoleDepartment } from '@/lib/teacher-access'

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

    const [{ data: profile, error: profileError }, { data: teacherRowByAuth }, { data: teacherRowByEmail }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, phone, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('teachers')
        .select('id, name, phone, role, subject, classes, status')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
      user.email
        ? supabase
            .from('teachers')
            .select('id, name, phone, role, subject, classes, status')
            .eq('email', user.email)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('settings/user GET profiles lookup fallback:', profileError.message)
    }

    const teacherRow = teacherRowByAuth || teacherRowByEmail

    const rawRole =
      teacherRow?.role ||
      profile?.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'Administrator'
    const subjectStr = teacherRow?.subject || user.user_metadata?.subject || ''
    const canonicalRole = normalizeAccountRole(rawRole, subjectStr)
    const derivedDept = resolveRoleDepartment(rawRole, subjectStr)
    const departmentDisplay =
      canonicalRole === 'Administrator' || canonicalRole === 'Head Teacher' || derivedDept === 'both'
        ? 'All Departments'
        : derivedDept === 'theology'
          ? 'Theology Track'
          : 'Secular Track'
    const derivedFullName =
      profile?.full_name ||
      teacherRow?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      ''

    const payload = {
      id: user.id,
      email: user.email || '',
      full_name: derivedFullName,
      phone: profile?.phone || teacherRow?.phone || '',
      role: rawRole,
      canonical_role: canonicalRole,
      department: departmentDisplay,
      assigned_classes: Array.isArray(teacherRow?.classes) ? teacherRow.classes : [],
      assigned_subjects: subjectStr ? [subjectStr] : [],
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

    const { error: profileUpsertError } = await supabase
      .from('profiles')
      .upsert([{ id: user.id, ...updates }], { onConflict: 'id' })
    if (profileUpsertError) {
      console.warn('settings/user PATCH profiles fallback:', profileUpsertError.message)
    }

    // Keep Supabase Auth user_metadata in sync so server/client sessions always reflect updated name & phone
    await supabase.auth.updateUser({
      data: {
        ...(updates.full_name ? { full_name: updates.full_name, name: updates.full_name } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      },
    })

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
