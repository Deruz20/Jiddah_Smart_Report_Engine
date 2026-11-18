import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TermsClient, { AcademicTerm } from '@/components/layout/terms-client'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

export default async function TermsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="p-10 text-rose-600 font-medium">Unauthorized</div>
  }

  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized || !hasPermission(authRes, 'manage_settings')) {
    return <div className="p-10 text-rose-600 font-medium">Access Denied: Administrator permissions required to manage terms.</div>
  }

  const { data: terms } = await supabase
    .from('terms')
    .select('id, label, academic_year, term_number, is_current, start_date, end_date, next_term_start')
    .order('academic_year', { ascending: false })
    .order('term_number', { ascending: true })

  return (
    <div className="w-full min-h-screen bg-[#F8FAF8]">
      <TermsClient initialTerms={(terms as AcademicTerm[]) || []} />
    </div>
  )
}
