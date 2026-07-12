import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import { CreateStudentWizard } from './components/CreateStudentWizard';
import { MetricCard } from './components/MetricCard';
import { StudentsTable, type Student } from './components/StudentsTable';
import { RegistrationTips } from './components/RegistrationTips';

export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Sarah Connor',
    admission_number: 'ADM-2024-001',
    created_at: '2024-08-15T10:00:00Z',
    circular_class: 'Primary 1',
    section: 'A',
    theology_class_arabic: 'مستوى 1',
    theology_class_english: 'Level 1',
    academic_year: '2024-2025',
    status: 'Primary',
    gender: 'Female',
  },
  {
    id: '2',
    name: 'John Smith',
    admission_number: 'ADM-2024-002',
    created_at: '2024-08-16T11:30:00Z',
    circular_class: 'Nursery',
    section: 'Sun',
    theology_class_arabic: null,
    theology_class_english: null,
    academic_year: '2024-2025',
    status: 'Nursery',
    gender: 'Male',
  },
  {
    id: '3',
    name: 'Aisha Rahman',
    admission_number: 'ADM-2024-003',
    created_at: '2024-08-18T09:15:00Z',
    circular_class: 'Primary 3',
    section: 'B',
    theology_class_arabic: 'مستوى 3',
    theology_class_english: 'Level 3',
    academic_year: '2024-2025',
    status: 'Theology',
    gender: 'Female',
  },
  {
    id: '4',
    name: 'Michael Chang',
    admission_number: 'ADM-2024-004',
    created_at: '2024-08-20T14:45:00Z',
    circular_class: 'Primary 2',
    section: 'A',
    theology_class_arabic: 'مستوى 2',
    theology_class_english: 'Level 2',
    academic_year: '2024-2025',
    status: 'Primary',
    gender: 'Male',
  },
  {
    id: '5',
    name: 'Emma Watson',
    admission_number: 'ADM-2024-005',
    created_at: '2024-08-21T08:20:00Z',
    circular_class: 'Nursery',
    section: 'Moon',
    theology_class_arabic: null,
    theology_class_english: null,
    academic_year: '2024-2025',
    status: 'Nursery',
    gender: 'Female',
  },
  {
    id: '6',
    name: 'Omar Abdullah',
    admission_number: 'ADM-2024-006',
    created_at: '2024-09-02T10:00:00Z',
    circular_class: 'Primary 4',
    section: 'C',
    theology_class_arabic: 'مستوى 4',
    theology_class_english: 'Level 4',
    academic_year: '2024-2025',
    status: 'Theology',
    gender: 'Male',
  },
  {
    id: '7',
    name: 'Lena Müller',
    admission_number: 'ADM-2024-007',
    created_at: '2024-09-03T13:00:00Z',
    circular_class: 'Primary 1',
    section: 'B',
    theology_class_arabic: null,
    theology_class_english: 'Level 1',
    academic_year: '2024-2025',
    status: 'Primary',
    gender: 'Female',
  },
  {
    id: '8',
    name: 'Yusuf Al-Farsi',
    admission_number: 'ADM-2024-008',
    created_at: '2024-09-05T09:30:00Z',
    circular_class: 'Primary 5',
    section: 'A',
    theology_class_arabic: 'مستوى 5',
    theology_class_english: 'Level 5',
    academic_year: '2024-2025',
    status: 'Theology',
    gender: 'Male',
  },
  {
    id: '9',
    name: 'Chloe Bernard',
    admission_number: 'ADM-2024-009',
    created_at: '2024-09-10T15:00:00Z',
    circular_class: 'Nursery',
    section: 'Stars',
    theology_class_arabic: null,
    theology_class_english: null,
    academic_year: '2024-2025',
    status: 'Nursery',
    gender: 'Female',
  },
  {
    id: '10',
    name: 'Daniel Osei',
    admission_number: 'ADM-2024-010',
    created_at: '2024-09-12T11:00:00Z',
    circular_class: 'Primary 2',
    section: 'B',
    theology_class_arabic: 'مستوى 2',
    theology_class_english: 'Level 2',
    academic_year: '2024-2025',
    status: 'Primary',
    gender: 'Male',
  },
  {
    id: '11',
    name: 'Fatima Nour',
    admission_number: 'ADM-2024-011',
    created_at: '2024-09-15T08:00:00Z',
    circular_class: 'Primary 3',
    section: 'A',
    theology_class_arabic: 'مستوى 3',
    theology_class_english: 'Level 3',
    academic_year: '2024-2025',
    status: 'Theology',
    gender: 'Female',
  },
  {
    id: '12',
    name: 'Lucas Petit',
    admission_number: 'ADM-2024-012',
    created_at: '2024-09-18T14:30:00Z',
    circular_class: 'Nursery',
    section: 'Sun',
    theology_class_arabic: null,
    theology_class_english: null,
    academic_year: '2024-2025',
    status: 'Nursery',
    gender: 'Male',
  },
];

const heroStats = [
  { label: 'Active Students', value: mockStudents.length, icon: GraduationCap, color: 'emerald' },
  { label: 'Classes Running', value: 7, icon: BookOpen, color: 'orange' },
  { label: 'Growth YoY', value: '+18%', icon: TrendingUp, color: 'emerald' },
  { label: 'Academic Year', value: '2024–25', icon: Calendar, color: 'slate' },
];

export default function App() {
  const [students, setStudents] = useState<Student[]>(mockStudents);

  const handleAddStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
  };

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
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mb-10"
        >
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
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
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
                </motion.div>
              );
            })}
          </div>
        </motion.header>

        {/* ─── Top Grid: Wizard + Metric + Tips ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10"
        >
          {/* Wizard takes 3 cols */}
          <div className="lg:col-span-3">
            <CreateStudentWizard onAdd={handleAddStudent} nextId={students.length + 1} />
          </div>

          {/* Right column: Metric + Tips stacked */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricCard total={students.length} />
            <RegistrationTips />
          </div>
        </motion.div>

        {/* ─── Students Table ─── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Enrolled Students</h2>
              <p className="text-sm text-slate-500 mt-0.5">{students.length} active registrations</p>
            </div>
          </div>
          <StudentsTable students={students} />
        </motion.section>

      </div>
    </div>
  );
}
