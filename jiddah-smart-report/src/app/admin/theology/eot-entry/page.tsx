import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import TheologyEntryClient from '../TheologyEntryClient'

type StudentData = {
  id: string
  name: string
  class_name: string
}

export default async function TheologyEOTEntryPage() {
  let students: StudentData[] = []
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

  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load students'
  }

  const theologySubjects = ['Quran', 'Fiqh', 'Tarbiya', 'Arabic']

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Theology EOT Entry</h1>
        <p className="text-gray-600">Enter End-Of-Term scores for Arabic subjects</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="theology-eot-term" className="block text-sm font-medium text-gray-700 mb-2">Term</label>
            <select id="theology-eot-term" className="border rounded px-3 py-2 w-full">
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div>
            <label htmlFor="theology-eot-year" className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              id="theology-eot-year"
              type="number"
              defaultValue={2026}
              min={2000}
              max={2100}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 border-b text-left">Student</th>
                <th className="px-4 py-2 border-b text-left">Class</th>
                {theologySubjects.map(subject => (
                  <th key={subject} className="px-4 py-2 border-b text-left">{subject} EOT</th>
                ))}
                <th className="px-4 py-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b">
                  <td className="px-4 py-2 font-medium">{student.name}</td>
                  <td className="px-4 py-2">{student.class_name}</td>
                  {theologySubjects.map(subject => (
                    <td key={subject} className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="border rounded px-2 py-1 w-20 theology-eot-input"
                        placeholder="0-100"
                        data-subject={subject}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      data-action="save-theology-eot"
                      data-student-id={student.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TheologyEntryClient students={students} entryType="EOT" />
    </div>
  )
}