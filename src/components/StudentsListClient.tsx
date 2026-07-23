'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Filter, MoreHorizontal, Download, ChevronDown, ChevronUp, ChevronsUpDown, UserX, Edit2, Archive, RotateCcw, Trash2 } from 'lucide-react';
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

const PAGE_SIZE = 8;

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ChevronsUpDown size={13} className="text-slate-300 ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-emerald-500 ml-1" />
    : <ChevronDown size={13} className="text-emerald-500 ml-1" />;
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
        counts[s.status] = (counts[s.status] || 0) + 1;
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
      if (activeTab !== 'All') list = list.filter((s) => s.status === activeTab);
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      toast.error('Failed to restore student');
    }
  };

  const ThCell = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      scope="col"
      className="px-5 py-3.5 text-left cursor-pointer select-none group"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
        {label}
        <SortIcon column={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">

      {/* Filter tabs */}
      <div className="px-5 pt-4 pb-0 border-b border-slate-100">
        <div className="flex items-center gap-1 overflow-x-auto pb-0 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab
                  ? 'text-emerald-700 border-emerald-500 bg-emerald-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + actions bar */}
      <div className="px-5 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/40 border-b border-slate-100">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, class, or ID…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex-1 sm:flex-none justify-center">
            <Filter size={14} className="text-slate-400" />
            Filters
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex-1 sm:flex-none justify-center">
            <Download size={14} className="text-slate-400" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-white">
            <tr>
              <ThCell label="Student" col="name" />
              <ThCell label="Admission No." col="admission_number" />
              <ThCell label="Class / Section" col="circular_class" />
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Academic Year
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="relative px-5 py-3.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {paginated.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-slate-50/70 transition-colors group relative"
              >
                {/* Left accent bar on hover */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 flex-shrink-0 rounded-2xl bg-gradient-to-br ${avatarColors(student.name)} flex items-center justify-center font-bold shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] text-sm border border-white/50`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 tracking-tight">{student.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-medium">
                        {student.gender && (
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold ${
                            student.gender.toLowerCase() === 'female' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {student.gender.toLowerCase() === 'female' ? '♀ Female' : '♂ Male'}
                          </span>
                        )}
                        <span>
                          Joined {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <code className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/60 shadow-sm">
                    {student.admission_number}
                  </code>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {department !== 'theology' && (
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      {student.circular_class}
                      {student.section && (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                          {student.section}
                        </span>
                      )}
                    </div>
                  )}
                  {department !== 'secular' && (student.theology_class_english || student.theology_class_arabic) && (
                    <div className="text-[11px] font-semibold text-amber-600 bg-amber-50 inline-flex px-1.5 py-0.5 rounded mt-1 border border-amber-100">
                      {student.theology_class_english || student.theology_class_arabic}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                    {student.academic_year}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    <Badge
                      variant={
                        student.status === 'Primary' ? 'emerald' :
                        student.status === 'Theology' ? 'orange' : 'blue'
                      }
                    >
                      {student.status}
                    </Badge>
                    {student.is_theology_enrolled && student.status !== 'Theology' && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-orange-100">
                        + Theology
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingStudent(student)}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                    title="Edit Student"
                  >
                    <Edit2 size={16} />
                  </button>
                  {student.is_archived ? (
                    <button 
                      onClick={() => handleRestore(student)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50"
                      title="Restore Student"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleArchive(student)}
                      className="text-slate-400 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-50"
                      title="Archive Student"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleHardDelete(student)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                    title="Permanently Delete Student"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
              <UserX size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No students found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-slate-500">
          Showing{' '}
          <span className="font-bold text-slate-800">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}</span>
          –
          <span className="font-bold text-slate-800">{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          {' '}of{' '}
          <span className="font-bold text-slate-800">{filtered.length}</span> results
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                p === page
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
