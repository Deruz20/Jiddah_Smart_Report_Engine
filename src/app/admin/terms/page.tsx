import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TermsClient, { AcademicTerm } from '@/components/layout/terms-client'

export const dynamic = "force-dynamic";

export default async function TermsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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
