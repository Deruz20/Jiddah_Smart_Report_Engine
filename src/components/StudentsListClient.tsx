'use client';

import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, ChevronsUpDown, UserX, Edit2, Archive, RotateCcw, Trash2, User, FileText, ArrowRightLeft, GraduationCap, BookOpen, Calendar } from 'lucide-react';
import { MoreActionsMenu } from '@/components/ui/more-actions-menu';
import { CustomPillSelect } from '@/components/ui/custom-pill-select';
import { Badge } from './figma-ui/Badge';
import { EditStudentModal } from './EditStudentModal';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export type Student = {
  id: string;
  name: string;
  admission_number: string;
  created_at: string;
  circular_class: string;
  circular_class_id?: string | null;
  section: string | null;
  theology_class_arabic: string | null;
  theology_class_english: string | null;
  theology_class_id?: string | null;
  academic_year: string;
  status: 'Nursery' | 'Primary' | 'Theology';
  is_theology_enrolled?: boolean;
  gender?: string | null;
  is_archived?: boolean;
  is_muslim?: boolean;
};

type SortKey = 'name' | 'admission_number' | 'created_at' | 'circular_class';
type SortDir = 'asc' | 'desc';
type FilterTab = 'All' | 'Primary' | 'Nursery' | 'Theology' | 'Archived';

const PAGE_SIZE = 10;

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ChevronsUpDown size={13} className="text-stone-300 ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-[#059669] ml-1" />
    : <ChevronDown size={13} className="text-[#059669] ml-1" />;
}

