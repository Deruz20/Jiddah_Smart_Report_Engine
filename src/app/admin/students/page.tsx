import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { CreateStudentWizard } from '@/components/CreateStudentWizard'
import { StudentsListClient } from '@/components/StudentsListClient'
import { MetricCard } from '@/components/figma-ui/MetricCard'
import { RegistrationTips } from '@/components/figma-ui/RegistrationTips'
import { GraduationCap, BookOpen, TrendingUp, Calendar } from 'lucide-react'

import { verifyDataAccess } from '@/lib/auth-server'

export default async function StudentsManagementPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  let query = supabase
    .from('enrollments')
    .select(`
      academic_year,
      is_active,
      circular_classes ( id, class_name, section ),
      theology_classes ( id, class_name_arabic, class_name_english ),
      students ( id, name, admission_number, created_at, gender, is_archived, is_muslim, arabic_name )
    `)
    .eq('is_active', true)
    .order('academic_year', { ascending: false });
    
  if (authRes.filterByDepartment === 'secular') {
    query = query.not('circular_class_id', 'is', null);
  } else if (authRes.filterByDepartment === 'theology') {
    query = query.not('theology_class_id', 'is', null);
  }

  const { data: enrollments } = await query;

  const students = (enrollments || []).map((e: any) => ({
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
    status: (e.theology_classes ? 'Theology' : (e.circular_classes?.section?.toLowerCase() === 'nursery' ? 'Nursery' : 'Primary')) as 'Nursery' | 'Primary' | 'Theology',
    gender: e.students.gender,
    is_archived: e.students.is_archived ?? false,
    is_muslim: e.students.is_muslim ?? false,
    arabic_name: e.students.arabic_name ?? null,
  }))

  const heroStats = [
    { label: 'Active Students', value: students.length, icon: GraduationCap, color: 'emerald' },
    { label: 'Classes Running', value: 7, icon: BookOpen, color: 'orange' }, // Mock for now or calculate unique classes
    { label: 'Growth YoY', value: '+18%', icon: TrendingUp, color: 'emerald' },
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
                  <GraduationCap size={20} className="text-white" />
                </div>
                <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">School Management</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-none">
                Students{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">
                  Management
                </span>
              </h1>
              <p className="mt-3 text-slate-500 max-w-lg">
                Manage enrollments, track academic progress, and register new students seamlessly.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live · Academic Year 2024–2025
              </span>
            </div>
          </div>

          {/* Mini stat strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {heroStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                    stat.color === 'orange' ? 'bg-orange-100 text-orange-500' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-800 leading-none">{stat.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {/* ─── Top Grid: Wizard + Metric + Tips ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
          {/* Wizard takes 3 cols */}
          <div className="lg:col-span-3">
            <CreateStudentWizard />
          </div>

          {/* Right column: Metric + Tips stacked */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricCard total={students.length} />
            <RegistrationTips />
          </div>
        </div>

        {/* ─── Students Table ─── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Enrolled Students</h2>
              <p className="text-sm text-slate-500 mt-0.5">{students.length} active registrations</p>
            </div>
          </div>
          <StudentsListClient students={students} department={authRes.filterByDepartment} />
        </section>

      </div>
    </div>
  )
}
