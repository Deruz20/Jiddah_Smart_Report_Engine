import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SettingsClient from '@/components/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function TermSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10 text-stone-800 bg-[#FDFBF7] min-h-screen">Unauthorized</div>

  const { verifyDataAccess } = await import('@/lib/auth-server')
  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized || (authRes.role !== 'Administrator' && authRes.role !== 'admin')) {
    return <div className="p-10 text-rose-700 bg-[#FDFBF7] min-h-screen">Access Denied: You must be an Administrator to access Settings.</div>
  }

  const { data: terms, error } = await supabase
    .from('terms')
    .select('id, label, academic_year, term_number, is_current, start_date, end_date, next_term_start')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 text-sm">
          Failed to load terms: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SettingsClient terms={terms ?? []} />
      </div>
    </div>
  )
}
