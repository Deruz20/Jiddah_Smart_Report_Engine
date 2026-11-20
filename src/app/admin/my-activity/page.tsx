import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import MyActivityClient from '@/components/layout/my-activity-client'
import { verifyDataAccess } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

export default async function MyActivityPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  let teacherName = user.email || 'Staff Member';
  let teacherEmail = user.email || '';

  if (authRes.teacherId) {
    const { data: t } = await supabase
      .from('teachers')
      .select('name, email')
      .eq('id', authRes.teacherId)
      .maybeSingle();
    if (t?.name) teacherName = t.name;
    if (t?.email) teacherEmail = t.email;
  }

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <MyActivityClient teacherName={teacherName} teacherEmail={teacherEmail} />
    </div>
  )
}

