import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ReportGeneratorClient } from '@/components/ReportGeneratorClient'

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white print:pb-0">
      <div className="bg-white border-b border-gray-200 shrink-0 print:hidden">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-[#0f5b48] hover:text-[#0c4a3a] font-bold text-sm transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Generate Reports</h1>
          <p className="text-sm font-medium text-gray-500 mt-0.5">Build printable circular and theology report cards for selected students.</p>
        </div>
      </div>

      <div className="flex-1 w-full print:p-0 print:m-0">
        {error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg print:hidden max-w-[1600px] mx-auto mt-6">
            <p className="text-red-800 font-medium">❌ System Error: {error}</p>
            <p className="text-red-600 text-sm mt-1">Please ensure the database connection is active and terms exist.</p>
          </div>
        ) : (
          <ReportGeneratorClient terms={terms} />
        )}
      </div>
    </div>
  )
}
