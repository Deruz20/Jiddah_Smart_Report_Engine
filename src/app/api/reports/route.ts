import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSubjectGradeNumber } from '@/lib/grading'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  const searchParams = request.nextUrl.searchParams
  const student_id = searchParams.get('student_id')
  const term_id = searchParams.get('term_id')
  const examMode = searchParams.get('examMode') || 'EOT'

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Security Check before querying student data
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    const baseAuthRes = await verifyDataAccess(supabase, user, 'read')
    if (!baseAuthRes.isAuthorized || !hasPermission(baseAuthRes, 'read_reports')) {
      return withCors(
        request,
        NextResponse.json(
          { error: baseAuthRes.message || 'Forbidden: Insufficient permissions to access report data.' },
          { status: 403 }
        )
      )
    }

    if (!student_id) {
      return withCors(request, NextResponse.json({ data: [] }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)

    // 1. Fetch Student & Class info
    const { data: studentArr, error: studentError } = await supabaseAdmin
      .from('students')
      .select(`
        id, 
        name,
        arabic_name,
        class_name,
        classes (
          id,
          class_name,
          section
        ),
        enrollments!inner (
          theology_class_id
        )
      `)
      .eq('id', student_id)
      .eq('is_archived', false)
      .eq('enrollments.is_active', true)
      .limit(1)

    if (studentError || !studentArr || studentArr.length === 0) throw new Error('Student not found')
    const student = studentArr[0]

    const { isAdministratorRole } = await import('@/lib/teacher-access')
    if (!isAdministratorRole(baseAuthRes.role)) {
      const authRes = await verifyDataAccess(supabase, user, 'read', student.class_name)
      if (!authRes.isAuthorized || !hasPermission(authRes, 'read_reports')) {
        return withCors(request, NextResponse.json({ error: authRes.message || 'Forbidden' }, { status: 403 }))
      }

      if (authRes.filterByDepartment) {
        const hasTheologyClass = student.enrollments?.[0]?.theology_class_id != null
        if (authRes.filterByDepartment === 'theology' && !hasTheologyClass) {
          return withCors(request, NextResponse.json({ error: 'Unauthorized: Student is not in the Theology department' }, { status: 403 }))
        }
        if (authRes.filterByDepartment === 'secular' && !student.class_name) {
          return withCors(request, NextResponse.json({ error: 'Unauthorized: Student is not in the Secular department' }, { status: 403 }))
        }
      }
    }

    // 2. Fetch Term info (check academic_terms then fallback to terms)
    let { data: term, error: termError } = await supabaseAdmin
      .from('academic_terms')
      .select('*')
      .eq('id', term_id)
      .maybeSingle()

    if (!term && term_id) {
      const { data: modernTerm } = await supabaseAdmin
        .from('terms')
        .select('*')
        .eq('id', term_id)
        .maybeSingle()
      term = modernTerm
    }

    if (termError && !term) throw new Error('Term not found')
    if (!term) throw new Error('Term not found')

    const section = (student.classes as any).section

    // ============================================
    // NURSERY LOGIC
    // ============================================
    if (section === 'nursery') {
      const { data: assessments, error: assessmentsError } = await supabaseAdmin
        .from('nursery_assessments')
        .select(`
          id,
          subject_id,
          score,
          teacher_comment,
          conduct_score,
          subjects (
            id,
            subject_name,
            curriculum
          )
        `)
        .eq('student_id', student_id)
        .eq('term_id', term_id)

      if (assessmentsError) throw new Error(assessmentsError.message)
      
      if (!assessments || assessments.length === 0) {
        throw new Error('No assessments found')
      }

      return withCors(request, NextResponse.json({
        student,
        term,
        assessments
      }, { status: 200 }))
    }

    // ============================================
    // PRIMARY LOGIC
    // ============================================
    
    // 3. Subject Completeness Validation
    const { count: totalRequiredSubjects, error: countError } = await supabaseAdmin
      .from('subjects')
      .select('*', { count: 'exact', head: true })
      .eq('section', section)
    
    if (countError) throw countError

    // 4. Fetch Marks + Subjects for the student
    const { data: marks, error: marksError } = await supabaseAdmin
      .from('marks')
      .select(`
        student_id,
        subject_id,
        score,
        subjects (
          id,
          subject_name,
          curriculum,
          section
        )
      `)
      .eq('student_id', student_id)
      .eq('term_id', term_id)

    if (marksError) throw marksError

    if (!marks || marks.length === 0) {
      throw new Error('No marks found')
    }

    // Only count marks that actually have a numeric score recorded (or just count records)
    // The requirement says "student has X/Y subjects recorded"
    const recordedMarksCount = marks.filter(m => typeof m.score === 'number').length

    if (recordedMarksCount !== totalRequiredSubjects) {
      throw new Error(`Incomplete marks: student has ${recordedMarksCount}/${totalRequiredSubjects} subjects recorded`)
    }

    // 5. Ranking System (Position)
    // Fetch all active, non-archived students in that class
    const { data: classStudents, error: classStudentsError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('class_name', student.class_name)
      .eq('is_archived', false)
    
    if (classStudentsError) throw classStudentsError
    
    const classStudentIds = (classStudents || []).map(s => s.id)
    const totalStudents = classStudentIds.length

    // Fetch all marks for these students
    const { data: classMarks, error: classMarksError } = await supabaseAdmin
      .from('marks')
      .select('student_id, score')
      .eq('term_id', term_id)
      .in('student_id', classStudentIds)
    
    if (classMarksError) throw classMarksError

    // Compute aggregates per student using configured school grading scale
    const schoolSettings = await fetchMergedSchoolSettings(supabaseAdmin)
    const studentAggregates: Record<string, { totalAgg: number, totalScore: number }> = {}
    classStudentIds.forEach(id => {
      studentAggregates[id] = { totalAgg: 0, totalScore: 0 }
    })

    ;(classMarks || []).forEach(m => {
      if (typeof m.score === 'number') {
        const gradeNumber = getSubjectGradeNumber(m.score, schoolSettings?.grading_scale)
        studentAggregates[m.student_id].totalAgg += gradeNumber
        studentAggregates[m.student_id].totalScore += m.score
      }
    })

    // Sort ascending by totalAgg (lower is better), tie-breaker is totalScore (higher is better)
    const rankingList = classStudentIds.map(id => ({
      id,
      totalAgg: studentAggregates[id].totalAgg,
      totalScore: studentAggregates[id].totalScore
    }))

    rankingList.sort((a, b) => {
      if (a.totalAgg !== b.totalAgg) return a.totalAgg - b.totalAgg
      return b.totalScore - a.totalScore
    })

    // Find 1-based position (Standard Competition Ranking)
    const target = rankingList.find(r => r.id === student_id)
    const position = target ? rankingList.findIndex(r => r.totalAgg === target.totalAgg && r.totalScore === target.totalScore) + 1 : rankingList.findIndex(r => r.id === student_id) + 1
    return withCors(request, NextResponse.json({
      student,
      term,
      marks,
      position,
      totalStudents,
      examMode
    }, { status: 200 }))

  } catch (error: any) {
    console.error('Reports API error:', error)
    return withCors(request, NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 }))
  }
}
