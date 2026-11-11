import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ClassDashboardClient from '@/components/layout/class-dashboard-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { resolveUserScope, canAccessClassInScope } from '@/lib/access-scope'

export const dynamic = "force-dynamic";

export default async function ClassDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized) {
    redirect('/admin')
  }

  const userScope = resolveUserScope(authRes)

  // 1. Try Secular (circular_classes) first, then Theology (theology_classes)
  let classData: any = null
  let isTheologyClass = false

  const { data: cClass } = await supabase
    .from('circular_classes')
    .select('*, class_teacher:teachers!class_teacher_id(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (cClass) {
    classData = cClass
  } else {
    const { data: tClass } = await supabase
      .from('theology_classes')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (tClass) {
      isTheologyClass = true
      classData = {
        id: tClass.id,
        class_name: tClass.class_name_english || tClass.class_name_arabic || 'Theology Cohort',
        section: 'theology',
        class_teacher_id: null,
        class_teacher: null,
      }
    }
  }

  if (!classData) {
    return (
      <div className="p-8 text-center text-stone-600 bg-[#FAF7F2] min-h-screen flex items-center justify-center">
        <div className="rounded-2xl bg-white border border-stone-200 p-8 max-w-md">
          <h2 className="text-lg font-bold text-stone-900">Class Cohort Not Found</h2>
          <p className="mt-1 text-sm text-stone-500">The requested class ID could not be located.</p>
        </div>
      </div>
    )
  }

  // Enforce class scope
  if (!canAccessClassInScope(userScope, params.id, isTheologyClass ? 'theology' : 'circular')) {
    redirect('/admin/classes')
  }

  // 2. Fetch Enrollments with Student details
  const enrollmentColumn = isTheologyClass ? 'theology_class_id' : 'circular_class_id'
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, student:students(*)')
    .eq(enrollmentColumn, params.id)
    .eq('is_active', true)

  const validEnrollments = enrollments || []

  // 3. Fetch Subjects for this class track
  let subjectsData: any[] = []
  if (isTheologyClass) {
    const { data: tSubjects } = await supabase
      .from('theology_subjects')
      .select('*')
      .order('subject_name_english')
    subjectsData = (tSubjects || []).map((s: any) => ({
      id: s.id,
      subject_name: s.subject_name_english || s.subject_name_arabic || 'Theology Subject',
      section: 'theology',
    }))
  } else {
    const { data: cSubjects } = await supabase
      .from('circular_subjects')
      .select('*')
      .order('subject_name')
    subjectsData = cSubjects || []
  }

  // 4. Fetch active Teachers
  const { data: teachersData } = await supabase
    .from('teachers')
    .select('*')
    .neq('status', 'inactive')
    .order('name')

  // 5. Fetch marks for performance KPIs
  const enrollmentIds = validEnrollments.map(e => e.id)
  let marksData: any[] = []
  if (enrollmentIds.length > 0) {
    const marksTable = isTheologyClass ? 'theology_marks' : 'circular_marks'
    const { data: marks } = await supabase
      .from(marksTable)
      .select('*')
      .in('enrollment_id', enrollmentIds)
    if (marks) marksData = marks
  }

  return (
    <div className="w-full h-full bg-[#FAF7F2]">
      <ClassDashboardClient 
        classData={classData} 
        enrollments={validEnrollments}
        subjects={subjectsData}
        teachers={teachersData || []}
        marks={marksData}
      />
    </div>
  )
}
