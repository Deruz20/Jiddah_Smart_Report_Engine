import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TermsClient, { AcademicTerm } from '@/components/layout/terms-client'

export const dynamic = "force-dynamic";

export default async function TermsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: terms } = await supabase
    .from('academic_terms')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <TermsClient initialTerms={(terms as AcademicTerm[]) || []} />
    </div>
  )
}
