import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeachersClient, { DashboardTeacher } from '@/components/layout/teachers-client'

import { verifyDataAccess } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

export default async function TeachersManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const authRes = await verifyDataAccess(supabase);
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  let query = supabase.from('teachers').select('*').order('name', { ascending: true });

  if (authRes.filterByDepartment === 'secular') {
    query = query.not('subject', 'ilike', '%Theology%');
  } else if (authRes.filterByDepartment === 'theology') {
    query = query.ilike('subject', '%Theology%');
  }

  const { data: teachers } = await query;

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

  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  let currentUserRole = user?.user_metadata?.role || 'teacher'
  let currentUserSubject = ''

  if (user?.email) {
    const { data: profile } = await supabase.from('teachers').select('role, subject').eq('email', user.email).single()
    if (profile) {
      currentUserRole = profile.role
      currentUserSubject = profile.subject
    }
  }

  // Normalize Administrator to admin so the TeachersClient correctly grants full edit capabilities
  if (currentUserRole === 'Administrator' || currentUserRole === 'admin') {
    currentUserRole = 'admin';
  }

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <TeachersClient initialTeachers={formattedTeachers} currentUserRole={currentUserRole} currentUserSubject={currentUserSubject} />
    </div>
  )
}
