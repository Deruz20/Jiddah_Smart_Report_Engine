import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Users, User, Check, Search, Printer, Eye, Download, MessageSquare, UserCheck } from 'lucide-react';
import { MoreActionsMenu } from '@/components/ui/more-actions-menu';
import type { FilterState, Term, Phase, EnrollmentItem, ClassGroup } from './types';
import {
  toggleSelectAllPreservingOthers,
  applyRangeSelection,
  filterEnrollmentsByCompletion,
  type StudentCompletionFilter,
  type StudentCompletionStatus,
} from '@/lib/report-selection';

interface SearchFilterBarProps {
  open: boolean;
  filterState: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onGenerate: () => void;
  onPrintSelected?: () => void;
  isGenerating: boolean;
  enrollments: EnrollmentItem[];
  classes: ClassGroup[];
  completionByEnrollment?: Record<string, StudentCompletionStatus>;
}

const SECTION_LABELS: Record<string, string> = {
  all: 'All Sections',
  nursery: 'Nursery',
  lower_primary: 'Lower Primary',
  upper_primary: 'Upper Primary',
};

const CURRICULUM_OPTIONS = [
  { value: 'secular', label: 'Secular', color: '#0F4D25' },
  { value: 'theology', label: 'Theology', color: '#7c3aed' },
  { value: 'combined', label: 'Combined', color: '#1d4ed8' },
];

const TERM_OPTS: { value: Term; label: string }[] = [
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
];

const PHASE_OPTS: { value: Phase; label: string; full: string }[] = [
  { value: 'BOT', label: 'BOT', full: 'Beginning of Term' },
  { value: 'MOT', label: 'MOT', full: 'Mid-Term' },
  { value: 'EOT', label: 'EOT', full: 'End of Term' },
];

