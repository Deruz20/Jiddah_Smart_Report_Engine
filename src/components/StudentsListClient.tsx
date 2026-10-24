'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, ChevronsUpDown, UserX, Edit2, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from './figma-ui/Badge';
import { EditStudentModal } from './EditStudentModal';
import { useRouter } from 'next/navigation';
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
}

export function StudentsListClient({ students, department }: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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

  const handleArchive = async (student: Student) => {
    if (!confirm(`Are you sure you want to archive ${student.name}?`)) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive student');
      toast.success(`${student.name} has been archived`);
      router.refresh();
    } catch {
      toast.error('Failed to archive student');
    }
  };

  const handleHardDelete = async (student: Student) => {
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${student.name}? This will erase all their marks and enrollments. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/students/${student.id}?hard_delete=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student permanently');
      toast.success(`${student.name} has been permanently deleted`);
      router.refresh();
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleRestore = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: false })
      });
      if (!res.ok) throw new Error('Failed to restore student');
      toast.success(`${student.name} has been restored`);
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

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-stone-200/90 overflow-hidden flex flex-col w-full min-w-0">

      {/* Filter tabs */}
      <div className="px-3 sm:px-4 pt-2.5 pb-0 border-b border-stone-200/80">
        <div className="flex items-center gap-1 overflow-x-auto pb-0 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === tab
                  ? 'text-[#059669] border-[#059669] bg-emerald-50/50'
                  : 'text-stone-500 border-transparent hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              {tab}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                activeTab === tab ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
              }`}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
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
          <button 
            type="button"
            onClick={() => toast.info('Use the tabs above to filter by department/status')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-all flex-1 sm:flex-none justify-center cursor-pointer"
          >
            <Filter size={13} className="text-stone-400" />
            Filters
          </button>
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
                  <div className="inline-flex items-center justify-end gap-1">
                    <button 
                      type="button"
                      onClick={() => setEditingStudent(student)}
                      className="text-stone-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                      title="Edit Student"
                    >
                      <Edit2 size={14} />
                    </button>
                    {student.is_archived ? (
                      <button 
                        type="button"
                        onClick={() => handleRestore(student)}
                        className="text-stone-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                        title="Restore Student"
                      >
                        <RotateCcw size={14} />
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => handleArchive(student)}
                        className="text-stone-400 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                        title="Archive Student"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => handleHardDelete(student)}
                      className="text-stone-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Permanently Delete Student"
                    >
                      <Trash2 size={14} />
                    </button>
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
    </div>
  );
}
