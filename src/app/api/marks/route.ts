import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isCoreSubject } from '@/lib/grading'
import { resolveSectionType } from '@/lib/section-type'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission, resolveUserScope, canAccessSubjectInScope } from '@/lib/auth-server'
import { recordActivity } from '@/lib/api-server'
import { canAccessClass, isAdministratorRole } from '@/lib/teacher-access'
import { fetchMergedSchoolSettings, isExamSetLockedForUser } from '@/lib/school-settings-helper'
import { resolveEquivalentTerms, fetchAndReconcileSecularMarks, fetchAndReconcileTheologyMarks } from '@/lib/marks-reconciliation'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  const searchParams = request.nextUrl.searchParams
  const enrollment_id = searchParams.get('enrollment_id')
  const term_id = searchParams.get('term_id')
  const score_type = searchParams.get('score_type') || 'both'

  if (!enrollment_id || !term_id) {
    return withCors(
      request,
      NextResponse.json(
        { error: 'enrollment_id and term_id are required' },
        { status: 400 }
      )
    )
  }

  if (!['mot', 'eot', 'both', 'bot', 'all'].includes(score_type)) {
    return withCors(request, NextResponse.json({ error: 'score_type must be bot, mot, eot, both, or all' }, { status: 400 }))
  }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    const [enrollmentRes, authRes, termInfo] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, student_id, is_active, circular_class_id, theology_class_id, circular_classes(section, class_name), theology_classes(level), students!inner(id, is_archived)')
        .eq('id', enrollment_id)
        .eq('is_active', true)
        .eq('students.is_archived', false)
        .single(),
      verifyDataAccess(supabase, user, 'read'),
      resolveEquivalentTerms(supabase, term_id),
    ])

    const { data: enrollment, error: enrollmentError } = enrollmentRes
    if (enrollmentError || !enrollment) {
      return withCors(request, NextResponse.json({ error: 'Enrollment not found' }, { status: 404 }))
    }

    // Security Check
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
      return withCors(request, NextResponse.json({ error: authRes.message || 'Forbidden: Insufficient permissions to read marks.' }, { status: 403 }))
    }
    const canReadCircular = canAccessClass(authRes, 'circular', enrollment.circular_class_id)
    const canReadTheology = canAccessClass(
      authRes,
      'theology',
      enrollment.theology_class_id,
      enrollment.circular_class_id
    )
    if (!canReadCircular && !canReadTheology) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: You do not have access to this student\'s classes.' }, { status: 403 }))
    }

    const circularClassMeta = Array.isArray(enrollment.circular_classes)
      ? enrollment.circular_classes[0]
      : (enrollment.circular_classes as { section?: string; class_name?: string } | null)
    const sectionType = resolveSectionType(circularClassMeta?.section, circularClassMeta?.class_name)
    const studentIdList = enrollment.student_id ? [enrollment.student_id] : []

    const hasTheologyClass = Boolean(enrollment.theology_class_id && enrollment.theology_classes)
    const theologyClassLevel = hasTheologyClass
      ? Array.isArray(enrollment.theology_classes)
        ? enrollment.theology_classes[0]?.level
        : (enrollment.theology_classes as any)?.level
      : null

    const [
      subjectsRes,
      reconciledSecular,
      theologySubjectsRes,
      reconciledTheology,
    ] = await Promise.all([
      supabase
        .from('circular_subjects')
        .select('id, subject_name')
        .eq('section', sectionType)
        .order('subject_name', { ascending: true }),
      fetchAndReconcileSecularMarks(supabase, {
        enrollmentIds: [enrollment_id],
        studentIds: studentIdList,
        termIds: termInfo.termIds,
        termAliases: termInfo.termAliases,
      }),
      hasTheologyClass && theologyClassLevel
        ? supabase
            .from('theology_subjects')
            .select('id, subject_name_arabic')
            .eq('level', theologyClassLevel)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      hasTheologyClass && theologyClassLevel
        ? fetchAndReconcileTheologyMarks(supabase, {
            enrollmentIds: [enrollment_id],
            studentIds: studentIdList,
            termIds: termInfo.termIds,
            termAliases: termInfo.termAliases,
          })
        : Promise.resolve([]),
    ])

    if (subjectsRes.error) {
      console.error('circular_subjects DB error:', subjectsRes.error.message)
      return withCors(request, NextResponse.json({ error: subjectsRes.error.message }, { status: 500 }))
    }
    if (theologySubjectsRes.error) {
      console.error('theology_subjects DB error:', theologySubjectsRes.error.message)
      return withCors(request, NextResponse.json({ error: theologySubjectsRes.error.message }, { status: 500 }))
    }

    const circularMarkMap = new Map(
      reconciledSecular.map((mark) => [mark.subject_id, mark])
    )

    let circular_marks = (subjectsRes.data || []).map((subject: any) => {
      const existingMark = circularMarkMap.get(subject.id)
      return {
        subject_id: subject.id,
        subject_name: subject.subject_name,
        is_core: isCoreSubject(subject.subject_name, sectionType),
        bot_score: existingMark?.bot_score ?? null,
        mot_score: existingMark?.mot_score ?? null,
        eot_score: existingMark?.eot_score ?? null,
      }
    })

    let theology_marks: any[] = []
    if (hasTheologyClass && theologyClassLevel) {
      const theologyMarkMap = new Map(
        reconciledTheology.map((mark) => [mark.subject_id, mark])
      )

      theology_marks = (theologySubjectsRes.data || []).map((subject: any) => {
        const existingMark = theologyMarkMap.get(subject.id)
        return {
          subject_id: subject.id,
          subject_name_arabic: subject.subject_name_arabic,
          mot_score: existingMark?.mot_score ?? null,
          eot_score: existingMark?.eot_score ?? null,
        }
      })
    }

    if (!canReadTheology || authRes.filterByDepartment === 'secular') {
      theology_marks = [];
    }
    if (!canReadCircular || authRes.filterByDepartment === 'theology') {
      circular_marks = [];
    }

    const scope = resolveUserScope(authRes);
    if (!scope.isFullAccess && scope.assignedSubjects.length > 0) {
      circular_marks = circular_marks.filter(
        (m: any) =>
          canAccessSubjectInScope(scope, enrollment.circular_class_id, m.subject_id, 'secular') ||
          canAccessSubjectInScope(scope, enrollment.circular_class_id, m.subject_name, 'secular')
      );
      theology_marks = theology_marks.filter(
        (m: any) =>
          canAccessSubjectInScope(scope, enrollment.theology_class_id, m.subject_id, 'theology') ||
          canAccessSubjectInScope(scope, enrollment.theology_class_id, m.subject_name_arabic, 'theology')
      );
    }

    return withCors(request, NextResponse.json({
      circular_marks,
      theology_marks,
    }))
  } catch (err) {
    console.error('Marks API GET error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  try {
    const body = await request.json()
    const { enrollment_id, term_id, score_type, circular_marks, theology_marks } = body

    if (!enrollment_id || !term_id || !score_type || !['bot', 'mot', 'eot', 'all'].includes(score_type)) {
      return withCors(request, NextResponse.json({ error: 'enrollment_id, term_id, and valid score_type (bot|mot|eot|all) are required' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    // 1. Fetch enrollment's sections (strictly active, non-archived students only)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('circular_class_id, theology_class_id, is_active, circular_classes(section, class_name), theology_classes(level), students!inner(id, is_archived)')
      .eq('id', enrollment_id)
      .eq('is_active', true)
      .eq('students.is_archived', false)
      .single()
      
    if (enrollmentError || !enrollment) {
      return withCors(request, NextResponse.json({ error: 'Enrollment not found' }, { status: 404 }))
    }

    // Security Check
    const authRes = await verifyDataAccess(supabase, user, 'write');
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    // Marks Entry Lock Check (Admins retain override access)
    const isAdmin =
      isAdministratorRole(authRes.canonicalRole || authRes.role) ||
      authRes.role === 'Administrator' ||
      authRes.role === 'admin'
    if (!isAdmin) {
      const schoolSettings = await fetchMergedSchoolSettings(supabase)
      const directLock = isExamSetLockedForUser(schoolSettings, score_type, isAdmin)
      if (directLock.locked) {
        return withCors(request, NextResponse.json({ error: directLock.message }, { status: 423 }))
      }
      const hasBot = Array.isArray(circular_marks) && circular_marks.some((m: any) => m.bot_score !== undefined)
      const hasMot =
        (Array.isArray(circular_marks) && circular_marks.some((m: any) => m.mot_score !== undefined)) ||
        (Array.isArray(theology_marks) && theology_marks.some((m: any) => m.mot_score !== undefined))
      const hasEot =
        (Array.isArray(circular_marks) && circular_marks.some((m: any) => m.eot_score !== undefined)) ||
        (Array.isArray(theology_marks) && theology_marks.some((m: any) => m.eot_score !== undefined))
      for (const [flag, setKey] of [
        [hasBot, 'bot'],
        [hasMot, 'mot'],
        [hasEot, 'eot'],
      ] as const) {
        if (flag) {
          const check = isExamSetLockedForUser(schoolSettings, setKey, isAdmin)
          if (check.locked) {
            return withCors(request, NextResponse.json({ error: check.message }, { status: 423 }))
          }
        }
      }
    }
    const canWriteCircular = canAccessClass(authRes, 'circular', enrollment.circular_class_id)
    const canWriteTheology = canAccessClass(
      authRes,
      'theology',
      enrollment.theology_class_id,
      enrollment.circular_class_id
    )
    if (
      (!canWriteCircular && Array.isArray(circular_marks) && circular_marks.length > 0) ||
      (!canWriteTheology && Array.isArray(theology_marks) && theology_marks.length > 0) ||
      (!canWriteCircular && !canWriteTheology)
    ) {
      return withCors(request, NextResponse.json({ error: "Unauthorized: You do not have access to this student's classes or requested curriculum." }, { status: 403 }))
    }

    const circularClassMeta = Array.isArray(enrollment.circular_classes)
      ? enrollment.circular_classes[0]
      : (enrollment.circular_classes as { section?: string; class_name?: string } | null)
    
    const theologyClassMeta = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : (enrollment.theology_classes as { level?: string } | null)
      
    const expectedCircularSection = resolveSectionType(circularClassMeta?.section, circularClassMeta?.class_name)
    const expectedTheologyLevel = theologyClassMeta?.level

    // Upsert circular marks
    if (Array.isArray(circular_marks) && circular_marks.length > 0) {
      const circularUpsert = circular_marks
        .filter((mark: any) => {
          return mark.bot_score !== undefined || mark.mot_score !== undefined || mark.eot_score !== undefined
        })
        .map((mark: any) => {
          const payload: any = {
            enrollment_id,
            term_id,
            subject_id: mark.subject_id,
            updated_by: authRes.teacherId,
          }
          if (mark.bot_score !== undefined) payload.bot_score = mark.bot_score === '' || mark.bot_score === null ? null : Number(mark.bot_score)
          if (mark.mot_score !== undefined) payload.mot_score = mark.mot_score === '' || mark.mot_score === null ? null : Number(mark.mot_score)
          if (mark.eot_score !== undefined) payload.eot_score = mark.eot_score === '' || mark.eot_score === null ? null : Number(mark.eot_score)
          return payload
        })

      if (circularUpsert.length > 0) {
        for (const row of circularUpsert) {
          for (const key of ['bot_score', 'mot_score', 'eot_score'] as const) {
            const v = row[key]
            if (v !== undefined && v !== null && (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 100)) {
              return withCors(
                request,
                NextResponse.json({ error: `Invalid ${key}: scores must be between 0 and 100.` }, { status: 400 })
              )
            }
          }
        }
        // Validation: Ensure all subject_ids match the enrollment's section
        const subjectIds = circularUpsert.map((u: any) => u.subject_id)
        const subjects: any[] = []
        for (let i = 0; i < subjectIds.length; i += 30) {
          const chunk = subjectIds.slice(i, i + 30)
          const { data: chunkSubjects, error: subjErr } = await supabase
            .from('circular_subjects')
            .select('id, section')
            .in('id', chunk)
          if (chunkSubjects) subjects.push(...chunkSubjects)
        }
        
        const invalidSubjects = subjects?.filter((s: any) => s.section !== expectedCircularSection) || []
        if (invalidSubjects.length > 0) {
          return withCors(request, NextResponse.json({ 
            error: `Section mismatch for subjects: ${invalidSubjects.map((s: any) => s.id).join(', ')}` 
          }, { status: 400 }))
        }

        const { error: circularError } = await supabase
          .from('circular_marks')
          .upsert(circularUpsert, { onConflict: 'enrollment_id,subject_id,term_id' })

        if (circularError) {
          console.error('circular_marks upsert error:', circularError.message)
          return withCors(request, NextResponse.json({ error: circularError.message }, { status: 500 }))
        }
      }
    }

    // Upsert theology marks (per-subject)
    if (Array.isArray(theology_marks) && theology_marks.length > 0) {
      const theologyUpsert = theology_marks
        .filter((mark: any) => {
          return mark.mot_score !== undefined || mark.eot_score !== undefined
        })
        .map((mark: any) => {
          const payload: any = {
            enrollment_id,
            term_id,
            subject_id: mark.subject_id,
            updated_by: authRes.teacherId,
          }
          if (mark.mot_score !== undefined) payload.mot_score = mark.mot_score === '' || mark.mot_score === null ? null : Number(mark.mot_score)
          if (mark.eot_score !== undefined) payload.eot_score = mark.eot_score === '' || mark.eot_score === null ? null : Number(mark.eot_score)
          return payload
        })

      if (theologyUpsert.length > 0) {
        // Validation: Ensure all subject_ids match the enrollment's theology level
        const subjectIds = theologyUpsert.map((u: any) => u.subject_id)
        const subjects: any[] = []
        for (let i = 0; i < subjectIds.length; i += 30) {
          const chunk = subjectIds.slice(i, i + 30)
          const { data: chunkSubjects, error: subjErr } = await supabase
            .from('theology_subjects')
            .select('id, level')
            .in('id', chunk)
          if (chunkSubjects) subjects.push(...chunkSubjects)
        }
        
        const invalidSubjects = subjects?.filter((s: any) => s.level !== expectedTheologyLevel) || []
        if (invalidSubjects.length > 0) {
          return withCors(request, NextResponse.json({ 
            error: `Level mismatch for theology subjects: ${invalidSubjects.map((s: any) => s.id).join(', ')}` 
          }, { status: 400 }))
        }

        const { error: theologyError } = await supabase
          .from('theology_marks')
          .upsert(theologyUpsert, { onConflict: 'enrollment_id,subject_id,term_id' })

        if (theologyError) {
          console.error('theology_marks upsert error:', theologyError.message)
          return withCors(request, NextResponse.json({ error: theologyError.message }, { status: 500 }))
        }
      }
    }

    await recordActivity(supabase, user.id, 'Entered Marks', {
      enrollment_id,
      term_id,
      score_type
    })

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err) {
    console.error('Marks API POST error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
