import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import CircularClient from '@/components/layout/circular-client'

export const dynamic = "force-dynamic";

export default async function CircularPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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
