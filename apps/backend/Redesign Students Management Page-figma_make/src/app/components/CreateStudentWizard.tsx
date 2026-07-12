import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from './Badge';
import type { Student } from './StudentsTable';

// ─── Types ──────────────────────────────────────────────────────────────────

type SectionType = 'Nursery' | 'Lower Primary' | 'Upper Primary' | '';
type TheologySectionType = 'روضة' | 'ابتدائية_سفلى' | 'ابتدائية_عليا' | '';

interface FormData {
  name: string;
  name_arabic: string;
  gender: 'Male' | 'Female' | '';
  admission_number: string;
  section: SectionType;
  circular_class: string;
  theology_section: TheologySectionType;
  theology_class: string;
  academic_year: string;
}

const initialForm: FormData = {
  name: '',
  name_arabic: '',
  gender: '',
  admission_number: '',
  section: '',
  circular_class: '',
  theology_section: '',
  theology_class: '',
  academic_year: new Date().getFullYear().toString(),
};

// ─── Static Data ────────────────────────────────────────────────────────────

const SCHOOL_PREFIX = 'JINPS';

const circularClassOptions: Record<SectionType, string[]> = {
  Nursery: ['Baby Class', 'Middle Class', 'Top Class'],
  'Lower Primary': ['P.1', 'P.2', 'P.3'],
  'Upper Primary': ['P.4', 'P.5', 'P.6', 'P.7'],
  '': [],
};

const theologyClassOptions: Record<TheologySectionType, string[]> = {
  روضة: ['الصف السفلى', 'الصف الوسطى', 'الصف العليا'],
  ابتدائية_سفلى: ['الصف الأول', 'الصف الثاني', 'الصف الثالث'],
  ابتدائية_عليا: ['الصف الرابع', 'الصف الخامس', 'الصف السادس', 'الصف السابع'],
  '': [],
};

// ─── Helper ─────────────────────────────────────────────────────────────────

