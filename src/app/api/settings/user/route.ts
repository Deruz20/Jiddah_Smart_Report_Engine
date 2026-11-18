import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, normalizePhone, normalizeString, recordActivity } from '@/lib/api-server'
import {
  normalizeAccountRole,
  resolveAssignedClassDisplayForTeacher,
  resolveRoleDepartment,
  resolveStaffRoleKey,
} from '@/lib/teacher-access'

const ALLOWED_PROFILE_KEYS = new Set(['full_name', 'display_name', 'first_name', 'last_name', 'phone'])
const FORBIDDEN_ESCALATION_KEYS = new Set([
  'role',
  'canonical_role',
  'department',
  'subject',
  'classes',
  'assigned_classes',
  'assigned_subjects',
  'permissions',
  'effective_permissions',
  'status',
  'email',
  'username',
  'pending_email',
  'auth_user_id',
  'is_admin',
  'id',
])

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/

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

    const supabaseAdmin = createAdminClient(cookieStore)

    const [{ data: profile }, { data: teacherRowByAuth }, { data: teacherRowByEmail }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('teachers')
        .select('*')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle(),
      user.email
        ? supabaseAdmin
            .from('teachers')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const teacherRow = teacherRowByAuth || teacherRowByEmail

    // Mirror confirmed auth email to staff table automatically (Amendment 3 A3)
    if (teacherRow && user.email && teacherRow.email?.toLowerCase() !== user.email.toLowerCase()) {
      await supabaseAdmin
        .from('teachers')
        .update({
          email: user.email.toLowerCase(),
          pending_email: null,
        })
        .eq('id', teacherRow.id)
      teacherRow.email = user.email.toLowerCase()
      teacherRow.pending_email = null
    } else if (
      teacherRow &&
      teacherRow.pending_email &&
      user.email &&
      teacherRow.pending_email.toLowerCase() === user.email.toLowerCase()
    ) {
      await supabaseAdmin
        .from('teachers')
        .update({ pending_email: null })
        .eq('id', teacherRow.id)
      teacherRow.pending_email = null
    }

    const rawRole =
      teacherRow?.role ||
      profile?.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'Administrator'
    const subjectStr = teacherRow?.subject || user.user_metadata?.subject || ''
    const canonicalRole = normalizeAccountRole(rawRole, subjectStr)
    const staffRole = resolveStaffRoleKey(rawRole, subjectStr)
    const derivedDept = resolveRoleDepartment(rawRole, subjectStr)
    const departmentDisplay =
      canonicalRole === 'Administrator' ||
      canonicalRole === 'Principal' ||
      canonicalRole === 'Head Teacher' ||
      derivedDept === 'both'
        ? 'All Departments'
        : derivedDept === 'theology'
          ? 'Theology Track'
          : 'Secular Track'
    const derivedFullName =
      teacherRow?.name ||
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      ''

    const { assignedClasses, rawClassTokensResolved } = await resolveAssignedClassDisplayForTeacher(
      supabaseAdmin,
      canonicalRole,
      staffRole,
      teacherRow
    )

    const pendingEmail =
      (user as any).new_email ||
      teacherRow?.pending_email ||
      user.user_metadata?.pending_email ||
      null

    const payload = {
      id: user.id,
      email: user.email || teacherRow?.email || '',
      username: teacherRow?.username || '',
      pending_email: pendingEmail,
      full_name: derivedFullName,
      phone: teacherRow?.phone ?? profile?.phone ?? '',
      role: staffRole,
      canonical_role: canonicalRole,
      department: departmentDisplay,
      assigned_classes: assignedClasses,
      raw_class_tokens_resolved: rawClassTokensResolved,
      assigned_subjects: subjectStr ? [subjectStr] : [],
      avatar_url: teacherRow?.avatar || profile?.avatar_url || user.user_metadata?.avatar_url || null,
      last_sign_in_at: (user as any).last_sign_in_at || null,
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return withCors(request, NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)

    // Anti-escalation guard (Amendment 3 A4): reject any attempt to pass role, department, classes, permissions, status, or email
    const attemptedForbiddenKeys = Object.keys(body).filter((key) => FORBIDDEN_ESCALATION_KEYS.has(key))
    if (attemptedForbiddenKeys.length > 0) {
      await recordActivity(supabaseAdmin, user.id, 'profile_escalation_blocked', {
        attempted_keys: attemptedForbiddenKeys,
      })
      return withCors(
        request,
        NextResponse.json(
          {
            error: `Forbidden: Profile endpoint only accepts whitelisted fields (full_name, phone). Cannot modify: ${attemptedForbiddenKeys.join(', ')}`,
          },
          { status: 403 }
        )
      )
    }

    const unknownKeys = Object.keys(body).filter((key) => !ALLOWED_PROFILE_KEYS.has(key))
    if (unknownKeys.length > 0) {
      return withCors(
        request,
        NextResponse.json(
          { error: `Disallowed profile fields: ${unknownKeys.join(', ')}` },
          { status: 400 }
        )
      )
    }

    const updates: Record<string, string> = {}
    if (typeof body.full_name === 'string' || typeof body.display_name === 'string') {
      const normalizedName = normalizeString(String(body.full_name ?? body.display_name ?? ''))
      if (normalizedName.length < 2) {
        return withCors(
          request,
          NextResponse.json({ error: 'Full name must be at least 2 characters long.' }, { status: 400 })
        )
      }
      updates.full_name = normalizedName
    }

    if (body.phone !== undefined) {
      if (body.phone === null || String(body.phone).trim() === '') {
        updates.phone = ''
      } else {
        const rawPhone = String(body.phone).trim()
        if (!PHONE_REGEX.test(rawPhone)) {
          return withCors(
            request,
            NextResponse.json(
              { error: 'Invalid phone number format. Use 7–20 digits (e.g. +256 700 000000).' },
              { status: 400 }
            )
          )
        }
        updates.phone = normalizePhone(rawPhone)
      }
    }

    if (Object.keys(updates).length === 0) {
      return withCors(request, NextResponse.json({ error: 'No valid profile fields provided' }, { status: 400 }))
    }

    // Fetch before state for audit log
    const [{ data: existingProfile }, { data: existingTeacherByAuth }, { data: existingTeacherByEmail }] =
      await Promise.all([
        supabaseAdmin.from('profiles').select('id, full_name, phone').eq('id', user.id).maybeSingle(),
        supabaseAdmin
          .from('teachers')
          .select('id, name, phone')
          .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle(),
        user.email
          ? supabaseAdmin.from('teachers').select('id, name, phone').ilike('email', user.email).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    const existingTeacher = existingTeacherByAuth || existingTeacherByEmail
    const beforeState = {
      full_name: existingTeacher?.name || existingProfile?.full_name || user.user_metadata?.full_name || '',
      phone: existingTeacher?.phone ?? existingProfile?.phone ?? '',
    }

    // Upsert profiles table (only whitelisted columns that exist in public.profiles)
    const profileUpdates: Record<string, string> = {}
    if (updates.full_name !== undefined) profileUpdates.full_name = updates.full_name
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone

    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert([{ id: user.id, ...profileUpdates }], { onConflict: 'id' })
    if (profileUpsertError) {
      console.warn('settings/user PATCH profiles fallback:', profileUpsertError.message)
    }

    // Update teacher row if present
    let verifiedTeacher: any = null
    if (existingTeacher?.id) {
      const teacherUpdates: Record<string, any> = {}
      if (updates.full_name !== undefined) teacherUpdates.name = updates.full_name
      if (updates.phone !== undefined) teacherUpdates.phone = updates.phone || null
      if (Object.keys(teacherUpdates).length > 0) {
        const { data: updatedTeacher, error: teacherErr } = await supabaseAdmin
          .from('teachers')
          .update(teacherUpdates)
          .eq('id', existingTeacher.id)
          .select('id, name, phone')
          .single()
        if (teacherErr) {
          return withCors(
            request,
            NextResponse.json({ error: `Failed to update staff record: ${teacherErr.message}` }, { status: 500 })
          )
        }
        verifiedTeacher = updatedTeacher
      }
    }

    // Keep Supabase Auth user_metadata in sync
    await supabase.auth.updateUser({
      data: {
        ...(updates.full_name ? { full_name: updates.full_name, name: updates.full_name } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      },
    })

    // Read-back verification from profiles
    const { data: verifiedProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    const savedFullName = verifiedTeacher?.name || verifiedProfile?.full_name || updates.full_name || beforeState.full_name
    const savedPhone =
      verifiedTeacher !== null
        ? verifiedTeacher.phone || ''
        : verifiedProfile?.phone ?? updates.phone ?? beforeState.phone

    if (updates.full_name && savedFullName !== updates.full_name) {
      return withCors(
        request,
        NextResponse.json({ error: 'Read-back verification failed for full_name.' }, { status: 500 })
      )
    }

    const afterState = {
      full_name: savedFullName,
      phone: savedPhone,
    }

    await recordActivity(supabaseAdmin, user.id, 'update_user_profile', {
      before: beforeState,
      after: afterState,
    })

    return withCors(
      request,
      NextResponse.json({
        success: true,
        data: {
          full_name: savedFullName,
          phone: savedPhone,
        },
      })
    )
  } catch (err: any) {
    console.error('settings/user PATCH exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}
