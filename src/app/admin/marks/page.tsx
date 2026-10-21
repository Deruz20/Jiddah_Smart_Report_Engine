import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { AdminMarksEntryClient } from '@/components/AdminMarksEntryClient'
import { verifyDataAccess } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { reshapeEnrollmentRow } from '@/lib/enrollment-shape'
import { EnrollmentData } from '@/types/models'

export const dynamic = 'force-dynamic'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

export default async function MarksEntryPage() {
  let terms: TermData[] = []
  let initialEnrollments: EnrollmentData[] = []
  let allowedDepartment: 'secular' | 'theology' | 'both' = 'both'
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return <div className="p-6 text-stone-700">Unauthorized</div>
    }
    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized) {
      return <div className="p-6 text-rose-700">Access Denied: {access.message}</div>
    }

    if (access.filterByDepartment === 'secular' || access.filterByDepartment === 'theology') {
      allowedDepartment = access.filterByDepartment
    }

    let enrollQuery = supabase
      .from('enrollments')
      .select(`
        id,
        academic_year,
        is_active,
        circular_class_id,
        theology_class_id,
        circular_classes ( id, class_name, section ),
        theology_classes ( id, class_name_arabic, class_name_english, level ),
        students!inner ( id, name, admission_number, created_at, arabic_name, is_archived )
      `)
      .eq('is_active', true)
      .order('academic_year', { ascending: false })

    let skipEnrollQuery = false
    if (access.filterByClasses) {
      const circularClassIds = classIdsForType(access, 'circular') ?? []
      const theologyClassIds = classIdsForType(access, 'theology') ?? []
      const validUuid = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const filters = [
        ...(circularClassIds.filter(validUuid).length
          ? [`circular_class_id.in.(${circularClassIds.filter(validUuid).join(',')})`]
          : []),
        ...(theologyClassIds.filter(validUuid).length
          ? [`theology_class_id.in.(${theologyClassIds.filter(validUuid).join(',')})`]
          : []),
      ]
      if (filters.length === 0) {
        skipEnrollQuery = true
      } else {
        enrollQuery = enrollQuery.or(filters.join(','))
      }
    } else if (access.filterByDepartment === 'theology') {
      enrollQuery = enrollQuery.not('theology_class_id', 'is', null)
    } else if (access.filterByDepartment === 'secular') {
      enrollQuery = enrollQuery.not('circular_class_id', 'is', null)
    }

    const [termRes, enrollRes] = await Promise.all([
      supabase
        .from('terms')
        .select('id, academic_year, term_number, label, is_current')
        .order('academic_year', { ascending: false })
        .order('term_number', { ascending: true }),
      skipEnrollQuery ? Promise.resolve({ data: [], error: null }) : enrollQuery,
    ])

    if (termRes.error) {
      throw termRes.error
    }
    terms = termRes.data || []

    if (!enrollRes.error && enrollRes.data) {
      const activeRows = (enrollRes.data as any[]).filter((row: any) => {
        const studentObj = Array.isArray(row.students) ? row.students[0] : row.students
        return studentObj?.is_archived !== true
      })
      const reshaped = activeRows
        .map((e) => reshapeEnrollmentRow(e))
        .filter((row): row is NonNullable<typeof row> => row != null)

      initialEnrollments = reshaped.map((e: any) => ({
        id: e.enrollment_id || e.id,
        student_id: e.id ?? null,
        name: e.name || 'Unknown Student',
        arabic_name: e.arabic_name || null,
        admission_number: e.admission_number || '',
        circular_class: e.circular_class || '',
        section: e.section || null,
        theology_class_arabic: e.theology_class_arabic || null,
        theology_class_level: e.theology_class_english || null,
        theology_status: e.theology_class_arabic ? 'active' : 'inactive',
      }))
    }
  } catch (err: any) {
    error = err?.message || err?.details || err?.hint || 'Failed to load terms data'
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="bg-white border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-stone-900 tracking-tight">Marks Entry</h1>
            <p className="text-stone-500 text-xs">
              Select a term, student, and enter scores per subject.
            </p>
          </div>
          {allowedDepartment !== 'both' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              {allowedDepartment === 'secular' ? 'Secular Department' : 'Theology Department'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 py-2.5 sm:py-4 w-full min-w-0">
        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-rose-800 font-semibold text-sm">System Error: {error}</p>
            <p className="text-rose-600 text-xs mt-1">Please verify the database connection and active academic term.</p>
          </div>
        ) : (
          <AdminMarksEntryClient
            terms={terms}
            initialEnrollments={initialEnrollments}
            allowedDepartment={allowedDepartment}
          />
        )}
      </div>
    </div>
  )
}
