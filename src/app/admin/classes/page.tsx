import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ClassesClient, { ClassData } from '@/components/layout/classes-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { resolveUserScope } from '@/lib/access-scope'
import { UnassignedTeacherState } from '@/components/UnassignedTeacherState'

export const dynamic = "force-dynamic";

export default async function ClassesManagementPage() {
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
          moduleName="Classes & Rosters"
          roleLabel={userScope.rawRole}
          department={userScope.department}
        />
      </div>
    )
  }

  const classList: ClassData[] = []

  if (userScope.canAccessSecular) {
    let cQuery = supabase
      .from('circular_classes')
      .select('id, class_name, section')
      .order('section', { ascending: true })
      .order('class_name', { ascending: true })

    if (!userScope.isFullAccess) {
      if (userScope.allowedCircularClassIds.length > 0) {
        cQuery = cQuery.in('id', userScope.allowedCircularClassIds)
      } else {
        cQuery = cQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
      }
    }

    const { data: cClasses } = await cQuery
    ;(cClasses || []).forEach((c: any) => {
      classList.push({
        id: c.id,
        class_name: c.class_name,
        section: c.section || 'lower_primary',
        track: 'secular',
      })
    })
  }

  if (userScope.canAccessTheology) {
    let tQuery = supabase
      .from('theology_classes')
      .select('id, class_name_english, class_name_arabic')
      .order('class_name_english', { ascending: true })

    if (!userScope.isFullAccess) {
      if (userScope.allowedTheologyClassIds.length > 0) {
        tQuery = tQuery.in('id', userScope.allowedTheologyClassIds)
      } else {
        tQuery = tQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
      }
    }

    const { data: tClasses } = await tQuery
    ;(tClasses || []).forEach((t: any) => {
      const nameEn = t.class_name_english || t.class_name_arabic || 'Theology Cohort'
      classList.push({
        id: t.id,
        class_name: t.class_name_arabic ? `${nameEn} (${t.class_name_arabic})` : nameEn,
        section: 'theology',
        track: 'theology',
      })
    })
  }

  const canManageClasses = userScope.isFullAccess

  return (
    <div className="w-full h-full bg-[#FAF7F2]">
      <ClassesClient
        initialClasses={classList}
        canManageClasses={canManageClasses}
      />
    </div>
  )
}
