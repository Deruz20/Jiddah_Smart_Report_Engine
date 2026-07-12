import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeachersClient, { DashboardTeacher } from '@/components/layout/teachers-client'

export const dynamic = "force-dynamic";

export default async function TeachersManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: teachers } = await supabase
    .from('teachers')
    .select('*')
    .order('name', { ascending: true })

  const formattedTeachers = (teachers || []).map((t: any) => ({
    id: t.id,
    name: t.name || '',
    role: t.role || '',
    subject: t.subject || '',
    classes: typeof t.classes === 'string' ? t.classes.split(',').map((c: string) => c.trim()).filter(Boolean) : (t.classes || []),
    email: t.email || '',
    phone: t.phone || '',
    status: t.status || 'active',
    joined: t.created_at || ''
  }))

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <TeachersClient initialTeachers={formattedTeachers} />
    </div>
  )
}
