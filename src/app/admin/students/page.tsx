import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { StudentRegistrationContainer } from '@/components/students/StudentRegistrationContainer'
import { StudentsListClient } from '@/components/StudentsListClient'
import { MetricCard } from '@/components/figma-ui/MetricCard'
import { RegistrationTips } from '@/components/figma-ui/RegistrationTips'
import { UserPlus, ChevronDown } from 'lucide-react'

import { verifyDataAccess, hasPermission, resolveUserScope } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { UnassignedTeacherState } from '@/components/UnassignedTeacherState'

export default async function StudentsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-6 text-stone-700">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-6 text-rose-600">Access Denied: {authRes.message}</div>
  }

  let query = supabase
    .from('enrollments')
    .select(`
      academic_year,
      is_active,
      circular_class_id,
      theology_class_id,
      circular_classes ( id, class_name, section ),
      theology_classes ( id, class_name_arabic, class_name_english ),
      students ( id, name, admission_number, created_at, gender, is_archived, is_muslim, arabic_name )
    `)
    .eq('is_active', true)
    .order('academic_year', { ascending: false });

  if (authRes.filterByClasses) {
    const scope = resolveUserScope(authRes)
    const circularIds = classIdsForType(authRes, 'circular') ?? []
    const theologyIds = classIdsForType(authRes, 'theology') ?? []
    const filters = [
      ...(circularIds.length ? [`circular_class_id.in.(${circularIds.join(',')})`] : []),
      ...(theologyIds.length ? [`theology_class_id.in.(${theologyIds.join(',')})`] : []),
    ]
    if (filters.length === 0) {
      return (
        <div className="p-4 sm:p-6">
          <UnassignedTeacherState
            moduleName="Students Directory"
            department={scope.department}
            roleLabel={scope.rawRole || scope.canonicalRole}
          />
        </div>
      )
    }
    query = query.or(filters.join(','))
  } else if (authRes.filterByDepartment === 'secular') {
    query = query.not('circular_class_id', 'is', null);
  } else if (authRes.filterByDepartment === 'theology') {
    query = query.not('theology_class_id', 'is', null);
  }

  const { data: enrollments } = await query;

  let { data: activeTerm } = await supabase.from('terms').select('*').eq('is_current', true).maybeSingle();
  if (!activeTerm) {
    const { data: latestTerm } = await supabase
      .from('terms')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('term_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    activeTerm = latestTerm;
  }
  const currentAcademicYear = activeTerm?.academic_year || '2024–25';

  const students = (enrollments || [])
    .filter((e: any) => e && e.students)
    .map((e: any) => ({
      id: e.students.id,
      name: e.students.name,
      admission_number: e.students.admission_number ?? '—',
      created_at: e.students.created_at,
      circular_class: e.circular_classes?.class_name ?? '—',
      circular_class_id: e.circular_classes?.id ?? null,
      section: e.circular_classes?.section ?? null,
      theology_class_arabic: e.theology_classes?.class_name_arabic ?? null,
      theology_class_english: e.theology_classes?.class_name_english ?? null,
      theology_class_id: e.theology_classes?.id ?? null,
      academic_year: e.academic_year,
      status: (e.circular_classes ? (e.circular_classes.section?.toLowerCase() === 'nursery' ? 'Nursery' : 'Primary') : 'Theology') as 'Nursery' | 'Primary' | 'Theology',
      is_theology_enrolled: !!e.theology_classes,
      gender: e.students.gender,
      is_archived: e.students.is_archived ?? false,
      is_muslim: e.students.is_muslim ?? false,
      arabic_name: e.students.arabic_name ?? null,
    }))

  const activeStudentsCount = students.filter((s: any) => !s.is_archived).length;
  const canWriteStudents = hasPermission(authRes, 'write_students');

  return (
    <div className="w-full max-w-full text-stone-900 dark:text-[#E3E3E3] font-sans pb-6 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 space-y-4">
        {/* Collapsible Student Registration Drawer — only shown to roles with write_students permission */}
        {canWriteStudents && (
        <details className="group bg-white dark:bg-[#1E1F20] border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-2xl shadow-2xs overflow-hidden">
          <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-3 bg-[#FAF7F2] dark:bg-[#282A2C]/60 hover:bg-stone-100/70 dark:hover:bg-[#282A2C] transition-colors select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#059669] text-white flex items-center justify-center shrink-0">
                <UserPlus size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                  Register New Student
                </span>
                <span className="hidden sm:inline text-xs text-stone-500 dark:text-stone-400 ml-2">
                  Click to open the admission &amp; dual-curriculum placement wizard
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1F20] border border-stone-200 dark:border-stone-700 text-xs font-bold text-[#059669] dark:text-[#34D399] shrink-0">
              <span className="group-open:hidden">+ New Admission</span>
              <span className="hidden group-open:inline">Hide Form</span>
              <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>

          <div className="p-3 sm:p-5 border-t border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 bg-[#F8FAFC] dark:bg-[#131314]">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <StudentRegistrationContainer />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-4">
                <MetricCard total={activeStudentsCount} />
                <RegistrationTips />
              </div>
            </div>
          </div>
        </details>
        )}

        {/* Students Directory Table & Live Active vs Archived Metric Counters */}
        <section>
          <StudentsListClient
            students={students}
            department={authRes.filterByDepartment}
            currentAcademicYear={String(currentAcademicYear)}
          />
        </section>
      </div>
    </div>
  )
}
