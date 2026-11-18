import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import CircularClient from '@/components/layout/circular-client'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

export default async function CircularPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10 text-rose-600 font-medium">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read', null, 'secular')
  if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
    return <div className="p-10 text-rose-600 font-medium">Access Denied: Insufficient permissions to view Secular marks.</div>
  }

  // Fetch active term
  const { data: activeTerm } = await supabase
    .from('terms')
    .select('*')
    .eq('is_current', true)
    .single()

  let marksQuery = supabase
    .from('circular_marks')
    .select(`
      id,
      enrollment_id,
      subject_id,
      term_id,
      bot_score,
      mot_score,
      eot_score,
      enrollments (
        id,
        student_id,
        circular_class_id,
        students ( name ),
        circular_classes ( class_name, section )
      ),
      circular_subjects ( subject_name, section )
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
    supabase.from('enrollments').select('id, student_id, circular_class_id, students(name), circular_classes(class_name, section)'),
    supabase.from('circular_subjects').select('*')
  ])

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <CircularClient 
        initialMarks={marks || []} 
        initialEnrollments={enrollments || []} 
        initialSubjects={subjects || []} 
        initialActiveTerm={activeTerm} 
      />
    </div>
  )
}
