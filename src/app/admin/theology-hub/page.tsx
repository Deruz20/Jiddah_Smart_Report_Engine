import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TheologyHubClient from '@/components/theology-hub/TheologyHubClient'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type TheologyClassData = {
  id: string
  class_name_arabic: string
  class_name_english: string
  level: string
}

export const dynamic = "force-dynamic";

export default async function TheologyHubPage() {
  let terms: TermData[] = []
  let theologyClasses: TheologyClassData[] = []
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const [termsRes, classesRes] = await Promise.all([
      supabase
        .from('terms')
        .select('id, academic_year, term_number, label, is_current')
        .order('academic_year', { ascending: false })
        .order('term_number', { ascending: true }),
      supabase
        .from('theology_classes')
        .select('id, class_name_arabic, class_name_english, level')
        .order('level', { ascending: true })
        .order('class_name_arabic', { ascending: true })
    ])

    if (termsRes.error) throw termsRes.error
    if (classesRes.error) throw classesRes.error

    terms = termsRes.data || []
    theologyClasses = classesRes.data || []
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load initial data'
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg print:hidden max-w-[1600px] mx-auto mt-6">
        <p className="text-red-800 font-medium">❌ System Error: {error}</p>
        <p className="text-red-600 text-sm mt-1">Please ensure the database connection is active.</p>
      </div>
    )
  }

  return <TheologyHubClient terms={terms} theologyClasses={theologyClasses} />
}
