import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SubjectsClient, { SubjectData } from '@/components/layout/subjects-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { resolveUserScope, canAccessSubjectInScope } from '@/lib/access-scope'
import { UnassignedTeacherState } from '@/components/UnassignedTeacherState'

export const dynamic = "force-dynamic";

export default async function SubjectsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized) {
    redirect('/admin')
  }

  const userScope = resolveUserScope(authRes)

  if (userScope.isUnassigned) {
    return (
      <div className="w-full min-h-full bg-[#FAF7F2] py-10">
        <UnassignedTeacherState
          moduleName="Subjects & Curriculum"
          roleLabel={userScope.rawRole}
          department={userScope.department}
        />
      </div>
    )
  }

  const combined: SubjectData[] = []

  if (userScope.canAccessSecular) {
    const { data: circular } = await supabase
      .from('circular_subjects')
      .select('id, subject_name, section')
      .order('subject_name', { ascending: true })

    ;(circular || []).forEach((s: any) => {
      if (
        canAccessSubjectInScope(userScope, null, s.id, 'secular') ||
        canAccessSubjectInScope(userScope, null, s.subject_name, 'secular')
      ) {
        combined.push({
          id: s.id,
          subject_name: s.subject_name,
          section: s.section || 'lower_primary',
          curriculum: 'secular',
        })
      }
    })
  }

  if (userScope.canAccessTheology) {
    const { data: theology } = await supabase
      .from('theology_subjects')
      .select('id, subject_name_arabic, subject_name_english, level, sort_order')
      .order('sort_order', { ascending: true })

    ;(theology || []).forEach((s: any) => {
      const displayName = s.subject_name_arabic || s.subject_name_english || 'Theology Subject'
      if (
        canAccessSubjectInScope(userScope, null, s.id, 'theology') ||
        canAccessSubjectInScope(userScope, null, s.subject_name_arabic, 'theology') ||
        canAccessSubjectInScope(userScope, null, s.subject_name_english, 'theology')
      ) {
        combined.push({
          id: s.id,
          subject_name: displayName,
          section: s.level || 'raudha',
          level: s.level || 'raudha',
          curriculum: 'theology',
        })
      }
    })
  }

  const canManageSubjects = userScope.isFullAccess

  return (
    <div className="w-full h-full bg-[#FAF7F2]">
      <SubjectsClient
        initialSubjects={combined}
        allowedDepartment={userScope.department}
        canManageSubjects={canManageSubjects}
      />
    </div>
  )
}
