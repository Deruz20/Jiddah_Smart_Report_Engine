import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CircularEntryClient from '../CircularEntryClient'

type TermData = { id: string; term_name: string; is_current: boolean }
type SubjectData = { id: string; subject_name: string }
type EnrollmentData = {
  enrollment_id: string
  name: string
  class_name: string
}

export default async function CircularEOTEntryPage() {
  let enrollments: EnrollmentData[] = []
  let terms: TermData[] = []
  let subjects: SubjectData[] = []
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const [enrollmentsRes, termsRes, subjectsRes] = await Promise.all([
      supabase.from('enrollments').select(`
        id,
        students (name),
        circular_classes (class_name)
      `),
      supabase.from('terms').select('id, term_name, is_current').order('term_name'),
      supabase.from('circular_subjects').select('id, subject_name').order('subject_name')
    ])

    if (enrollmentsRes.error) throw new Error('Failed to load enrollments')
    if (termsRes.error) throw new Error('Failed to load terms')
    if (subjectsRes.error) throw new Error('Failed to load subjects')

    enrollments = (enrollmentsRes.data || []).map((e: any) => ({
      enrollment_id: e.id,
      name: Array.isArray(e.students) ? e.students[0]?.name : (e.students?.name ?? 'Unknown'),
      class_name: Array.isArray(e.circular_classes) ? e.circular_classes[0]?.class_name : (e.circular_classes?.class_name ?? '—')
    })).sort((a, b) => a.class_name.localeCompare(b.class_name) || a.name.localeCompare(b.name))
    
    terms = termsRes.data || []
    subjects = subjectsRes.data || []

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
        <h1 className="text-2xl font-bold">Circular EOT Entry</h1>
        <p className="text-gray-600">Enter End-Of-Term marks for Circular subjects</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!error && (
        <CircularEntryClient 
          enrollments={enrollments} 
          terms={terms} 
          subjects={subjects} 
          entryType="EOT" 
        />
      )}
    </div>
  )
}