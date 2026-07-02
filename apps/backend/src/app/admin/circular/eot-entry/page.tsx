import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CircularEntryClient from '../CircularEntryClient'

type StudentData = {
  id: string
  name: string
  class_name: string
}

export default async function CircularEOTEntryPage() {
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Circular EOT Entry</h1>
        <p className="text-gray-600">Enter End-Of-Term marks for English subjects</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <CircularEntryClient students={students} entryType="EOT" />
    </div>
  )
}