import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SubjectsClient, { SubjectData } from '@/components/layout/subjects-client'

export const dynamic = "force-dynamic";

export default async function SubjectsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch both circular and theology subjects
  const { data: circular } = await supabase
    .from('circular_subjects')
    .select('id, subject_name, section')
    .order('subject_name', { ascending: true })

  const { data: theology } = await supabase
    .from('theology_subjects')
    .select('id, subject_name, section')
    .order('subject_name', { ascending: true })

  const combined = [
    ...(circular || []).map((s: any) => ({ ...s, curriculum: 'secular' })),
    ...(theology || []).map((s: any) => ({ ...s, curriculum: 'theology' }))
  ]

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <SubjectsClient initialSubjects={combined as SubjectData[]} />
    </div>
  )
}
