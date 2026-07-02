import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport'
import P7EOTReport from '@/components/reports/P7EOTReport'
import { PrintButton } from '@/components/PrintButton'

type StudentData = {
  id: string
  name: string
  class_name: string
}

type CircularResult = {
  id: string
  student_id: string
  subject: string
  mot_mark: number | null
  eot_mark: number | null
  grade: string | null
  remark: string | null
  teacher_initials: string | null
}

type TheologyResult = {
  id: string
  student_id: string
  subject: string
  mot_score: number | null
  eot_score: number | null
}

interface SearchParams {
  term?: string
  year?: string
  class_id?: string
}

export default async function EOTReportsPage(props: { searchParams?: SearchParams }) {
  const searchParams = props.searchParams || {}
  const term = searchParams.term || 'Term 1'
  const year = parseInt(searchParams.year || '2026')
  const classId = searchParams.class_id

  let students: StudentData[] = []
  let circularResults: CircularResult[] = []
  let theologyResults: TheologyResult[] = []
  let error: string | null = null
  let filterClassName: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // If class_id is provided, fetch the class_name
    if (classId) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('class_name')
        .eq('id', classId)
        .single()

      if (classError) {
        console.error('Error fetching class:', classError)
        error = 'Failed to load class information.'
      } else if (classData) {
        filterClassName = classData.class_name
      }
    }

    // Fetch students
    let query = supabase
      .from('students')
      .select('id, name, class_name')
      .order('class_name', { ascending: true })
      .order('name', { ascending: true })

    // Apply class_name filter if available
    if (filterClassName) {
      query = query.eq('class_name', filterClassName)
    }

    const { data: studentData, error: studentError } = await query

    if (studentError) {
      console.error('Error fetching students:', studentError)
      error = 'Failed to load students.'
    } else {
      students = studentData || []
    }

    // Fetch circular EOT results with term/year filters
    const { data: circularData, error: circularError } = await supabase
      .from('circular_results')
      .select('*')
      .eq('term', term)
      .eq('year', year)
      .not('eot_mark', 'is', null)

    if (circularError) {
      console.error('Error fetching circular results:', circularError)
    } else {
      circularResults = circularData || []
    }

    // Fetch theology EOT results with term/year filters
    const { data: theologyData, error: theologyError } = await supabase
      .from('theology_results')
      .select('*')
      .eq('term', term)
      .eq('year', year)
      .not('eot_score', 'is', null)

    if (theologyError) {
      console.error('Error fetching theology results:', theologyError)
    } else {
      theologyResults = theologyData || []
    }

  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data'
  }

  // Group results by student
  const getTermNumber = (termString: string) => {
    const match = termString.match(/\d+/)
    return match ? parseInt(match[0], 10) : 1
  }

  const inferSectionType = (className: string) => {
    if (/nursery/i.test(className)) return 'nursery'
    if (/\b(p[4-8]|primary\s*[4-8]|grade\s*[4-8])\b/i.test(className)) return 'upper_primary'
    return 'lower_primary'
  }

  const buildReportData = (student: StudentData, circular: CircularResult[], theology: TheologyResult[]) => {
    const sectionType = inferSectionType(student.class_name)
    const termNumber = getTermNumber(term)
    const circularSubjects = circular.map((item) => ({
      subject_name: item.subject,
      score: item.eot_mark,
      grade_display: item.grade ?? '--',
      remark: item.remark ?? '',
      is_core: false,
    }))
    const theologySubjects = theology.map((item) => ({
      subject_name_arabic: item.subject,
      score: item.eot_score,
      grade_display: '--',
    }))

    return {
      student: {
        name: student.name,
        admission_number: student.id,
        class_name: student.class_name,
        section: student.class_name,
        academic_year: year,
      },
      term: {
        label: term,
        term_number: termNumber,
        academic_year: year,
      },
      score_type: 'eot',
      section_type: sectionType,
      circular: {
        subjects: circularSubjects,
        total: circularSubjects.reduce((sum, item) => sum + (item.score ?? 0), 0),
        aggregate: null,
        division: null,
      },
      theology: {
        subjects: theologySubjects,
        total: theologySubjects.reduce((sum, item) => sum + (item.score ?? 0), 0),
        aggregate: null,
        division: null,
      },
      meta: {
        is_term_3: term === 'Term 3',
        promotion_status: null,
      },
    }
  }

  const studentReports = students.map(student => {
    const circular = circularResults.filter(r => r.student_id === student.id)
    const theology = theologyResults.filter(r => r.student_id === student.id)

    return {
      student,
      circular,
      theology
    }
  })

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 print:hidden">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">EOT Combined Report — {term}, {year}</h1>
        <p className="text-gray-600">End-Of-Term combined report for all subjects</p>
      </div>

      {/* Filter Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 print:hidden">
        <div className="flex gap-4 items-end justify-between flex-wrap mb-4">
          <form method="get" className="flex gap-4 items-end flex-wrap">
            <div>
              <label htmlFor="filter-term" className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select 
                id="filter-term" 
                name="term" 
                defaultValue={term}
                className="border rounded px-3 py-2"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-year" className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <input
                id="filter-year"
                type="number"
                name="year"
                defaultValue={year}
                min={2000}
                max={2100}
                className="border rounded px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Filter
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 print:hidden">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {studentReports.map(({ student, circular, theology }) => {
          const reportData = buildReportData(student, circular, theology)
          return student.class_name?.toLowerCase() === 'p.7' ? (
            <P7EOTReport key={student.id} reportData={reportData} />
          ) : (
            <PrimaryEOTReport key={student.id} reportData={reportData} />
          )
        })}

        {studentReports.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center print:hidden">
            <p className="text-gray-500">No student data available</p>
          </div>
        )}
      </div>
    </div>
  )
}