export function SearchFilterBar({
  open,
  filterState,
  onChange,
  onGenerate,
  onPrintSelected,
  isGenerating,
  enrollments,
  classes,
  completionByEnrollment = {},
}: SearchFilterBarProps) {
  const [studentSearch, setStudentSearch] = useState('');
  const [completionFilter, setCompletionFilter] = useState<StudentCompletionFilter>('all');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  const { mode, studentIds = [], classIds = [], section, term, phase, curriculum } = filterState;

  const filteredClasses = useMemo(() => {
    if (section === 'all') return classes;
    return classes.filter(c => c.section_type === section);
  }, [section, classes]);

  const baseEnrollments = useMemo(() => {
    let list = enrollments;
    if (section !== 'all') list = list.filter(e => e.section_type === section);
    if (classIds && classIds.length > 0) list = list.filter(e => {
      const cls = classes.find(c => classIds.includes(c.id));
      return cls?.enrollmentIds.includes(e.enrollment_id);
    });
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.arabic_name.includes(q) ||
        (e.admission_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [section, classIds, studentSearch, classes, enrollments]);

  const hasCompletionData = useMemo(
    () => Object.keys(completionByEnrollment).length > 0,
    [completionByEnrollment]
  );

  const completionCounts = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    for (const enr of baseEnrollments) {
      const st = completionByEnrollment[enr.enrollment_id];
      if (st === 'complete') complete += 1;
      else if (st === 'incomplete') incomplete += 1;
    }
    return { all: baseEnrollments.length, complete, incomplete };
  }, [baseEnrollments, completionByEnrollment]);

  const filteredEnrollments = useMemo(
    () => filterEnrollmentsByCompletion(baseEnrollments, completionByEnrollment, completionFilter),
    [baseEnrollments, completionByEnrollment, completionFilter]
  );

  const visibleEnrollmentIds = useMemo(
    () => filteredEnrollments.map(e => e.enrollment_id),
    [filteredEnrollments]
  );

  const allVisibleSelected = useMemo(() => {
    if (visibleEnrollmentIds.length === 0) return false;
    const selectedSet = new Set(studentIds);
    return visibleEnrollmentIds.every(id => selectedSet.has(id));
  }, [visibleEnrollmentIds, studentIds]);

  const canGenerate = !!term && !!phase && (
    mode === 'class' ? classIds.length > 0 : studentIds.length > 0
  );

  const selectedPrintCount = useMemo(() => {
    if (mode === 'individual') return studentIds.length;
    if (classIds.length === 0) return 0;
    const uniqueIds = new Set<string>();
    for (const cid of classIds) {
      const cls = classes.find(c => c.id === cid);
      if (cls) cls.enrollmentIds.forEach(id => uniqueIds.add(id));
    }
    return uniqueIds.size;
  }, [mode, studentIds, classIds, classes]);

  function handleStudentClick(id: string, shiftKey: boolean) {
    const { nextSelected, nextAnchorIndex } = applyRangeSelection(
      visibleEnrollmentIds,
      studentIds,
      id,
      anchorIndex,
      shiftKey
    );
    setAnchorIndex(nextAnchorIndex);
    onChange({ studentIds: nextSelected });
  }

  function handleToggleSelectAllVisible() {
    onChange({ studentIds: toggleSelectAllPreservingOthers(visibleEnrollmentIds, studentIds) });
  }

  function clearAllStudents() {
    setAnchorIndex(null);
    onChange({ studentIds: [] });
  }

  function toggleClass(id: string) {
    const next = classIds.includes(id)
      ? classIds.filter(c => c !== id)
      : [...classIds, id];
    onChange({ classIds: next });
  }

  function selectAllClasses() {
    onChange({ classIds: filteredClasses.map(c => c.id) });
  }

  function clearAllClasses() {
    onChange({ classIds: [] });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="bg-[#FAF7F2] dark:bg-[#0D1412] border-b border-stone-200 dark:border-[#1C2622] px-3 sm:px-4 py-3 flex flex-col gap-3 max-h-[56vh] sm:max-h-[62vh] overflow-y-auto">
            {/* ── Row 1: Mode + Section + Curriculum ── */}
            <div className="flex gap-3 items-start flex-wrap">
              <FilterGroup label="Mode">
                <SegmentedPair
                  options={[
                    { value: 'class', label: 'Class', icon: <Users size={14} /> },
                    { value: 'individual', label: 'Student', icon: <User size={14} /> },
                  ]}
                  value={mode}
                  onChange={(v) => onChange({ mode: v as 'class' | 'individual', studentIds: [], classIds: [] })}
                  activeColor="#0F4D25"
                />
              </FilterGroup>

              <FilterGroup label="Section">
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(SECTION_LABELS).map(([val, lbl]) => (
                    <PillButton
                      key={val}
                      active={section === val}
                      onClick={() => onChange({ section: val as FilterState['section'], classIds: [] })}
                      activeColor="#0F4D25"
                    >
                      {lbl}
                    </PillButton>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup label="Curriculum">
                <div className="inline-flex gap-1 bg-stone-200/70 dark:bg-[#141F1C] rounded-xl border border-stone-200 dark:border-[#24332E] p-1">
                  {CURRICULUM_OPTIONS.map((opt) => {
                    const selected = curriculum === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ curriculum: opt.value as FilterState['curriculum'], classIds: [], studentIds: [] })}
                        className={`h-9 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          selected
                            ? 'bg-white dark:bg-[#1B2A25] shadow-xs'
                            : 'bg-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                        }`}
                        style={selected ? { color: opt.color } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>
            </div>

            {/* ── Row 2: Class/Student selector ── */}
            <div className="flex gap-3 items-start flex-wrap">
              {mode === 'class' ? (
                <FilterGroup label={`Select Classes${classIds.length > 0 ? ` (${classIds.length} selected)` : ''}`}>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="h-9 px-3 text-xs font-bold text-[#0F4D25] dark:text-emerald-300 bg-white dark:bg-[#111916] border border-emerald-200 dark:border-emerald-800/70 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      Select All ({filteredClasses.length})
                    </button>
                    {classIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllClasses}
                        className="h-9 px-3 text-xs font-bold text-rose-700 dark:text-rose-300 bg-white dark:bg-[#111916] border border-rose-200 dark:border-rose-900/60 rounded-xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {filteredClasses.map((cls) => {
                      const selected = classIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer border transition-colors inline-flex items-center gap-2 tabular-nums ${
                            selected
                              ? 'bg-[#0F4D25] text-white border-[#0F4D25]'
                              : 'bg-white dark:bg-[#111916] text-stone-800 dark:text-stone-100 border-stone-200 dark:border-[#24332E] hover:bg-stone-50 dark:hover:bg-[#16221E]'
                          }`}
                        >
                          <span>{cls.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              selected ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-[#1B2A25] text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            {cls.enrollmentIds.length}
                          </span>
                        </button>
                      );
                    })}
                    {filteredClasses.length === 0 && (
                      <span className="text-xs text-stone-500 dark:text-stone-400">No classes in this section</span>
                    )}
                  </div>
                </FilterGroup>
              ) : (
                <FilterGroup label={`Select Students${studentIds.length > 0 ? ` (${studentIds.length} selected)` : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="relative flex-1 min-w-[200px] max-w-[280px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setAnchorIndex(null);
                        }}
                        placeholder="Search by name or adm no…"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-stone-200 dark:border-[#24332E] bg-white dark:bg-[#111916] text-xs text-stone-800 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:border-[#0F4D25] dark:focus:border-emerald-500"
                      />
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-xl border border-stone-200 dark:border-[#24332E] bg-stone-100 dark:bg-[#141F1C] p-1">
                      {([
                        { id: 'all', label: `All (${completionCounts.all})` },
                        { id: 'complete', label: hasCompletionData ? `Complete (${completionCounts.complete})` : 'Complete' },
                        { id: 'incomplete', label: hasCompletionData ? `Incomplete (${completionCounts.incomplete})` : 'Incomplete' },
                      ] as const).map((chip) => {
                        const active = completionFilter === chip.id;
                        const disabled = chip.id !== 'all' && !hasCompletionData;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            disabled={disabled}
                            title={disabled ? 'Generate a preview batch first to check marks completeness' : undefined}
                            onClick={() => {
                              setCompletionFilter(chip.id);
                              setAnchorIndex(null);
                            }}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
                              active
                                ? 'bg-white dark:bg-[#1B2A25] text-[#0F4D25] dark:text-emerald-300 shadow-xs'
                                : disabled
                                  ? 'text-stone-400 dark:text-stone-600 cursor-not-allowed'
                                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white cursor-pointer'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllVisible}
                      disabled={visibleEnrollmentIds.length === 0}
                      className={`h-9 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                        allVisibleSelected
                          ? 'bg-[#0F4D25] text-white border-[#0F4D25]'
                          : 'text-[#0F4D25] dark:text-emerald-300 bg-white dark:bg-[#111916] border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {allVisibleSelected
                        ? `Deselect All (${visibleEnrollmentIds.length})`
                        : `Select All (${visibleEnrollmentIds.length})`}
                    </button>
                    {studentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllStudents}
                        className="h-9 px-3 text-xs font-bold text-rose-700 dark:text-rose-300 bg-white dark:bg-[#111916] border border-rose-200 dark:border-rose-900/60 rounded-xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Clear All
                      </button>
                    )}
                    {studentIds.length > 0 && (
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-3 py-1 tabular-nums">
                        {studentIds.length} selected
                      </span>
                    )}
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline">
                      Tip: Hold Shift + Click to select a range
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[190px] overflow-y-auto pr-1">
                    {filteredEnrollments.map((enr) => {
                      const selected = studentIds.includes(enr.enrollment_id);
                      const status = completionByEnrollment[enr.enrollment_id];
                      return (
                        <div
                          key={enr.enrollment_id}
                          className={`min-h-[40px] flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-left transition-colors ${
                            selected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                              : 'bg-white dark:bg-[#1E1F20] border-[#E1E3E1] dark:border-[#282A2C] hover:bg-[#F0F4F9] dark:hover:bg-[#282A2C]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleStudentClick(enr.enrollment_id, e.shiftKey)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer outline-none text-left"
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                selected
                                  ? 'bg-[#0D5C3A] border-[#0D5C3A]'
                                  : 'bg-white dark:bg-[#131314] border-[#C4C7C5] dark:border-[#3C4043]'
                              }`}
                            >
                              {selected && <Check size={10} color="white" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] truncate">{enr.name}</span>
                                {status === 'complete' && (
                                  <span title="All marks recorded" className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                {status === 'incomplete' && (
                                  <span title="Incomplete marks" className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-[#747775] dark:text-[#8E918F] truncate tabular-nums">
                                {enr.circular_class} · {enr.admission_number || 'ADM'}
                              </div>
                            </div>
                          </button>

                          <MoreActionsMenu
                            items={[
                              {
                                label: 'Preview Report',
                                icon: Eye,
                                onClick: () => {
                                  onChange({ studentIds: [enr.enrollment_id], mode: 'individual' });
                                  onGenerate();
                                },
                              },
                              {
                                label: 'Download PDF',
                                icon: Download,
                                onClick: () => {
                                  onChange({ studentIds: [enr.enrollment_id], mode: 'individual' });
                                  if (onPrintSelected) onPrintSelected();
                                },
                              },
                              {
                                label: 'Edit Remarks',
                                icon: MessageSquare,
                                onClick: () => {
                                  window.location.href = `/admin/marks?student=${enr.enrollment_id}`;
                                },
                              },
                              {
                                label: 'View Student Profile',
                                icon: UserCheck,
                                onClick: () => {
                                  window.location.href = `/admin/students?search=${encodeURIComponent(enr.name)}`;
                                },
                              },
                            ]}
                            align="end"
                          />
                        </div>
                      );
                    })}
                    {filteredEnrollments.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-stone-500 dark:text-stone-400">
                        No students match the active filter.
                      </div>
                    )}
                  </div>
                </FilterGroup>
              )}
            </div>

            {/* ── Row 3: Term + Phase + Generate ── */}
            <div className="flex gap-3 items-end flex-wrap justify-between">
              <div className="flex gap-3 items-end flex-wrap">
                <FilterGroup label="Term">
                  <div className="flex gap-1.5 flex-wrap">
                    {TERM_OPTS.map((t) => (
                      <PillButton
                        key={t.value}
                        active={term === t.value}
                        onClick={() => onChange({ term: term === t.value ? '' : t.value })}
                        activeColor="#0F4D25"
                      >
                        {t.label}
                      </PillButton>
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup label="Phase">
                  <div className="flex gap-1.5 flex-wrap">
                    {PHASE_OPTS.map((p) => (
                      <PillButton
                        key={p.value}
                        active={phase === p.value}
                        onClick={() => onChange({ phase: phase === p.value ? '' : p.value })}
                        activeColor="#0F4D25"
                      >
                        {p.label}
                      </PillButton>
                    ))}
                  </div>
                </FilterGroup>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onPrintSelected && (
                  <button
                    type="button"
                    onClick={onPrintSelected}
                    disabled={!canGenerate || isGenerating}
                    className={`h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all ${
                      canGenerate && !isGenerating
                        ? 'bg-white dark:bg-[#111916] text-[#0F4D25] dark:text-emerald-300 border-[#0F4D25]/40 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs cursor-pointer'
                        : 'bg-stone-100 dark:bg-[#141F1C] text-stone-400 dark:text-stone-600 border-stone-200 dark:border-[#24332E] cursor-not-allowed'
                    }`}
                  >
                    <Printer size={14} />
                    <span>Print Selected ({selectedPrintCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                  className={`h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all ${
                    canGenerate && !isGenerating
                      ? 'bg-[#0F4D25] text-white hover:bg-emerald-900 shadow-sm cursor-pointer'
                      : 'bg-stone-200 dark:bg-[#1B2A25] text-stone-500 dark:text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>{isGenerating ? 'Generating…' : 'Generate Reports'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  activeColor = '#0F4D25',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${
        active
          ? 'text-white'
          : 'bg-white dark:bg-[#111916] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-[#24332E] hover:bg-stone-50 dark:hover:bg-[#16221E]'
      }`}
      style={active ? { background: activeColor, borderColor: activeColor } : undefined}
    >
      {children}
    </button>
  );
}

function SegmentedPair({
  options,
  value,
  onChange,
  activeColor = '#0F4D25',
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  activeColor?: string;
}) {
  return (
    <div className="inline-flex gap-1 bg-stone-200/70 dark:bg-[#141F1C] rounded-xl border border-stone-200 dark:border-[#24332E] p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-9 px-3 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all ${
              active ? 'text-white' : 'bg-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
            style={active ? { background: activeColor } : undefined}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
