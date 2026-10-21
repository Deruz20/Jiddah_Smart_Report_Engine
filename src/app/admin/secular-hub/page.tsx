import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SecularHubClient from '@/components/secular-hub/SecularHubClient'
import { verifyDataAccess } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type CircularClassData = {
  id: string
  class_name: string
  section: string
}

export const dynamic = 'force-dynamic'

export default async function SecularHubPage() {
  let terms: TermData[] = []
  let circularClasses: CircularClassData[] = []
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return <div className="p-6 text-rose-700 font-medium">Unauthorized</div>
    }

    const access = await verifyDataAccess(supabase, user, 'read', null, 'secular')
    if (!access.isAuthorized) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl max-w-2xl mx-auto mt-6 text-rose-800 font-semibold text-sm">
          Access Denied: {access.message}
        </div>
      )
    }

    const allowedClassIds = classIdsForType(access, 'circular')

    let classesQuery = supabase
      .from('circular_classes')
      .select('id, class_name, section')
      .order('section', { ascending: true })
      .order('class_name', { ascending: true })

    if (allowedClassIds !== null) {
      if (allowedClassIds.length === 0) {
        circularClasses = []
      } else {
        classesQuery = classesQuery.in('id', allowedClassIds)
      }
    }

    const [termsRes, classesRes] = await Promise.all([
      supabase
        .from('terms')
        .select('id, academic_year, term_number, label, is_current')
        .order('academic_year', { ascending: false })
        .order('term_number', { ascending: true }),
      allowedClassIds !== null && allowedClassIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : classesQuery,
    ])

    if (termsRes.error) throw termsRes.error
    if (classesRes.error) throw classesRes.error

    terms = termsRes.data || []
    circularClasses = classesRes.data || []
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load initial data'
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl print:hidden max-w-3xl mx-auto mt-6">
        <p className="text-rose-800 font-semibold text-sm">System Error: {error}</p>
        <p className="text-rose-600 text-xs mt-1">Please ensure the database connection is active.</p>
      </div>
    )
  }

  return <SecularHubClient terms={terms} circularClasses={circularClasses as any} />
}