function generateAdmissionNumber(year: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${SCHOOL_PREFIX}-${year}-${num}`;
}

function deriveStatus(form: FormData): Student['status'] {
  if (form.section === 'Nursery') return 'Nursery';
  if (form.theology_class) return 'Theology';
  return 'Primary';
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SelectionCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-center px-4 py-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        selected
          ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
      )}
    >
      {children}
    </button>
  );
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 transition-all text-slate-800 placeholder-slate-400 text-sm';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';
const noteClass = 'mt-1.5 text-xs text-orange-500 font-medium';

// ─── Step 1 — Student Info ───────────────────────────────────────────────────

function Step1({ form, setField }: { form: FormData; setField: (k: keyof FormData, v: string) => void }) {
  const handleRegenerate = () => {
    setField('admission_number', generateAdmissionNumber(form.academic_year || new Date().getFullYear().toString()));
  };

  return (
    <div className="space-y-5">
      {/* English name */}
      <div>
        <label className={labelClass}>Step 1: Student Name</label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. John Smith"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
        />
      </div>

      {/* Arabic name */}
      <div>
        <label className={cn(labelClass, 'flex items-center gap-2')}>
          <span>Arabic Name</span>
          <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">(Optional)</span>
        </label>
        <input
          type="text"
          dir="rtl"
          className={cn(inputClass, 'text-right')}
          placeholder="e.g. يوسف موتيبي"
          value={form.name_arabic}
          onChange={(e) => setField('name_arabic', e.target.value)}
        />
      </div>

      {/* Gender */}
      <div>
        <label className={labelClass}>Gender</label>
        <div className="grid grid-cols-2 gap-3">
          {(['Male', 'Female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setField('gender', g)}
              className={cn(
                'py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200',
                form.gender === g
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Admission Number */}
      <div>
        <label className={labelClass}>Admission Number</label>
        <div className="flex gap-2">
          <input
            type="text"
            className={cn(inputClass, 'flex-1')}
            placeholder={`${SCHOOL_PREFIX}-2026-XXXX`}
            value={form.admission_number}
            onChange={(e) => setField('admission_number', e.target.value)}
          />
          <button
            type="button"
            onClick={handleRegenerate}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 text-sm font-semibold transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
        </div>
        <p className={noteClass}>Auto-generated admission number (editable)</p>
      </div>
    </div>
  );
}

// ─── Step 2 — Section Selection ──────────────────────────────────────────────

function Step2({ form, setField }: { form: FormData; setField: (k: keyof FormData, v: string) => void }) {
  const sections: { value: SectionType; label: string; sub: string }[] = [
    { value: 'Nursery', label: 'Nursery', sub: 'Baby, Middle, Top' },
    { value: 'Lower Primary', label: 'Lower Primary', sub: 'P.1, P.2, P.3' },
    { value: 'Upper Primary', label: 'Upper Primary', sub: 'P.4, P.5, P.6, P.7' },
  ];

  return (
    <div className="space-y-3">
      <p className={labelClass}>Step 2: Select Section</p>
      {sections.map((s) => (
        <SelectionCard
          key={s.value}
          selected={form.section === s.value}
          onClick={() => {
            setField('section', s.value);
            setField('circular_class', ''); // reset dependent field
          }}
        >
          <p className={cn('text-sm font-bold', form.section === s.value ? 'text-emerald-700' : 'text-slate-800')}>
            {s.label}
          </p>
          <p className={cn('text-xs mt-0.5', form.section === s.value ? 'text-emerald-500' : 'text-slate-400')}>
            {s.sub}
          </p>
        </SelectionCard>
      ))}
    </div>
  );
}

// ─── Step 3 — Circular Class ─────────────────────────────────────────────────

function Step3({ form, setField }: { form: FormData; setField: (k: keyof FormData, v: string) => void }) {
  const options = circularClassOptions[form.section] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Step 3: Select Circular Class</label>
        {options.length > 0 ? (
          <select
            className={inputClass}
            value={form.circular_class}
            onChange={(e) => setField('circular_class', e.target.value)}
          >
            <option value="">— Select class —</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <div className="px-4 py-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 text-center">
            Please select a section in the previous step first.
          </div>
        )}
      </div>

      {form.section && (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={12} className="text-emerald-600" strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-800">Section selected</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {form.section} — {circularClassOptions[form.section].join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 — Theology + Academic Year ───────────────────────────────────────

function Step4({ form, setField }: { form: FormData; setField: (k: keyof FormData, v: string) => void }) {
  const theologySections: { value: TheologySectionType; label: string; sub: string }[] = [
    { value: 'روضة', label: 'الروضة', sub: 'السفلى، الوسطى، العليا' },
    { value: 'ابتدائية_سفلى', label: 'الابتدائية السفلى', sub: 'الصف الأول - الثالث' },
    { value: 'ابتدائية_عليا', label: 'الابتدائية العليا', sub: 'الصف الرابع - السابع' },
  ];

  const theologyOptions = theologyClassOptions[form.theology_section] ?? [];

  return (
    <div className="space-y-5">
      {/* 4A — Theology Section */}
      <div className="space-y-2">
        <p className={labelClass}>Step 4A: Select Theology Section</p>
        <div className="grid grid-cols-3 gap-2">
          {theologySections.map((ts) => (
            <SelectionCard
              key={ts.value}
              selected={form.theology_section === ts.value}
              onClick={() => {
                setField('theology_section', ts.value);
                setField('theology_class', '');
              }}
            >
              <p className={cn('text-xs font-bold', form.theology_section === ts.value ? 'text-emerald-700' : 'text-slate-800')} dir="rtl">
                {ts.label}
              </p>
              <p className={cn('text-xs mt-0.5 leading-tight', form.theology_section === ts.value ? 'text-emerald-500' : 'text-slate-400')} dir="rtl">
                {ts.sub}
              </p>
            </SelectionCard>
          ))}
        </div>
      </div>

      {/* 4B — Theology Class */}
      <div>
        <label className={cn(labelClass, 'flex items-center justify-between')}>
          <span>Step 4B: Select Theology Class</span>
        </label>
        {form.theology_section ? (
          <select
            dir="rtl"
            className={cn(inputClass, 'text-right')}
            value={form.theology_class}
            onChange={(e) => setField('theology_class', e.target.value)}
          >
            <option value="">— اختر الصف —</option>
            {theologyOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <div className="px-4 py-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 text-center">
            اختر القسم أولاً
          </div>
        )}
        <p className={noteClass}>
          ℹ Theology class level is independent of circular class level
        </p>
      </div>

      {/* Academic Year */}
      <div>
        <label className={labelClass}>Academic Year</label>
        <input
          type="number"
          className={inputClass}
          min="2020"
          max="2035"
          value={form.academic_year}
          onChange={(e) => setField('academic_year', e.target.value)}
        />
        <p className={noteClass}>Admission number updates with year change</p>
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-400',
            i < current ? 'bg-emerald-500' : 'bg-slate-200'
          )}
        />
      ))}
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

interface Props {
  onAdd?: (student: Student) => void;
  nextId?: number;
}

export function CreateStudentWizard({ onAdd }: Props) {
  const [step, setStep] = useState(1);
  const [form, setFormState] = useState<FormData>({
    ...initialForm,
    admission_number: generateAdmissionNumber(new Date().getFullYear().toString()),
  });
  const [submitted, setSubmitted] = useState(false);

  const TOTAL_STEPS = 4;

  const setField = useCallback((key: keyof FormData, value: string) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value };
      // Re-generate admission number when academic year changes
      if (key === 'academic_year' && value.length === 4) {
        const parts = prev.admission_number.split('-');
        if (parts.length === 3) {
          next.admission_number = `${SCHOOL_PREFIX}-${value}-${parts[2]}`;
        }
      }
      return next;
    });
  }, []);

  const canAdvance = () => {
    if (step === 1) return form.name.trim().length > 0 && form.gender !== '';
    if (step === 2) return form.section !== '';
    if (step === 3) return form.circular_class !== '';
    return true; // step 4 — theology is optional
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (onAdd) {
      const newStudent: Student = {
        id: String(Date.now()),
        name: form.name,
        admission_number: form.admission_number || generateAdmissionNumber(form.academic_year),
        created_at: new Date().toISOString(),
        circular_class: form.circular_class || '—',
        section: form.section !== 'Nursery' ? null : form.circular_class || null,
        theology_class_arabic: form.theology_class || null,
        theology_class_english: null,
        academic_year: form.academic_year,
        status: deriveStatus(form),
        gender: form.gender as 'Male' | 'Female',
      };
      onAdd(newStudent);
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setStep(1);
      setFormState({
        ...initialForm,
        admission_number: generateAdmissionNumber(new Date().getFullYear().toString()),
      });
    }, 2500);
  };

  const stepContent = [
    <Step1 key="s1" form={form} setField={setField} />,
    <Step2 key="s2" form={form} setField={setField} />,
    <Step3 key="s3" form={form} setField={setField} />,
    <Step4 key="s4" form={form} setField={setField} />,
  ];

  return (
    <div className="bg-white/75 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/60 rounded-2xl p-6 relative overflow-hidden flex flex-col h-full">
      {/* Background blob */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-gradient-to-br from-emerald-100/50 to-orange-50/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Register New Student</h2>
          {!submitted && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
              Step {step} of {TOTAL_STEPS}
            </span>
          )}
        </div>

        {/* Progress */}
        {!submitted && <ProgressBar current={step} total={TOTAL_STEPS} />}

        {/* Form / Success */}
        <div className="flex-1 mt-5 min-h-[300px] relative">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.05 }}
                  className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"
                >
                  <CheckCircle2 size={32} />
                </motion.div>
                <h3 className="text-base font-bold text-slate-800">Student Registered!</h3>
                <p className="text-sm text-slate-500 max-w-[220px]">
                  <span className="font-semibold text-slate-700">{form.name}</span> has been added to the enrollment list.
                </p>
                <div className="text-xs text-emerald-600 font-mono bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                  {form.admission_number}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {stepContent[step - 1]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        {!submitted && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-0 transition-all"
            >
              <ChevronLeft size={15} />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full shadow-md shadow-emerald-200/60 transition-all active:scale-95"
            >
              {step === TOTAL_STEPS ? (
                <>
                  <CheckCircle2 size={15} />
                  Register Student
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
