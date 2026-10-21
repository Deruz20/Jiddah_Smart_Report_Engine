import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Users, User, Check, Search } from 'lucide-react';
import type { FilterState, Term, Phase, EnrollmentItem, ClassGroup } from './types';

interface SearchFilterBarProps {
  open: boolean;
  filterState: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  enrollments: EnrollmentItem[];
  classes: ClassGroup[];
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
  isGenerating,
  enrollments,
  classes,
}: SearchFilterBarProps) {
  const [studentSearch, setStudentSearch] = useState('');

  const { mode, studentIds = [], classIds = [], section, term, phase, curriculum } = filterState;

  const filteredClasses = useMemo(() => {
    if (section === 'all') return classes;
    return classes.filter(c => c.section_type === section);
  }, [section, classes]);

  const filteredEnrollments = useMemo(() => {
    let list = enrollments;
    if (section !== 'all') list = list.filter(e => e.section_type === section);
    if (classIds && classIds.length > 0) list = list.filter(e => {
      const cls = classes.find(c => classIds.includes(c.id));
      return cls?.enrollmentIds.includes(e.enrollment_id);
    });
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.arabic_name.includes(q));
    }
    return list;
  }, [section, classIds, studentSearch, classes, enrollments]);

  const canGenerate = !!term && !!phase && (
    mode === 'class' ? classIds.length > 0 : studentIds.length > 0
  );

  function toggleStudent(id: string) {
    const next = studentIds.includes(id)
      ? studentIds.filter(s => s !== id)
      : [...studentIds, id];
    onChange({ studentIds: next });
  }

  function selectAllStudents() {
    onChange({ studentIds: filteredEnrollments.map(e => e.enrollment_id) });
  }

  function clearAllStudents() {
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
          <div className="bg-[#FAF7F2] border-b border-stone-200 px-3 sm:px-4 py-3 flex flex-col gap-3 max-h-[52vh] sm:max-h-[60vh] overflow-y-auto">
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
                <div className="inline-flex gap-1 bg-stone-200/70 rounded-xl border border-stone-200 p-1">
                  {CURRICULUM_OPTIONS.map((opt) => {
                    const selected = curriculum === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ curriculum: opt.value as FilterState['curriculum'], classIds: [], studentIds: [] })}
                        className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          selected ? 'bg-white shadow-xs' : 'bg-transparent text-stone-600 hover:text-stone-900'
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
                      className="min-h-[44px] px-3.5 text-xs font-bold text-[#0F4D25] bg-white border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50"
                    >
                      Select All
                    </button>
                    {classIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllClasses}
                        className="min-h-[44px] px-3.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-50"
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
                          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold cursor-pointer border transition-colors inline-flex items-center gap-2 tabular-nums ${
                            selected
                              ? 'bg-[#0F4D25] text-white border-[#0F4D25]'
                              : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <span>{cls.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              selected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {cls.enrollmentIds.length}
                          </span>
                        </button>
                      );
                    })}
                    {filteredClasses.length === 0 && (
                      <span className="text-xs text-stone-500">No classes in this section</span>
                    )}
                  </div>
                </FilterGroup>
              ) : (
                <FilterGroup label={`Select Students${studentIds.length > 0 ? ` (${studentIds.length} selected)` : ''}`}>
                  <div className="relative mb-2 max-w-[280px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by name…"
                      className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 outline-none focus:border-[#0F4D25]"
                    />
                  </div>

                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={selectAllStudents}
                      className="min-h-[44px] px-3.5 text-xs font-bold text-[#0F4D25] bg-white border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50"
                    >
                      Select All
                    </button>
                    {studentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllStudents}
                        className="min-h-[44px] px-3.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-50"
                      >
                        Clear
                      </button>
                    )}
                    {studentIds.length > 0 && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 tabular-nums">
                        {studentIds.length} selected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {filteredEnrollments.map((enr) => {
                      const selected = studentIds.includes(enr.enrollment_id);
                      return (
                        <button
                          key={enr.enrollment_id}
                          type="button"
                          onClick={() => toggleStudent(enr.enrollment_id)}
                          className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer border text-left transition-colors ${
                            selected
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              selected ? 'bg-[#0F4D25] border-[#0F4D25]' : 'bg-white border-stone-300'
                            }`}
                          >
                            {selected && <Check size={10} color="white" strokeWidth={3} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-stone-900 truncate">{enr.name}</div>
                            <div className="text-[10px] text-stone-500 truncate tabular-nums">
                              {enr.circular_class} · {enr.admission_number}
                            </div>
                          </div>
                        </button>
                      );
                    })}
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

              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all ${
                  canGenerate && !isGenerating
                    ? 'bg-[#0F4D25] text-white hover:bg-emerald-900 shadow-sm cursor-pointer'
                    : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Sparkles size={15} />
                <span>{isGenerating ? 'Generating…' : 'Generate Reports'}</span>
              </button>
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
      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
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
      className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold cursor-pointer border transition-colors"
      style={{
        background: active ? activeColor : 'white',
        color: active ? 'white' : '#44403C',
        borderColor: active ? activeColor : '#E7E5E4',
      }}
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
    <div className="inline-flex gap-1 bg-stone-200/70 rounded-xl border border-stone-200 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="min-h-[44px] px-3.5 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all"
          style={{
            background: value === opt.value ? activeColor : 'transparent',
            color: value === opt.value ? 'white' : '#57534E',
          }}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
