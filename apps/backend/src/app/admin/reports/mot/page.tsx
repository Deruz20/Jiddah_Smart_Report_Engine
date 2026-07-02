import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

type StudentData = {
  id: number
  name: string
  class_name: string
}

type CircularResult = {
  id: number
  student_id: number
  subject: string
  mot_mark: number | null
  eot_mark: number | null
  grade: string | null
  remark: string | null
  teacher_initials: string | null
}

type TheologyResult = {
  id: number
  student_id: number
  subject: string
  mot_score: number | null
  eot_score: number | null
}

export default async function MOTReportsPage() {
  let students: StudentData[] = []
  let circularResults: CircularResult[] = []
  let theologyResults: TheologyResult[] = []
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetch students
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, name, class_name')
      .order('class_name', { ascending: true })
      .order('name', { ascending: true })

    if (studentError) {
      console.error('Error fetching students:', studentError)
      error = 'Failed to load students.'
    } else {
      students = studentData || []
    }

    // Fetch circular MOT results
    const { data: circularData, error: circularError } = await supabase
      .from('circular_results')
      .select('*')
      .not('mot_mark', 'is', null)

    if (circularError) {
      console.error('Error fetching circular results:', circularError)
    } else {
      circularResults = circularData || []
    }

    // Fetch theology MOT results
    const { data: theologyData, error: theologyError } = await supabase
      .from('theology_results')
      .select('*')
      .not('mot_score', 'is', null)

    if (theologyError) {
      console.error('Error fetching theology results:', theologyError)
    } else {
      theologyResults = theologyData || []
    }

  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data'
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">MOT Reports</h1>
        <p className="text-gray-600">Mid-Of-Term reports for Circular and Theology subjects</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Circular MOT Report */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Circular MOT Report</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border-b text-left">Student</th>
                  <th className="px-4 py-2 border-b text-left">Class</th>
                  <th className="px-4 py-2 border-b text-left">Subject</th>
                  <th className="px-4 py-2 border-b text-left">MOT Mark</th>
                  <th className="px-4 py-2 border-b text-left">Grade</th>
                  <th className="px-4 py-2 border-b text-left">Remark</th>
                  <th className="px-4 py-2 border-b text-left">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {circularResults.map((result) => {
                  const student = students.find(s => s.id === result.student_id)
                  return (
                    <tr key={result.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{student?.name || 'Unknown'}</td>
                      <td className="px-4 py-2">{student?.class_name || '-'}</td>
                      <td className="px-4 py-2">{result.subject}</td>
                      <td className="px-4 py-2">{result.mot_mark || '-'}</td>
                      <td className="px-4 py-2">{result.grade || '-'}</td>
                      <td className="px-4 py-2">{result.remark || '-'}</td>
                      <td className="px-4 py-2">{result.teacher_initials || '-'}</td>
                    </tr>
                  )
                })}
                {circularResults.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No circular MOT results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Theology MOT Report */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Theology MOT Report</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border-b text-left">Student</th>
                  <th className="px-4 py-2 border-b text-left">Class</th>
                  <th className="px-4 py-2 border-b text-left">Subject</th>
                  <th className="px-4 py-2 border-b text-left">MOT Score</th>
                </tr>
              </thead>
              <tbody>
                {theologyResults.map((result) => {
                  const student = students.find(s => s.id === result.student_id)
                  return (
                    <tr key={result.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{student?.name || 'Unknown'}</td>
                      <td className="px-4 py-2">{student?.class_name || '-'}</td>
                      <td className="px-4 py-2">{result.subject}</td>
                      <td className="px-4 py-2">{result.mot_score || '-'}</td>
                    </tr>
                  )
                })}
                {theologyResults.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No theology MOT results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}