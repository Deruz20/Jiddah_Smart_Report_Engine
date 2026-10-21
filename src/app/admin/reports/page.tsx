import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { ReportGeneratorClient } from '@/components/ReportGeneratorClient'
import { verifyDataAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

export default async function ReportsManagementPage() {
  let terms: TermData[] = []
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return (
        <div className="p-6 text-rose-700 font-medium max-w-xl mx-auto mt-8 bg-rose-50 border border-rose-200 rounded-xl">
          Unauthorized: You must be logged in to access the Report Center.
        </div>
      )
    }

    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized) {
      return (
        <div className="p-6 text-rose-700 font-medium max-w-xl mx-auto mt-8 bg-rose-50 border border-rose-200 rounded-xl">
          Access Denied: {access.message || 'You do not have permission to access the Report Center.'}
        </div>
      )
    }

    const { data: termData, error: termError } = await supabase
      .from('terms')
      .select('id, academic_year, term_number, label, is_current')
      .order('academic_year', { ascending: false })
      .order('term_number', { ascending: true })

    if (termError) throw termError
    terms = termData || []
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load terms'
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl print:hidden max-w-3xl mx-auto mt-6">
        <p className="text-rose-800 font-semibold text-sm">System Error: {error}</p>
        <p className="text-rose-600 text-xs mt-1">Please ensure the database connection is active and terms exist.</p>
      </div>
    )
  }

  return <ReportGeneratorClient terms={terms} />
}
