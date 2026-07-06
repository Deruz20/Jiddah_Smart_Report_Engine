import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import TheologyEntryClient from '../TheologyEntryClient'

type TermData = { id: string; term_name: string; is_current: boolean }
type SubjectData = { id: string; subject_name_arabic: string }
type EnrollmentData = {
  enrollment_id: string
  name: string
  class_name: string
}

export default async function TheologyMOTEntryPage() {
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
        theology_classes (class_name_arabic)
      `),
      supabase.from('terms').select('id, term_name, is_current').order('term_name'),
      supabase.from('theology_subjects').select('id, subject_name_arabic').order('subject_name_arabic')
    ])

    if (enrollmentsRes.error) throw new Error('Failed to load enrollments')
    if (termsRes.error) throw new Error('Failed to load terms')
    if (subjectsRes.error) throw new Error('Failed to load subjects')

    enrollments = (enrollmentsRes.data || []).map((e: any) => ({
      enrollment_id: e.id,
      name: Array.isArray(e.students) ? e.students[0]?.name : (e.students?.name ?? 'Unknown'),
      class_name: Array.isArray(e.theology_classes) ? e.theology_classes[0]?.class_name_arabic : (e.theology_classes?.class_name_arabic ?? '—')
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
        <h1 className="text-2xl font-bold">Theology MOT Entry</h1>
        <p className="text-gray-600">Enter Mid-Of-Term scores for Arabic subjects</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!error && (
        <TheologyEntryClient 
          enrollments={enrollments} 
          terms={terms} 
          subjects={subjects} 
          entryType="MOT" 
        />
      )}
    </div>
  )
}