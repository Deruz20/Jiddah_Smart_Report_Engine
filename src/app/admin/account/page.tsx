import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AccountClient, { UserProfileData } from '@/components/layout/account-client'
import {
  normalizeAccountRole,
  resolveAssignedClassDisplayForTeacher,
  resolveRoleDepartment,
  resolveStaffRoleKey,
} from '@/lib/teacher-access'

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  let profile: UserProfileData | null = null
  let email = ''

  if (user) {
    email = user.email || ''
    const supabaseAdmin = createAdminClient(cookieStore)
    const [{ data: profileData }, { data: teacherRowByAuth }, { data: teacherRowByEmail }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, role, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('teachers')
        .select('*')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle(),
      email
        ? supabaseAdmin
            .from('teachers')
            .select('*')
            .ilike('email', email)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const teacherRow = teacherRowByAuth || teacherRowByEmail

    const rawRole =
      teacherRow?.role ||
      profileData?.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'Administrator'
    const subjectStr = teacherRow?.subject || user.user_metadata?.subject || ''
    const canonicalRole = normalizeAccountRole(rawRole, subjectStr)
    const staffRole = resolveStaffRoleKey(rawRole, subjectStr)
    const dept = resolveRoleDepartment(rawRole, subjectStr)
    const departmentDisplay =
      canonicalRole === 'Administrator' ||
      canonicalRole === 'Principal' ||
      canonicalRole === 'Head Teacher' ||
      dept === 'both'
        ? 'All Departments'
        : dept === 'theology'
          ? 'Theology Track'
          : 'Secular Track'

    const { assignedClasses } = await resolveAssignedClassDisplayForTeacher(
      supabaseAdmin,
      canonicalRole,
      staffRole,
      teacherRow
    )

    profile = {
      id: profileData?.id || user.id,
      email,
      username: teacherRow?.username || '',
      pending_email: (user as any).new_email || teacherRow?.pending_email || user.user_metadata?.pending_email || null,
      full_name:
        teacherRow?.name ||
        profileData?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0] ||
        '',
      phone: teacherRow?.phone ?? profileData?.phone ?? '',
      role: staffRole,
      canonical_role: canonicalRole,
      department: departmentDisplay,
      assigned_classes: assignedClasses,
      assigned_subjects: subjectStr ? [subjectStr] : [],
      avatar_url: teacherRow?.avatar || profileData?.avatar_url || user.user_metadata?.avatar_url || '',
      last_sign_in_at: (user as any).last_sign_in_at || null,
    }
  }

  return (
    <div className="w-full h-full bg-[#F8FAF8] dark:bg-[#0B100E]">
      <AccountClient initialProfile={profile} userEmail={email} />
    </div>
  )
}
