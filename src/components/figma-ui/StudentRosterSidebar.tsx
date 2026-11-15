'use client';

import React, { useState, useMemo } from 'react';
import { Search, Check, Users, Sparkles, AlertCircle } from 'lucide-react';
import type { EnrollmentItem, ReportData } from './types';
import type { StudentCompletionStatus, StudentCompletionFilter } from '@/lib/report-selection';

interface StudentRosterSidebarProps {
  enrollments: EnrollmentItem[];
  selectedIds: string[];
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSetSelectedIds?: (ids: string[]) => void;
  activeReportId: string | null;
  onSelectStudent: (enrollmentId: string) => void;
  completionByEnrollment?: Record<string, StudentCompletionStatus>;
  reports?: ReportData[];
  className?: string;
}

export function StudentRosterSidebar({
  enrollments,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onSetSelectedIds,
  activeReportId,
  onSelectStudent,
  completionByEnrollment = {},
  reports = [],
  className = '',
}: StudentRosterSidebarProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentCompletionFilter>('all');

  // Map report divisions/grades by student enrollment ID
  const reportMap = useMemo(() => {
    const map: Record<string, { division: string | null; total: number | null }> = {};
    for (const r of reports) {
      map[r.id] = {
        division: r.circular?.division || r.theology?.division || null,
        total: r.circular?.total ?? r.theology?.total ?? null,
      };
    }
    return map;
  }, [reports]);

  // Helper to determine if an enrollment is ready with marks
  const isStudentReady = React.useCallback((enrollmentId: string) => {
    const rep = reportMap[enrollmentId];
    if (rep?.division || (typeof rep?.total === 'number' && rep.total > 0)) return true;
    return completionByEnrollment[enrollmentId] === 'complete';
  }, [reportMap, completionByEnrollment]);

  // Filter visible students by search and completion status
  const visibleStudents = useMemo(() => {
    let list = enrollments;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.admission_number && e.admission_number.toLowerCase().includes(q))
      );
    }

    if (statusFilter === 'complete') {
      list = list.filter((e) => isStudentReady(e.enrollment_id));
    } else if (statusFilter === 'incomplete') {
      list = list.filter((e) => !isStudentReady(e.enrollment_id));
    }

    return list;
  }, [enrollments, search, statusFilter, isStudentReady]);

  const readyCount = useMemo(() => {
    return enrollments.filter((e) => isStudentReady(e.enrollment_id)).length;
  }, [enrollments, isStudentReady]);

  const incompleteCount = useMemo(() => {
    return enrollments.filter((e) => !isStudentReady(e.enrollment_id)).length;
  }, [enrollments, isStudentReady]);

  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((e) => selectedIds.includes(e.enrollment_id));

  return (
    <aside
      data-testid="student-roster-sidebar"
      className={`bg-white dark:bg-[#151D1A] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex flex-col overflow-hidden shadow-2xs ${className}`}
    >
      {/* Top Header Strip with Emerald/Gold Tint */}
      <div className="p-3 border-b border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 bg-gradient-to-r from-emerald-50/60 to-amber-50/40 dark:from-emerald-950/20 dark:to-amber-950/15 shrink-0 flex flex-col gap-2">
        {/* Instant Search Bar */}
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-full bg-white dark:bg-[#1E2623] border border-black/[0.08] dark:border-white/[0.08] shadow-2xs">
          <Search size={13} className="text-[#0D5C3A] dark:text-[#34D399] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${enrollments.length} students...`}
            size={1}
            className="w-full min-w-0 bg-transparent text-xs text-[#111827] dark:text-[#F3F7F5] placeholder-[#9CA3AF] outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips & Select All Toggle */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0D5C3A] text-white shadow-2xs'
                  : 'bg-white/80 dark:bg-black/20 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              All ({enrollments.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('complete')}
              className={`px-2 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                statusFilter === 'complete'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white/80 dark:bg-black/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Ready ({readyCount})
            </button>
            {incompleteCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('incomplete')}
                className={`px-2 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                  statusFilter === 'incomplete'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white/80 dark:bg-black/20 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                Incomplete ({incompleteCount})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={allVisibleSelected ? onClearAll : onSelectAll}
              className="text-[10.5px] font-bold text-[#0D5C3A] dark:text-[#34D399] hover:underline cursor-pointer shrink-0"
            >
              {allVisibleSelected ? 'Clear' : `Select All (${enrollments.length})`}
            </button>
            <span className="text-stone-300 dark:text-stone-600">•</span>
            <button
              type="button"
              onClick={() => {
                const inverted = enrollments
                  .map((e) => e.enrollment_id)
                  .filter((id) => !selectedIds.includes(id));
                if (onSetSelectedIds) {
                  onSetSelectedIds(inverted);
                } else {
                  for (const e of enrollments) {
                    onToggleSelect(e.enrollment_id, false);
                  }
                }
              }}
              className="text-[10.5px] font-semibold text-stone-600 dark:text-stone-300 hover:underline cursor-pointer shrink-0"
              title="Invert Selection"
            >
              Invert Selection
            </button>
            <span className="text-stone-300 dark:text-stone-600">•</span>
            <button
              type="button"
              onClick={() => {
                const readyIds = enrollments
                  .filter((e) => isStudentReady(e.enrollment_id))
                  .map((e) => e.enrollment_id);
                if (onSetSelectedIds) {
                  onSetSelectedIds(readyIds);
                }
              }}
              className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
              title="Select Ready Only"
            >
              Ready Only
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Student List */}
      <div
        data-testid="student-roster-list"
        className="flex-1 overflow-y-auto divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07]"
        style={{ scrollbarWidth: 'thin' }}
      >
        {visibleStudents.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
            No students match filter.
          </div>
        ) : (
          visibleStudents.map((student) => {
            const isSelected = selectedIds.includes(student.enrollment_id);
            const isActive = activeReportId === student.enrollment_id;
            const completion = completionByEnrollment[student.enrollment_id];
            const rep = reportMap[student.enrollment_id];

            return (
              <div
                key={student.enrollment_id}
                data-student-id={student.enrollment_id}
                onClick={() => onSelectStudent(student.enrollment_id)}
                className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-3 border-[#0D5C3A] dark:border-[#10B981]'
                    : 'hover:bg-stone-50 dark:hover:bg-[#1E2623]/60'
                }`}
              >
                {/* Left: Checkbox + Avatar + Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const nativeEvent = e.nativeEvent as MouseEvent;
                      onToggleSelect(student.enrollment_id, nativeEvent.shiftKey);
                    }}
                    className="w-3.5 h-3.5 rounded text-[#0D5C3A] focus:ring-[#0D5C3A] dark:focus:ring-[#10B981] accent-[#0D5C3A] dark:accent-[#10B981] cursor-pointer shrink-0"
                  />

                  <div className="w-6 h-6 rounded-full bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {student.name.charAt(0)}
                  </div>

                  <div className="min-w-0 truncate">
                    <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] truncate leading-tight">
                      {student.name}
                    </p>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate leading-tight font-mono">
                      {student.admission_number || 'No ADM'}
                    </p>
                  </div>
                </div>

                {/* Right: Division/Grade Badge or Completion Status */}
                <div className="shrink-0 flex items-center gap-1">
                  {rep?.division ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0D5C3A]/10 text-[#0D5C3A] dark:bg-[#10B981]/15 dark:text-[#34D399]">
                      {rep.division.startsWith('Div') ? rep.division : `Div ${rep.division}`}
                    </span>
                  ) : (typeof rep?.total === 'number' && rep.total > 0) || completion === 'complete' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Ready
                    </span>
                  ) : completion === 'incomplete' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Missing
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Strip: Selection Summary */}
      <div className="p-2.5 px-3 border-t border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 bg-stone-50 dark:bg-[#1E2623]/40 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] flex items-center justify-between shrink-0">
        <span className="tabular-nums">
          <strong className="text-[#111827] dark:text-[#F3F7F5]">
            {selectedIds.length}
          </strong>{' '}
          of {enrollments.length} selected for batch print
        </span>
      </div>
    </aside>
  );
}

