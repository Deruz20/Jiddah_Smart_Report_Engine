import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ClassDashboardClient from '@/components/layout/class-dashboard-client'

export const dynamic = "force-dynamic";

export default async function ClassDetailsPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Fetch Class Data
  const { data: classData, error: classError } = await supabase
    .from('circular_classes')
    .select('*, class_teacher:teachers!class_teacher_id(*)')
    .eq('id', params.id)
    .single()

  if (classError || !classData) {
    return <div className="p-8 text-center text-red-500">Error loading class: {classError?.message || 'Class not found'}</div>
  }

  // 2. Fetch Enrollments with Student details
  // Note: enrollments table has student_id
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('*, student:students(*)')
    .eq('circular_class_id', params.id)
    .eq('is_active', true)

  const validEnrollments = enrollments || []

  // 3. Fetch Subjects for this section
  // Since we don't have subject_assignments, we'll fetch from subjects table for this section,
  // or fetch all subjects if they apply to this section. (Let's fetch all subjects for now, or filter by section if applicable).
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('*')
    .order('subject_name')
  
  // 4. Fetch Teachers for assigning class teacher
  const { data: teachersData } = await supabase
    .from('teachers')
    .select('*')
    .order('name')

  // Calculate some KPIs
  // To get performance data, we would fetch circular_marks where enrollment_id is in our list.
  const enrollmentIds = validEnrollments.map(e => e.id)
  let marksData: any[] = []
  if (enrollmentIds.length > 0) {
    const { data: marks } = await supabase
      .from('circular_marks')
      .select('*')
      .in('enrollment_id', enrollmentIds)
    if (marks) marksData = marks
  }

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <ClassDashboardClient 
        classData={classData} 
        enrollments={validEnrollments}
        subjects={subjectsData || []}
        teachers={teachersData || []}
        marks={marksData}
      />
    </div>
  )
}
