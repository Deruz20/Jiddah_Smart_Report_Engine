import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ClassesClient, { ClassData } from '@/components/layout/classes-client'

export const dynamic = "force-dynamic";

export default async function ClassesManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: classes } = await supabase
    .from('circular_classes')
    .select('id, class_name, section')
    .order('section', { ascending: true })
    .order('class_name', { ascending: true })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <ClassesClient initialClasses={(classes as ClassData[]) || []} />
    </div>
  )
}
