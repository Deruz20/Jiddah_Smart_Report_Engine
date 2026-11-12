import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AccountClient, { UserProfileData } from '@/components/layout/account-client'
import { normalizeAccountRole, resolveRoleDepartment } from '@/lib/teacher-access'

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  let profile: UserProfileData | null = null
  let email = ''

  if (user) {
    email = user.email || ''
    const [{ data: profileData }, { data: teacherRow }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, phone, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('teachers')
        .select('id, name, phone, role, subject, classes')
        .or(`auth_user_id.eq.${user.id}${email ? `,email.eq.${email}` : ''}`)
        .maybeSingle(),
    ])

    const rawRole =
      teacherRow?.role ||
      profileData?.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'Administrator'
    const subjectStr = teacherRow?.subject || user.user_metadata?.subject || ''
    const canonicalRole = normalizeAccountRole(rawRole, subjectStr)
    const dept = resolveRoleDepartment(rawRole, subjectStr)
    const departmentDisplay =
      canonicalRole === 'Administrator' || canonicalRole === 'Head Teacher' || dept === 'both'
        ? 'All Departments'
        : dept === 'theology'
          ? 'Theology Track'
          : 'Secular Track'

    profile = {
      id: profileData?.id || user.id,
      email,
      full_name: profileData?.full_name || teacherRow?.name || user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || '',
      phone: profileData?.phone || teacherRow?.phone || '',
      role: canonicalRole,
      canonical_role: canonicalRole,
      department: departmentDisplay,
      assigned_classes: Array.isArray(teacherRow?.classes) ? teacherRow.classes : [],
      assigned_subjects: subjectStr ? [subjectStr] : [],
      avatar_url: user.user_metadata?.avatar_url || profileData?.avatar_url || ''
    }
  }

  return (
    <div className="w-full h-full bg-[#F8FAF8] dark:bg-[#0B100E]">
      <AccountClient initialProfile={profile} userEmail={email} />
    </div>
  )
}