function avatarColors(name: string) {
  const palettes = [
    'from-emerald-100 to-emerald-200 text-emerald-700',
    'from-orange-100 to-orange-200 text-orange-700',
    'from-blue-100 to-blue-200 text-blue-700',
    'from-violet-100 to-violet-200 text-violet-700',
    'from-rose-100 to-rose-200 text-rose-700',
    'from-amber-100 to-amber-200 text-amber-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

interface StudentsTableProps {
  students: Student[];
  department?: string;
  currentAcademicYear?: string;
}

export function StudentsListClient({ students: initialStudents, department, currentAcademicYear = '2026' }: StudentsTableProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    const q = searchParams?.get('search');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
      setPage(1);
    }
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [destructiveDialog, setDestructiveDialog] = useState<{
    open: boolean;
    student: Student | null;
    mode: 'archive' | 'delete';
  }>({ open: false, student: null, mode: 'archive' });
  const router = useRouter();

  const tabs: FilterTab[] = useMemo(() => {
    if (department === 'secular') return ['All', 'Primary', 'Nursery', 'Archived'];
    if (department === 'theology') return ['All', 'Theology', 'Archived'];
    return ['All', 'Primary', 'Nursery', 'Theology', 'Archived'];
  }, [department]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { All: 0, Primary: 0, Nursery: 0, Theology: 0, Archived: 0 };
    students.forEach((s) => {
      if (s.is_archived) {
        counts.Archived++;
      } else {
        counts.All++;
        if (s.status === 'Primary') counts.Primary++;
        if (s.status === 'Nursery') counts.Nursery++;
        if (s.status === 'Theology' || s.is_theology_enrolled) counts.Theology++;
      }
    });
    return counts;
  }, [students]);

  const classFilterOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.circular_class) set.add(s.circular_class);
    });
    const sorted = Array.from(set).sort();
    return [
      { value: 'all', label: 'All Classes' },
      ...sorted.map((c) => ({ value: c, label: c })),
    ];
  }, [students]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = students;
    if (activeTab === 'Archived') {
      list = list.filter((s) => s.is_archived);
    } else {
      list = list.filter((s) => !s.is_archived);
      if (activeTab !== 'All') {
        if (activeTab === 'Theology') {
          list = list.filter((s) => s.is_theology_enrolled || s.status === 'Theology');
        } else {
          list = list.filter((s) => s.status === activeTab);
        }
      }
    }

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q) ||
          s.circular_class.toLowerCase().includes(q)
      );
    }

    if (selectedClassFilter !== 'all') {
      list = list.filter((s) => s.circular_class === selectedClassFilter);
    }
    list = [...list].sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (sortDir === 'desc') [va, vb] = [vb, va];
      return String(va).localeCompare(String(vb));
    });
    return list;
  }, [students, activeTab, deferredSearchTerm, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const executeArchive = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive student');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_archived: true } : s))
      );
      setDestructiveDialog({ open: false, student: null, mode: 'archive' });
      toast.success(`${student.name} has been archived`);
      router.refresh();
    } catch {
      toast.error('Failed to archive student');
    }
  };

  const executeHardDelete = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}?hard_delete=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student permanently');
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setDestructiveDialog({ open: false, student: null, mode: 'delete' });
      toast.success(`${student.name} has been permanently deleted`);
      router.refresh();
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleArchive = (student: Student) => {
    setDestructiveDialog({ open: true, student, mode: 'archive' });
  };

  const handleHardDelete = (student: Student) => {
    setDestructiveDialog({ open: true, student, mode: 'delete' });
  };

  const handleRestore = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: false })
      });
      if (!res.ok) throw new Error('Failed to restore student');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_archived: false } : s))
      );
      toast.success(`${student.name} has been restored to the active roster`);
      router.refresh();
    } catch {
      toast.error('Failed to restore student');
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Admission Number,Class,Theology Class,Academic Year,Status\n"
      + filtered.map(s => `"${s.name}","${s.admission_number}","${s.circular_class || ''}","${s.theology_class_english || s.theology_class_arabic || ''}","${s.academic_year}","${s.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported students successfully');
  };

  const ThCell = ({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) => (
    <th
      scope="col"
      className={`px-3 py-2.5 text-left cursor-pointer select-none group ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center text-[11px] font-bold text-stone-500 uppercase tracking-wider group-hover:text-stone-800 transition-colors">
        {label}
        <SortIcon column={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  const runningClassesCount = useMemo(
    () =>
      new Set(
        students
          .filter((s) => !s.is_archived)
          .map((s) =>
            s.circular_class && s.circular_class !== '—'
              ? s.circular_class
              : s.theology_class_english || s.theology_class_arabic
          )
          .filter(Boolean)
      ).size,
    [students]
  );

  return (
    <div className="space-y-4">
      {/* Live-updating 4-pill KPI strip: Active Students vs Archived Students */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" data-testid="students-kpi-strip">
        <button
          type="button"
          data-testid="metric-active-students"
          onClick={() => {
            setActiveTab('All');
            setPage(1);
          }}
          className={`bg-white dark:bg-[#1E1F20] border rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs text-left transition cursor-pointer ${
            activeTab !== 'Archived'
              ? 'border-[#059669]/40 ring-1 ring-[#059669]/20'
              : 'border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 hover:border-[#059669]/30'
          }`}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-[#059669] dark:text-[#34D399]">
            <GraduationCap size={14} />
          </div>
          <div className="min-w-0">
            <div
              data-testid="metric-active-students-value"
              className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white leading-none tabular-nums"
            >
              {tabCounts.All}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              Active Students
            </div>
          </div>
        </button>

        <button
          type="button"
          data-testid="metric-archived-students"
          onClick={() => {
            setActiveTab(activeTab === 'Archived' ? 'All' : 'Archived');
            setPage(1);
          }}
          className={`bg-white dark:bg-[#1E1F20] border rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs text-left transition cursor-pointer ${
            activeTab === 'Archived'
              ? 'border-amber-500/50 ring-1 ring-amber-500/25 bg-amber-50/20'
              : 'border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 hover:border-amber-400/40'
          }`}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Archive size={14} />
          </div>
          <div className="min-w-0">
            <div
              data-testid="metric-archived-students-value"
              className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white leading-none tabular-nums"
            >
              {tabCounts.Archived}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              Archived Students
            </div>
          </div>
        </button>

        <div className="bg-white dark:bg-[#1E1F20] border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-[#059669] dark:text-[#34D399]">
            <BookOpen size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white leading-none tabular-nums">
              {runningClassesCount}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              Active Classes Running
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F20] border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-stone-100 dark:bg-[#282A2C] text-stone-600 dark:text-stone-300">
            <Calendar size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white leading-none tabular-nums">
              {currentAcademicYear}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              Academic Year
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/90 overflow-hidden flex flex-col w-full min-w-0">

        {/* Filter tabs + explicit Active/Archived quick toggle */}
        <div className="px-3 sm:px-4 pt-2.5 pb-0 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0 hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                data-testid={`students-tab-${tab.toLowerCase()}`}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? 'text-[#059669] border-[#059669] bg-emerald-50/50'
                    : 'text-stone-500 border-transparent hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                {tab === 'All' ? 'Active Roster' : tab}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                  activeTab === tab ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                }`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="toggle-archived-view-btn"
            onClick={() => {
              setActiveTab(activeTab === 'Archived' ? 'All' : 'Archived');
              setPage(1);
            }}
            className={`mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
              activeTab === 'Archived'
                ? 'bg-emerald-50 border-emerald-200 text-[#059669] hover:bg-emerald-100'
                : 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {activeTab === 'Archived' ? (
              <>
                <RotateCcw size={12} />
                <span>Back to Active Roster ({tabCounts.All})</span>
              </>
            ) : (
              <>
                <Archive size={12} />
                <span>View Archived ({tabCounts.Archived})</span>
              </>
            )}
          </button>
        </div>

      {/* Search + actions bar */}
      <div className="px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-2 bg-[#F8FAFC] border-b border-stone-200/80">
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, class, or ID…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="block w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#059669] text-xs transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <CustomPillSelect
            id="students-class-filter"
            ariaLabel="Class filter"
            value={selectedClassFilter}
            onChange={(val) => {
              setSelectedClassFilter(val);
              setPage(1);
            }}
            options={classFilterOptions}
            className="h-8.5 text-xs rounded-xl"
          />
          <button 
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-all flex-1 sm:flex-none justify-center cursor-pointer"
          >
            <Download size={13} className="text-stone-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Keep the full row accessible on narrow screens instead of clipping action columns. */}
      <div
        role="region"
        aria-label="Students list"
        tabIndex={0}
        className="w-full min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
      >
        <table className="w-full min-w-[560px] divide-y divide-stone-100 table-auto md:min-w-[720px] lg:min-w-0">
          <thead className="bg-white">
            <tr>
              <ThCell label="Student" col="name" />
              <ThCell label="Adm No." col="admission_number" className="hidden sm:table-cell" />
              <ThCell label="Class / Section" col="circular_class" />
              <th scope="col" className="hidden lg:table-cell px-3 py-2.5 text-left text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Year
              </th>
              <th scope="col" className="hidden md:table-cell px-3 py-2.5 text-left text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="relative px-3 py-2.5 text-right w-24">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-100">
            {paginated.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-stone-50/70 transition-colors group relative"
              >
                <td className="px-3 py-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br ${avatarColors(student.name)} flex items-center justify-center font-bold text-xs border border-white/50`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-stone-900 truncate">{student.name}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500 mt-0.5 font-medium">
                        <span className="sm:hidden font-mono font-bold text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded">
                          {student.admission_number}
                        </span>
                        {student.gender && (
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-bold ${
                            student.gender.toLowerCase() === 'female' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {student.gender.toLowerCase() === 'female' ? '♀ F' : '♂ M'}
                          </span>
                        )}
                        <span className="hidden sm:inline text-stone-400">
                          Joined {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 py-2.5 whitespace-nowrap">
                  <code className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100/80 px-2 py-0.5 rounded-md border border-stone-200/60 tabular-nums">
                    {student.admission_number}
                  </code>
                </td>
                <td className="px-3 py-2.5">
                  {department !== 'theology' && (
                    <div className="text-xs font-bold text-stone-800 flex flex-wrap items-center gap-1">
                      <span>{student.circular_class}</span>
                      {student.section && (
                        <span className="hidden sm:inline text-[9px] uppercase tracking-wider font-bold text-stone-500 bg-stone-50 border border-stone-200 px-1.5 py-0.2 rounded">
                          {student.section}
                        </span>
                      )}
                    </div>
                  )}
                  {department !== 'secular' && (student.theology_class_english || student.theology_class_arabic) && (
                    <div className="text-[10px] font-semibold text-amber-800 bg-amber-50 inline-flex px-1.5 py-0.2 rounded mt-0.5 border border-amber-200/70">
                      {student.theology_class_english || student.theology_class_arabic}
                    </div>
                  )}
                </td>
                <td className="hidden lg:table-cell px-3 py-2.5 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md tabular-nums">
                    {student.academic_year}
                  </span>
                </td>
                <td className="hidden md:table-cell px-3 py-2.5 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-0.5">
                    <Badge
                      variant={
                        student.status === 'Primary' ? 'emerald' :
                        student.status === 'Theology' ? 'orange' : 'blue'
                      }
                    >
                      {student.status}
                    </Badge>
                    {student.is_theology_enrolled && student.status !== 'Theology' && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded uppercase tracking-wider border border-amber-200">
                        + Theology
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 sm:px-3 py-2.5 whitespace-nowrap text-right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    {student.is_archived && (
                      <button
                        type="button"
                        data-testid={`restore-student-btn-${student.id}`}
                        onClick={() => handleRestore(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#059669] hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Restore</span>
                      </button>
                    )}
                    <MoreActionsMenu
                      items={[
                        {
                          label: 'View Profile',
                          icon: User,
                          onClick: () => setEditingStudent(student),
                        },
                        {
                          label: 'Edit Details',
                          icon: Edit2,
                          onClick: () => setEditingStudent(student),
                        },
                        {
                          label: 'Print Report Card',
                          icon: FileText,
                          onClick: () => {
                            window.location.href = `/admin/reports?student=${student.id}`;
                          },
                        },
                        {
                          label: 'Transfer Class',
                          icon: ArrowRightLeft,
                          onClick: () => setEditingStudent(student),
                        },
                        {
                          label: student.is_archived ? 'Restore Student' : 'Archive Student',
                          icon: student.is_archived ? RotateCcw : Archive,
                          onClick: () => (student.is_archived ? handleRestore(student) : handleArchive(student)),
                        },
                        {
                          label: 'Remove',
                          icon: Trash2,
                          destructive: true,
                          onClick: () => handleHardDelete(student),
                        },
                      ]}
                      align="end"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-11 h-11 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center mb-3 text-stone-400">
              <UserX size={20} />
            </div>
            <h3 className="text-xs font-bold text-stone-800">No students found</h3>
            <p className="text-xs text-stone-500 mt-0.5">Try adjusting your search or filter.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-3 sm:px-4 py-2.5 border-t border-stone-200/80 bg-[#F8FAFC] flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-stone-500 tabular-nums">
          Showing{' '}
          <span className="font-bold text-stone-800">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}</span>
          –
          <span className="font-bold text-stone-800">{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          {' '}of{' '}
          <span className="font-bold text-stone-800">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2.5 py-1 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-7 h-7 text-xs font-bold rounded-lg transition-all cursor-pointer tabular-nums ${
                p === page
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2.5 py-1 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      <EditStudentModal 
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSaved={() => router.refresh()}
      />

      <ConfirmDestructiveDialog
        open={destructiveDialog.open}
        onOpenChange={(open) => setDestructiveDialog((prev) => ({ ...prev, open }))}
        title={
          destructiveDialog.mode === 'delete'
            ? `Permanently Delete ${destructiveDialog.student?.name || 'Pupil'}`
            : `Archive ${destructiveDialog.student?.name || 'Pupil'}`
        }
        description={
          destructiveDialog.mode === 'delete'
            ? 'This action cannot be undone. All marks, enrollments, and academic history for this pupil will be permanently erased.'
            : 'Archiving removes this learner from active class rosters and roll call while safely preserving historical records.'
        }
        confirmPhrase={destructiveDialog.mode === 'delete' ? 'DELETE' : 'ARCHIVE'}
        confirmButtonText={destructiveDialog.mode === 'delete' ? 'Permanently Delete' : 'Archive Pupil'}
        onConfirm={async () => {
          if (!destructiveDialog.student) return;
          if (destructiveDialog.mode === 'delete') {
            await executeHardDelete(destructiveDialog.student);
          } else {
            await executeArchive(destructiveDialog.student);
          }
        }}
      />
      </div>
    </div>
  );
}
