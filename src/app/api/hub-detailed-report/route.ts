import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import {
  resolveEquivalentTerms,
  fetchAndReconcileSecularMarks,
  fetchAndReconcileTheologyMarks,
} from '@/lib/marks-reconciliation'
import { isNonMuslimStudent } from '@/lib/student-religion'
import {
  mapClassesToSections,
  resolveTermNumber,
  type ExamPhase,
  type HubCurriculum,
  type HubSectionId,
} from '@/lib/academic-sections'
import {
  clampSupportThreshold,
  computeHubDetailedReport,
  type DetailedReportScope,
} from '@/lib/hub-detailed-report'
import { classIdsForType, hasPermission } from '@/lib/teacher-access'
import { verifyDataAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_CURRICULA = new Set<HubCurriculum>(['secular', 'theology'])
const VALID_SCOPES = new Set<DetailedReportScope>(['school', 'section', 'class'])
const VALID_SECTIONS = new Set<HubSectionId>(['nursery', 'lower_primary', 'upper_primary'])
const VALID_EXAMS = new Set<ExamPhase>(['bot', 'mot', 'eot'])

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

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
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    const { searchParams } = new URL(request.url)
    const rawCurriculum = (searchParams.get('curriculum') || '').trim().toLowerCase() as HubCurriculum
    if (!VALID_CURRICULA.has(rawCurriculum)) {
      return withCors(
        request,
        NextResponse.json({ error: 'Invalid or missing curriculum (expected secular or theology).' }, { status: 400 })
      )
    }
    const curriculum = rawCurriculum

    const rawScope = (searchParams.get('scope') || '').trim().toLowerCase() as DetailedReportScope
    const rawSectionId = (searchParams.get('section_id') || '').trim().toLowerCase() as HubSectionId
    const classIdParam = (searchParams.get('class_id') || '').trim() || null
    const termIdParam = (searchParams.get('term_id') || '').trim() || null
    const yearParam = searchParams.get('year') ? Number(searchParams.get('year')) : null
    const rawExamPhase = (searchParams.get('exam_phase') || 'eot').trim().toLowerCase() as ExamPhase
    const supportThreshold = clampSupportThreshold(searchParams.get('support_threshold'))

    if (!VALID_SCOPES.has(rawScope)) {
      return withCors(
        request,
        NextResponse.json({ error: 'Invalid scope (expected school, section, or class).' }, { status: 400 })
      )
    }
    if (rawScope === 'section' && !VALID_SECTIONS.has(rawSectionId)) {
      return withCors(
        request,
        NextResponse.json({ error: 'Invalid or missing section_id for section scope.' }, { status: 400 })
      )
    }
    if (rawScope === 'class' && !classIdParam) {
      return withCors(
        request,
        NextResponse.json({ error: 'Missing class_id for class scope.' }, { status: 400 })
      )
    }
    if (!VALID_EXAMS.has(rawExamPhase)) {
      return withCors(
        request,
        NextResponse.json({ error: 'Invalid exam_phase (expected bot, mot, or eot).' }, { status: 400 })
      )
    }

    // Strict server-side authorization before reading any curriculum/student data
    const authRes = await verifyDataAccess(
      supabase,
      user,
      'read',
      rawScope === 'class' ? classIdParam : null,
      curriculum
    )

    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to view detailed reports.' },
          { status: 403 }
        )
      )
    }

    const classType = curriculum === 'theology' ? 'theology' : 'circular'
    const allowedIds = classIdsForType(authRes, classType)

    if (allowedIds !== null) {
      if (allowedIds.length === 0) {
        return withCors(
          request,
          NextResponse.json(
            { error: `Forbidden: No ${curriculum} classes are assigned to your account.` },
            { status: 403 }
          )
        )
      }
      if (rawScope === 'school') {
        return withCors(
          request,
          NextResponse.json(
            { error: 'Forbidden: School-wide report scope requires leadership or department DOS permissions.' },
            { status: 403 }
          )
        )
      }
      if (rawScope === 'class' && classIdParam && !allowedIds.includes(classIdParam)) {
        return withCors(
          request,
          NextResponse.json(
            { error: 'Forbidden: Access to the requested class detailed report is denied.' },
            { status: 403 }
          )
        )
      }
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const schoolSettings = await fetchMergedSchoolSettings(supabaseAdmin)

    const [termsRes, allClassesRes, subjectsRes] = await Promise.all([
      supabaseAdmin
        .from('terms')
        .select('id, academic_year, term_number, label, is_current, start_date, end_date')
        .order('academic_year', { ascending: false })
        .order('term_number', { ascending: true }),
      curriculum === 'theology'
        ? supabaseAdmin
            .from('theology_classes')
            .select('id, class_name_arabic, class_name_english, level')
            .order('level', { ascending: true })
            .order('class_name_arabic', { ascending: true })
        : supabaseAdmin
            .from('circular_classes')
            .select('id, class_name, section')
            .order('section', { ascending: true })
            .order('class_name', { ascending: true }),
      curriculum === 'theology'
        ? supabaseAdmin
            .from('theology_subjects')
            .select('id, subject_name_arabic, name_arabic, subject_name, level, section, sort_order')
            .order('sort_order', { ascending: true })
            .order('subject_name_arabic', { ascending: true })
        : supabaseAdmin
            .from('circular_subjects')
            .select('id, subject_name, section, is_core, is_gradable')
            .order('section', { ascending: true })
            .order('subject_name', { ascending: true }),
    ])

    const allTerms = termsRes.data || []
    const allClasses = allClassesRes.data || []
    const allSubjects = (subjectsRes.data || []).map((s: any) =>
      curriculum === 'theology'
        ? {
            ...s,
            subject_name: s.subject_name || s.subject_name_arabic || s.name_arabic,
            subject_name_arabic: s.subject_name_arabic || s.name_arabic || s.subject_name,
          }
        : s
    )

    const fullSectionMapping = mapClassesToSections(
      allClasses,
      curriculum,
      schoolSettings?.hub_sections,
      schoolSettings?.candidate_class_rules
    )

    // Verify section-level permission strictly against full curriculum section membership
    if (allowedIds !== null && rawScope === 'section') {
      const fullSectionClasses = fullSectionMapping.bySection[rawSectionId] || []
      const hasAllInSection =
        fullSectionClasses.length > 0 &&
        fullSectionClasses.every((c: any) => allowedIds.includes(String(c.id)))
      if (!hasAllInSection) {
        return withCors(
          request,
          NextResponse.json(
            {
              error:
                'Forbidden: Section-wide report access requires authorization for all classes in this section. Select an assigned class.',
            },
            { status: 403 }
          )
        )
      }
    }

    const permittedClasses =
      allowedIds !== null
        ? allClasses.filter((c: any) => allowedIds.includes(String(c.id)))
        : allClasses

    let targetClasses = permittedClasses
    if (rawScope === 'class' && classIdParam) {
      targetClasses = permittedClasses.filter((c: any) => String(c.id) === classIdParam)
      if (targetClasses.length === 0) {
        return withCors(
          request,
          NextResponse.json({ error: 'Class not found or access denied.' }, { status: 404 })
        )
      }
    } else if (rawScope === 'section' && rawSectionId) {
      const permittedMapping = mapClassesToSections(
        permittedClasses,
        curriculum,
        schoolSettings?.hub_sections,
        schoolSettings?.candidate_class_rules
      )
      targetClasses = permittedMapping.bySection[rawSectionId] || []
    }

    // Resolve active/requested term + chronological predecessor term
    const termsChronoDesc = [...allTerms].sort((a: any, b: any) => {
      const yDiff = Number(b.academic_year || 0) - Number(a.academic_year || 0)
      if (yDiff !== 0) return yDiff
      return Number(b.term_number || 0) - Number(a.term_number || 0)
    })

    let selectedTerm: any = null
    if (termIdParam) {
      selectedTerm = allTerms.find((t: any) => t.id === termIdParam) || null
    }
    if (!selectedTerm && yearParam && Number.isFinite(yearParam)) {
      const yearTerms = termsChronoDesc.filter((t: any) => Number(t.academic_year) === yearParam)
      selectedTerm = yearTerms.find((t: any) => t.is_current) || yearTerms[0] || null
    }
    if (!selectedTerm) {
      selectedTerm = allTerms.find((t: any) => t.is_current) || termsChronoDesc[0] || null
    }

    const activeTermId = selectedTerm?.id || termIdParam || ''
    const resolvedTermInfo = activeTermId
      ? await resolveEquivalentTerms(supabaseAdmin, activeTermId)
      : {
          primaryTerm: selectedTerm,
          termIds: activeTermId ? [activeTermId] : [],
          termAliases: [],
          academicYear: Number(selectedTerm?.academic_year || yearParam || 2026),
          termNumber: resolveTermNumber(selectedTerm) || 3,
          label: selectedTerm?.label || 'Term 3',
        }

    const currentYear = Number(resolvedTermInfo.academicYear || selectedTerm?.academic_year || 2026)
    const currentTermNum = Number(resolvedTermInfo.termNumber || resolveTermNumber(selectedTerm) || 3)
    const currentTermLabel = resolvedTermInfo.label || selectedTerm?.label || `Term ${currentTermNum}`
    const termIds = resolvedTermInfo.termIds.length > 0 ? resolvedTermInfo.termIds : activeTermId ? [activeTermId] : []

    const previousTermRow =
      termsChronoDesc.find((t: any) => {
        const ty = Number(t.academic_year || 0)
        const tn = Number(t.term_number || 0)
        return ty < currentYear || (ty === currentYear && tn < currentTermNum)
      }) || null

    // Fetch enrollments in targetClasses (strictly active & non-archived)
    const targetClassIds = targetClasses.map((c: any) => String(c.id))
    let enrollments: any[] = []

    if (targetClassIds.length > 0) {
      const classCol = curriculum === 'theology' ? 'theology_class_id' : 'circular_class_id'
      const studentCols =
        curriculum === 'theology'
          ? 'id, name, arabic_name, admission_number, gender, religion, is_muslim, is_archived'
          : 'id, name, admission_number, gender, is_archived'

      const fetchedEnrollments = await fetchAllSupabaseRows(() =>
        supabaseAdmin
          .from('enrollments')
          .select(`
            id,
            student_id,
            ${classCol},
            is_active,
            students!inner ( ${studentCols} )
          `)
          .in(classCol, targetClassIds)
          .eq('is_active', true)
          .eq('students.is_archived', false)
      )

      enrollments = fetchedEnrollments.filter((e: any) => {
        const stu = Array.isArray(e.students) ? e.students[0] : e.students
        if (!stu || stu.is_archived) return false
        if (curriculum === 'theology' && isNonMuslimStudent(stu)) return false
        return true
      })
    }

    const enrollmentIds = enrollments.map((e: any) => String(e.id))
    const studentIds = [...new Set(enrollments.map((e: any) => String(e.student_id)).filter(Boolean))]

    // Fetch current reconciled marks AND raw mark rows (for duplicate / out-of-range checks)
    let reconciledMarks: any[] = []
    const rawMarksForQuality: any[] = []

    if (enrollmentIds.length > 0 && termIds.length > 0) {
      const rawTable = curriculum === 'theology' ? 'theology_marks' : 'circular_marks'
      const rawSelect =
        curriculum === 'theology'
          ? 'id, enrollment_id, subject_id, term_id, mot_score, eot_score'
          : 'id, enrollment_id, subject_id, term_id, bot_score, mot_score, eot_score'

      const [reconciled, rawChunks] = await Promise.all([
        curriculum === 'theology'
          ? fetchAndReconcileTheologyMarks(supabaseAdmin, {
              enrollmentIds,
              studentIds,
              termIds,
              termAliases: resolvedTermInfo.termAliases,
              academicYear: currentYear,
            })
          : fetchAndReconcileSecularMarks(supabaseAdmin, {
              enrollmentIds,
              studentIds,
              termIds,
              termAliases: resolvedTermInfo.termAliases,
              academicYear: currentYear,
            }),
        (async () => {
          const allRaw: any[] = []
          for (let i = 0; i < enrollmentIds.length; i += 100) {
            const chunk = enrollmentIds.slice(i, i + 100)
            const rows = await fetchAllSupabaseRows(() =>
              supabaseAdmin
                .from(rawTable)
                .select(rawSelect)
                .in('enrollment_id', chunk)
                .in('term_id', termIds)
            )
            allRaw.push(...rows)
          }
          return allRaw
        })(),
      ])

      reconciledMarks = reconciled
      rawMarksForQuality.push(...rawChunks)
    }

    // Fetch previous term marks when previousTermRow exists (and needed for previousTerm trend or BOT->prev EOT)
    let prevTermMarks: any[] = []
    let prevTermBaseline: any = null

    if (previousTermRow && studentIds.length > 0) {
      const prevInfo = await resolveEquivalentTerms(supabaseAdmin, previousTermRow.id)
      if (prevInfo.termIds.length > 0) {
        prevTermMarks =
          curriculum === 'theology'
            ? await fetchAndReconcileTheologyMarks(supabaseAdmin, {
                enrollmentIds,
                studentIds,
                termIds: prevInfo.termIds,
                termAliases: prevInfo.termAliases,
                academicYear: prevInfo.academicYear,
              })
            : await fetchAndReconcileSecularMarks(supabaseAdmin, {
                enrollmentIds,
                studentIds,
                termIds: prevInfo.termIds,
                termAliases: prevInfo.termAliases,
                academicYear: prevInfo.academicYear,
              })
      }

      const prevPhaseForTerm: ExamPhase =
        rawExamPhase === 'bot' && curriculum === 'theology' ? 'mot' : rawExamPhase

      prevTermBaseline = {
        available: true,
        termId: previousTermRow.id,
        termNumber: Number(previousTermRow.term_number || 1),
        examPhase: prevPhaseForTerm,
        label: `${previousTermRow.label} (${prevPhaseForTerm.toUpperCase()})`,
        labelArabic: `${previousTermRow.label} (${prevPhaseForTerm.toUpperCase()})`,
        enrollments,
        marks: prevTermMarks,
      }
    } else {
      prevTermBaseline = {
        available: false,
        examPhase: rawExamPhase,
        label: 'Previous Term',
        labelArabic: 'الفترة السابقة',
        enrollments: [],
        marks: [],
        unavailableReason: 'No earlier academic term exists in the database for comparison.',
        unavailableReasonArabic: 'لا توجد فترة دراسية سابقة في قاعدة البيانات للمقارنة.',
      }
    }

    // Build previous exam baseline
    let prevExamBaseline: any = null
    if (rawExamPhase === 'eot') {
      prevExamBaseline = {
        available: true,
        examPhase: 'mot' as ExamPhase,
        label: `${currentTermLabel} MOT`,
        labelArabic: `منتصف الفترة (${currentTermLabel})`,
        marks: reconciledMarks,
      }
    } else if (rawExamPhase === 'mot') {
      if (curriculum === 'theology') {
        prevExamBaseline = {
          available: false,
          examPhase: 'bot' as ExamPhase,
          label: 'BOT (Not Tracked)',
          labelArabic: 'بداية الفترة (غير مسجل)',
          marks: [],
          unavailableReason: 'Theology marks table records MOT and EOT scores only (no BOT column).',
          unavailableReasonArabic: 'جدول درجات العلوم الشرعية يسجل درجات MOT و EOT فقط.',
        }
      } else {
        prevExamBaseline = {
          available: true,
          examPhase: 'bot' as ExamPhase,
          label: `${currentTermLabel} BOT`,
          labelArabic: `بداية الفترة (${currentTermLabel})`,
          marks: reconciledMarks,
        }
      }
    } else {
      // BOT compares against previous term's EOT
      if (previousTermRow) {
        prevExamBaseline = {
          available: true,
          examPhase: 'eot' as ExamPhase,
          label: `${previousTermRow.label} EOT`,
          labelArabic: `نهاية الفترة — ${previousTermRow.label}`,
          marks: prevTermMarks,
        }
      } else {
        prevExamBaseline = {
          available: false,
          examPhase: 'eot' as ExamPhase,
          label: 'Previous Term EOT',
          labelArabic: 'نهاية الفترة السابقة',
          marks: [],
          unavailableReason: 'BOT is the first exam of the term and no previous term exists.',
          unavailableReasonArabic: 'بداية الفترة هو أول اختبار ولا توجد فترة سابقة للمقارنة.',
        }
      }
    }

    const report = computeHubDetailedReport({
      curriculum,
      scope: rawScope,
      sectionId: rawScope === 'section' ? rawSectionId : null,
      classId: rawScope === 'class' ? classIdParam : null,
      termId: activeTermId,
      termLabel: currentTermLabel,
      termNumber: currentTermNum,
      academicYear: currentYear,
      examPhase: rawExamPhase,
      supportThreshold,
      classes: permittedClasses,
      enrollments,
      marks: reconciledMarks,
      rawMarksForQuality,
      subjects: allSubjects,
      gradingConfig: {
        grading_scale: schoolSettings?.grading_scale,
        division_boundaries: schoolSettings?.division_boundaries,
        theology_grading_scale: schoolSettings?.theology_grading_scale,
        theology_division_boundaries: schoolSettings?.theology_division_boundaries,
        hub_sections: schoolSettings?.hub_sections,
        candidate_class_rules: schoolSettings?.candidate_class_rules,
      },
      marksLocks: schoolSettings?.marks_locks,
      sectionsConfig: schoolSettings?.hub_sections,
      candidateRules: schoolSettings?.candidate_class_rules,
      previousExamBaseline: prevExamBaseline,
      previousTermBaseline: prevTermBaseline,
    })

    const canAccessSchoolScope = allowedIds === null
    const availableSections = (['nursery', 'lower_primary', 'upper_primary'] as HubSectionId[]).filter(
      (secId) => {
        if (allowedIds === null) return (fullSectionMapping.bySection[secId] || []).length > 0
        const fullSec = fullSectionMapping.bySection[secId] || []
        return fullSec.length > 0 && fullSec.every((c: any) => allowedIds.includes(String(c.id)))
      }
    )

    const res = NextResponse.json({
      report,
      availableScopes: {
        school: canAccessSchoolScope,
        sections: availableSections,
        classCount: permittedClasses.length,
      },
    })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return withCors(request, res)
  } catch (err: any) {
    console.error('hub-detailed-report GET error:', err)
    return withCors(
      request,
      NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
    )
  }
}
