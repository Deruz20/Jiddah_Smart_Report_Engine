import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { StudentRegistrationContainer } from '@/components/students/StudentRegistrationContainer'
import { StudentsListClient } from '@/components/StudentsListClient'
import { MetricCard } from '@/components/figma-ui/MetricCard'
import { RegistrationTips } from '@/components/figma-ui/RegistrationTips'
import { GraduationCap, BookOpen, TrendingUp, Calendar, UserPlus, ChevronDown } from 'lucide-react'

import { verifyDataAccess } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'

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
    const circularIds = classIdsForType(authRes, 'circular') ?? []
    const theologyIds = classIdsForType(authRes, 'theology') ?? []
    const filters = [
      ...(circularIds.length ? [`circular_class_id.in.(${circularIds.join(',')})`] : []),
      ...(theologyIds.length ? [`theology_class_id.in.(${theologyIds.join(',')})`] : []),
    ]
    if (filters.length === 0) return <div className="p-6 text-stone-600">No assigned classes.</div>
    query = query.or(filters.join(','))
  } else if (authRes.filterByDepartment === 'secular') {
    query = query.not('circular_class_id', 'is', null);
  } else if (authRes.filterByDepartment === 'theology') {
    query = query.not('theology_class_id', 'is', null);
  }

  const { data: enrollments } = await query;

  const { data: activeTerm } = await supabase.from('terms').select('*').eq('is_current', true).single();
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

  const runningClassesCount = new Set(students.map((s: any) => s.circular_class).filter((c: any) => c && c !== '—')).size || 2;

  const heroStats = [
    { label: 'Active Students', value: students.length, icon: GraduationCap, color: 'emerald' },
    { label: 'Classes Running', value: runningClassesCount, icon: BookOpen, color: 'orange' },
    { label: 'Active Cohorts', value: `${runningClassesCount} Levels`, icon: TrendingUp, color: 'emerald' },
    { label: 'Academic Year', value: currentAcademicYear, icon: Calendar, color: 'stone' },
  ];

  return (
    <div className="w-full max-w-full text-stone-900 font-sans pb-6 relative overflow-x-hidden">
      {/* Compact Header Bar */}
      <div className="bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#059669] flex items-center justify-center shrink-0 text-white shadow-xs">
              <GraduationCap size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-stone-900 tracking-tight truncate">
                Students Directory
              </h1>
              <p className="text-xs text-stone-500 truncate">
                Manage enrollments, class rosters, and register new students.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-semibold tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              AY {currentAcademicYear}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 space-y-4">
        {/* Compact 4-pill KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white border border-stone-200/80 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    stat.color === 'emerald'
                      ? 'bg-emerald-50 text-[#059669]'
                      : stat.color === 'orange'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-stone-900 leading-none tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 truncate">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Student Registration Drawer — keeps Enrolled Students immediately visible above the fold */}
        <details className="group bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-3 bg-[#FAF7F2] hover:bg-stone-100/70 transition-colors select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#059669] text-white flex items-center justify-center shrink-0">
                <UserPlus size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900">
                  Register New Student
                </span>
                <span className="hidden sm:inline text-xs text-stone-500 ml-2">
                  Click to open the admission &amp; dual-curriculum placement wizard
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-bold text-[#059669] shrink-0">
              <span className="group-open:hidden">+ New Admission</span>
              <span className="hidden group-open:inline">Hide Form</span>
              <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>

          <div className="p-3 sm:p-5 border-t border-stone-200 bg-[#F8FAFC]">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <StudentRegistrationContainer />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-4">
                <MetricCard total={students.length} />
                <RegistrationTips />
              </div>
            </div>
          </div>
        </details>

        {/* Students Directory Table — Immediately visible above the fold */}
        <section>
          <StudentsListClient students={students} department={authRes.filterByDepartment} />
        </section>
      </div>
    </div>
  )
}
