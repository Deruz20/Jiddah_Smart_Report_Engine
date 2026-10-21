import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { executeTeacherDeactivation } from '@/lib/teacher-deactivation'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import {
  getAuthenticatedUser,
  isValidEmail,
  normalizePhone,
  normalizeString,
  parseStringArray,
  recordActivity,
} from '@/lib/api-server'
import { isMissingTableError } from '@/lib/api-response'
import { verifyDataAccess } from '@/lib/auth-server'
import { CANONICAL_ACCOUNT_ROLES, normalizeAccountRole } from '@/lib/teacher-access'

const validRoles = [
  ...CANONICAL_ACCOUNT_ROLES,
  'Deputy Head Teacher',
  'Teacher',
  'Theology Instructor',
  'DOS',
  'Support Staff',
]
const validStatuses = ['active', 'inactive']

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const authRes = await verifyDataAccess(supabase, user, 'read');
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message || 'Forbidden' }, { status: 403 }));
    }

    const role = request.nextUrl.searchParams.get('role')?.trim()
    const search = request.nextUrl.searchParams.get('search')?.trim()

    const [
      { data: circularClasses },
      { data: theologyClasses },
      { data: classAssignments },
    ] = await Promise.all([
      supabase.from('circular_classes').select('id, class_name, class_teacher_id'),
      supabase.from('theology_classes').select('id, class_name_english, class_name_arabic'),
      supabase.from('teacher_class_assignments').select('teacher_id, class_id'),
    ]);

    const classMap = new Map<string, string>();
    (circularClasses || []).forEach((c: any) => classMap.set(c.id, c.class_name));
    (theologyClasses || []).forEach((c: any) => classMap.set(c.id, c.class_name_english || c.class_name_arabic));

    let query = supabase.from('teachers').select('*').order('name', { ascending: true })

    if (authRes.filterByDepartment === 'secular') {
      query = query.not('subject', 'ilike', '%Theology%');
    } else if (authRes.filterByDepartment === 'theology') {
      query = query.ilike('subject', '%Theology%');
    }

    if (role) {
      query = query.ilike('role', `%${role}%`)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      if (isMissingTableError(error)) {
        return withCors(
          request,
          NextResponse.json({
            data: [],
            placeholder: true,
            message: 'Teachers table not set up yet. Run the teachers migration in Supabase to enable this feature.',
          })
        )
      }
      console.error('teachers GET error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const teachers = (data ?? []).map((teacher: any) => {
      const rawClasses: string[] = Array.isArray(teacher.classes)
        ? teacher.classes
        : typeof teacher.classes === 'string'
        ? teacher.classes.split(',').map((item: string) => item.trim()).filter(Boolean)
        : [];

      const extraIds = (classAssignments || [])
        .filter((a: any) => a.teacher_id === teacher.id)
        .map((a: any) => a.class_id);

      const leadIds = (circularClasses || [])
        .filter((c: any) => c.class_teacher_id === teacher.id)
        .map((c: any) => c.id);

      const allTokens = [...new Set([...rawClasses, ...extraIds, ...leadIds])];
      const resolvedClasses = allTokens
        .map((token) => classMap.get(token) || (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(token) ? token : null))
        .filter(Boolean) as string[];

      return {
        id: teacher.id,
        name: teacher.name || '',
        role: normalizeAccountRole(teacher.role, teacher.subject),
        raw_role: teacher.role || '',
        subject: teacher.subject || '',
        classes: [...new Set(resolvedClasses)],
        class_ids: allTokens.filter((token) => classMap.has(token)),
        email: teacher.email || '',
        phone: teacher.phone || '',
        status: validStatuses.includes(teacher.status) ? teacher.status : 'active',
        joined: teacher.joined || teacher.created_at || '',
        avatar: teacher.avatar ?? null,
      };
    })

    return withCors(request, NextResponse.json({ data: teachers }))
  } catch (err: any) {
    console.error('teachers GET exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

export async function POST(request: NextRequest) {
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
    const name = normalizeString(body?.full_name ?? body?.name)
    const role = normalizeString(body?.role)
    const email = normalizeString(body?.email)
    const phone = normalizePhone(body?.phone)
    const subject = normalizeString(body?.subject_specialization ?? body?.subject)
    const classes = parseStringArray(body?.class_assigned ?? body?.classes)
    const status = normalizeString(body?.status).toLowerCase()

    if (!name || !role) {
      return withCors(request, NextResponse.json({ error: 'Name and role are required' }, { status: 400 }))
    }

    if (!validRoles.includes(role)) {
      return withCors(request, NextResponse.json({ error: 'Invalid teacher role' }, { status: 400 }))
    }

    if (email && !isValidEmail(email)) {
      return withCors(request, NextResponse.json({ error: 'Invalid email address' }, { status: 400 }))
    }

    if (status && !validStatuses.includes(status)) {
      return withCors(request, NextResponse.json({ error: 'Invalid teacher status' }, { status: 400 }))
    }

    const insertData: any = {
      name,
      role,
      email: email || '',
      phone,
      subject,
      classes,
      status: validStatuses.includes(status) ? status : 'active',
      created_by: user.id,
    }

    const { data, error } = await supabase.from('teachers').insert([insertData]).select()
    if (error) {
      console.error('teachers POST error:', error.message)
      if (error.code === '23505') {
        return withCors(request, NextResponse.json({ error: 'Email already exists' }, { status: 409 }))
      }
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'create_teacher', {
      teacher: name,
      email,
      role,
    })

    return withCors(request, NextResponse.json({ data }, { status: 201 }))
  } catch (err: any) {
    console.error('teachers POST exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
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

    const teacherId = request.nextUrl.searchParams.get('id')?.trim()
    if (!teacherId) {
      return withCors(request, NextResponse.json({ error: 'Teacher id is required' }, { status: 400 }))
    }

    const body = await request.json()
    const updates: any = {}
    const fullName = normalizeString(body?.full_name ?? body?.name)
    const role = normalizeString(body?.role)
    const email = normalizeString(body?.email)
    const phone = normalizePhone(body?.phone)
    const subject = normalizeString(body?.subject_specialization ?? body?.subject)
    const classes = parseStringArray(body?.class_assigned ?? body?.classes)
    const status = normalizeString(body?.status).toLowerCase()

    if (fullName) updates.name = fullName
    if (role) {
      if (!validRoles.includes(role)) {
        return withCors(request, NextResponse.json({ error: 'Invalid teacher role' }, { status: 400 }))
      }
      updates.role = role
    }
    if (email) {
      if (!isValidEmail(email)) {
        return withCors(request, NextResponse.json({ error: 'Invalid email address' }, { status: 400 }))
      }
      updates.email = email
    }
    if (body?.email === '') {
      updates.email = ''
    }
    if (phone) updates.phone = phone
    if (subject) updates.subject = subject
    if (classes.length > 0) updates.classes = classes
    if (status) {
      if (!validStatuses.includes(status)) {
        return withCors(request, NextResponse.json({ error: 'Invalid teacher status' }, { status: 400 }))
      }
      updates.status = status
    }

    if (Object.keys(updates).length === 0) {
      return withCors(request, NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 }))
    }

    const { data, error } = await supabase.from('teachers').update(updates).eq('id', teacherId).select()
    if (error) {
      console.error('teachers PATCH error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'update_teacher', {
      teacher: teacherId,
      updates,
    })

    return withCors(request, NextResponse.json({ data }))
  } catch (err: any) {
    console.error('teachers PATCH exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

export async function DELETE(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const teacherId = request.nextUrl.searchParams.get('id')?.trim()
    if (!teacherId) {
      return withCors(request, NextResponse.json({ error: 'Teacher id is required' }, { status: 400 }))
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const result = await executeTeacherDeactivation(supabaseAdmin, user, teacherId)
    if (!result.success) {
      return withCors(request, NextResponse.json({ error: result.error }, { status: result.status }))
    }

    return withCors(request, NextResponse.json({ data: result.data, message: result.message }, { status: result.status }))
  } catch (err: any) {
    console.error('teachers DELETE exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}
