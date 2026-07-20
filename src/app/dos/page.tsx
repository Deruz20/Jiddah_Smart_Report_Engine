import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import TeachersClient from '@/components/layout/teachers-client'
import { StudentsListClient } from '@/components/StudentsListClient'
import { BookOpen, UserCheck, Users, Calendar } from 'lucide-react'

export const dynamic = "force-dynamic";

export default async function DOSDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch DOS profile
  const { data: dosProfile } = await supabase
    .from('teachers')
    .select('role, subject')
    .eq('email', user?.email)
    .single()

  const isTheology = dosProfile?.subject?.toLowerCase().includes('theology') || 
                     dosProfile?.role?.toLowerCase().includes('theology');

  // Query teachers
  let teacherQuery = supabase.from('teachers').select('*').order('name', { ascending: true })
  
  if (isTheology) {
    teacherQuery = teacherQuery.ilike('role', '%Theology%')
  } else {
    teacherQuery = teacherQuery.not('role', 'ilike', '%Theology%')
  }

  const { data: teachers } = await teacherQuery

  const formattedTeachers = (teachers || []).map((t: any) => ({
    id: t.id,
    name: t.name || '',
    role: t.role || '',
    subject: t.subject || '',
    classes: typeof t.classes === 'string' ? t.classes.split(',').map((c: string) => c.trim()).filter(Boolean) : (t.classes || []),
    email: t.email || '',
    phone: t.phone || '',
    status: t.status || 'active',
    joined: t.created_at || ''
  }))

  // Query enrollments
  let enrollmentsQuery = supabase
    .from('enrollments')
    .select(`
      academic_year,
      is_active,
      circular_classes ( id, class_name, section ),
      theology_classes ( id, class_name_arabic, class_name_english ),
      students ( id, name, admission_number, created_at, gender, is_archived, is_muslim, arabic_name )
    `)
    .eq('is_active', true)
    .order('academic_year', { ascending: false })

  // Note: we fetch all students but could filter by section if needed
  // For a DOS, they might oversee all students in their department. 
  // For Theology DOS, we filter students who have theology classes
  if (isTheology) {
    enrollmentsQuery = enrollmentsQuery.not('theology_class', 'is', null)
  }

  const { data: enrollments } = await enrollmentsQuery

  const students = (enrollments || []).map((e: any) => ({
    id: e.students?.id,
    name: e.students?.name,
    admission_number: e.students?.admission_number ?? '—',
    created_at: e.students?.created_at,
    circular_class: e.circular_classes?.class_name ?? '—',
    circular_class_id: e.circular_classes?.id ?? null,
    section: e.circular_classes?.section ?? null,
    theology_class_arabic: e.theology_classes?.class_name_arabic ?? null,
    theology_class_english: e.theology_classes?.class_name_english ?? null,
    theology_class_id: e.theology_classes?.id ?? null,
    academic_year: e.academic_year,
    status: (e.theology_classes ? 'Theology' : (e.circular_classes?.section?.toLowerCase() === 'nursery' ? 'Nursery' : 'Primary')) as 'Nursery' | 'Primary' | 'Theology',
    gender: e.students?.gender,
    is_archived: e.students?.is_archived ?? false,
    is_muslim: e.students?.is_muslim ?? false,
    arabic_name: e.students?.arabic_name ?? null,
  }))

  const heroStats = [
    { label: 'Department Teachers', value: formattedTeachers.length, icon: UserCheck, color: 'emerald' },
    { label: 'Enrolled Students', value: students.length, icon: Users, color: 'orange' },
    { label: 'Academic Year', value: '2024–25', icon: Calendar, color: 'slate' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-900 pb-16 relative overflow-x-hidden">
      {/* Ambient mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-200/30 blur-[120px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-orange-100/40 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-slate-200/50 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* ─── Hero Header ─── */}
        <header className="mb-10 animate-fade-in-up">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <BookOpen size={20} className="text-white" />
                </div>
                <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">Director of Studies</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-none">
                Department{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">
                  Overview
                </span>
              </h1>
              <p className="mt-3 text-slate-500 max-w-lg">
                Manage {isTheology ? 'Theology' : 'Secular'} department teachers, students, and reports.
              </p>
            </div>
          </div>

          {/* Mini stat strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                    stat.color === 'orange' ? 'bg-orange-100 text-orange-500' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">{stat.label}</p>
                    <p className="text-lg font-black text-slate-800 leading-none">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {/* ─── Main Content ─── */}
        <main className="space-y-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Department Teachers</h2>
            <div className="bg-white/80 backdrop-blur border border-white/60 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/40 min-h-[400px]">
              <TeachersClient 
                initialTeachers={formattedTeachers} 
                currentUserRole={dosProfile?.role || 'DOS'} 
                currentUserSubject={dosProfile?.subject || ''} 
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Department Students</h2>
            <div className="bg-white/80 backdrop-blur border border-white/60 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40">
              <StudentsListClient students={students} />
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
