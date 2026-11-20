import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import { isAdministratorRole } from '@/lib/teacher-access'
import InvitesClient, { TeacherInviteItem } from '@/components/layout/invites-client'

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized || !isAdministratorRole(authRes.role) || !hasPermission(authRes, 'manage_users')) {
    return (
      <div className="p-10 text-rose-600 font-medium">
        Access Denied: Administrator access is required to access Teacher Invites.
      </div>
    )
  }

  // Invites are admin visible
  const { data: rawInvites } = await supabase
    .from('teacher_invites')
    .select('id, email, name, role, subject, status, temp_password, created_at, claimed_at, token')
    .order('created_at', { ascending: false })

  const invites: TeacherInviteItem[] = (rawInvites || []).map((row: any) => ({
    id: String(row.id),
    email: String(row.email),
    name: row.name ?? null,
    role: String(row.role || 'teacher'),
    subject: row.subject ?? null,
    status: (row.status === 'claimed' || row.status === 'revoked' ? row.status : 'pending') as TeacherInviteItem['status'],
    temp_password: row.temp_password ?? null,
    created_at: row.created_at ?? null,
    claimed_at: row.claimed_at ?? null,
    token: row.token ?? null,
  }))

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <InvitesClient initialInvites={invites} />
    </div>
  )
}
