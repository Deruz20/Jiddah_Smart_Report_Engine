import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { CreateTermForm } from '@/components/CreateTermForm'

type AcademicTerm = {
  id: string
  year: number
  term: string
  start_date?: string
  end_date?: string
  created_at?: string
}

export default async function TermsManagementPage() {
  let terms: AcademicTerm[] | null = null
  let error: string | null = null

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error: fetchError } = await supabase
      .from('academic_terms')
      .select('*')
      .order('year', { ascending: false })
      .order('term', { ascending: false })

    if (fetchError) {
      error = fetchError.message
    } else {
      terms = data || []
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch academic terms'
  }

  const getTermLabel = (term: string) => {
    const labels: Record<string, string> = {
      beginning: '1st Term',
      midterm: '2nd Term',
      endterm: '3rd Term',
    }
    return labels[term] || term
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Terms Management</h1>
          <p className="text-gray-600 mt-1">Create and manage academic terms for your institution</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section - Left Side (2 columns on lg) */}
          <div className="lg:col-span-2">
            <CreateTermForm />
          </div>

          {/* Summary Section - Right Side (1 column on lg) */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">Overview</h3>
              <div className="text-3xl font-bold text-emerald-600 mb-2">{terms?.length || 0}</div>
              <p className="text-sm text-gray-600">Terms configured</p>
            </div>

            {/* Help Card */}
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
              <h4 className="text-sm font-semibold text-emerald-900 mb-3">💡 Tips</h4>
              <ul className="text-xs text-emerald-700 space-y-2">
                <li>• Use a consistent naming format for terms</li>
                <li>• Set dates for accurate scheduling</li>
                <li>• Terms are ordered by year and type</li>
                <li>• Each term requires a year and type</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms List Section */}
        <div className="mt-12">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Academic Terms</h2>
              <p className="text-sm text-gray-600 mt-1">
                {terms && terms.length > 0
                  ? `${terms.length} term${terms.length === 1 ? '' : 's'} configured in the system`
                  : 'No academic terms configured yet'}
              </p>
            </div>

            {error ? (
              <div className="p-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-medium">❌ Error: {error}</p>
                </div>
              </div>
            ) : terms && terms.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <th className="px-6 py-3">Year</th>
                        <th className="px-6 py-3">Term</th>
                        <th className="px-6 py-3">Start Date</th>
                        <th className="px-6 py-3">End Date</th>
                        <th className="px-6 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((term) => (
                        <tr key={term.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-semibold text-gray-900">{term.year}</td>
                          <td className="px-6 py-4">
                            <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                              {getTermLabel(term.term)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(term.start_date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(term.end_date)}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {term.created_at ? new Date(term.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-6 space-y-4">
                  {terms.map((term) => (
                    <div key={term.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg text-gray-900">{term.year}</p>
                          <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium mt-2">
                            {getTermLabel(term.term)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start:</span>
                          <span className="font-medium text-gray-900">{formatDate(term.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">End:</span>
                          <span className="font-medium text-gray-900">{formatDate(term.end_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-gray-600 font-medium">No academic terms found</p>
                <p className="text-sm text-gray-500 mt-2">Create your first academic term using the form above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
