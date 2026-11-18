import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TheologyClient from '@/components/layout/theology-client'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

export default async function TheologyPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10 text-rose-600 font-medium">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read', null, 'theology')
  if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
    return <div className="p-10 text-rose-600 font-medium">Access Denied: Insufficient permissions to view Theology marks.</div>
  }

  // Fetch active term
  const { data: activeTerm } = await supabase
    .from('terms')
    .select('*')
    .eq('is_current', true)
    .single()

  let marksQuery = supabase
    .from('theology_marks')
    .select(`
      id,
      enrollment_id,
      subject_id,
      term_id,
      mot_score,
      eot_score,
      enrollments (
        id,
        student_id,
        theology_class_id,
        students ( name ),
        theology_classes ( class_name_english, level )
      ),
      theology_subjects ( subject_name_arabic, level )
    `)
  
  if (activeTerm) {
    marksQuery = marksQuery.eq('term_id', activeTerm.id)
  }

  const [
    { data: marks },
    { data: enrollments },
    { data: subjects }
  ] = await Promise.all([
    marksQuery,
    supabase.from('enrollments').select('id, student_id, theology_class_id, students(name), theology_classes(class_name_english, level)'),
    supabase.from('theology_subjects').select('*')
  ])

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <TheologyClient 
        initialMarks={marks || []} 
        initialEnrollments={enrollments || []} 
        initialSubjects={subjects || []} 
        initialActiveTerm={activeTerm} 
      />
    </div>
  )
}
