import React, { useState, useRef, useEffect } from 'react'

export type EnrollmentData = {
  id: string
  name: string
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
  theology_class_level: string | null
}

export type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type Props = {
  terms: TermData[]
  students: EnrollmentData[]
  selectedTermId: string
  selectedStudent: EnrollmentData | null
  examType: 'bot' | 'mot' | 'eot' | 'all'
  onTermChange: (termId: string) => void
  onStudentChange: (s: EnrollmentData | null) => void
  onExamTypeChange: (e: 'bot' | 'mot' | 'eot' | 'all') => void
}

const EXAM_TYPES: { value: 'bot' | 'mot' | 'eot'; label: string }[] = [
  { value: 'bot', label: 'BOT' },
  { value: 'mot', label: 'MOT' },
  { value: 'eot', label: 'EOT' },
]

// Consistent hue per student id for avatar
const avatarHue = (id: string) => ((id.charCodeAt(1) || 0) * 37 + 120) % 360

export default function SelectionBar({
  terms, students, selectedTermId, selectedStudent, examType,
  onTermChange, onStudentChange, onExamTypeChange,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const displayValue = selectedStudent
    ? selectedStudent.name
    : query

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(query.toLowerCase()) ||
    s.circular_class.toLowerCase().includes(query.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e4e9f0',
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 16,
      alignItems: 'end',
    }}>
      {/* ── Term ── */}
      <div>
        <FieldLabel>Term</FieldLabel>
        <select
          className="brand-select"
          value={selectedTermId}
          onChange={e => onTermChange(e.target.value)}
        >
          <option value="" disabled>Choose a term...</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}{t.is_current ? ' ★' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Student Searchable ── */}
      <div style={{ position: 'relative' }}>
        <FieldLabel>Student</FieldLabel>
        <div style={{ position: 'relative' }}>
          {selectedStudent && (
            <div style={{
              position: 'absolute',
              left: 10, top: '50%', transform: 'translateY(-50%)',
              width: 26, height: 26, borderRadius: '50%',
              background: `hsl(${avatarHue(selectedStudent.id)}, 60%, 88%)`,
              color: `hsl(${avatarHue(selectedStudent.id)}, 55%, 32%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              pointerEvents: 'none', zIndex: 1,
            }}>
              {selectedStudent.name.charAt(0)}
            </div>
          )}
          <input
            ref={inputRef}
            className="brand-input"
            style={{ paddingLeft: selectedStudent ? 44 : 12, paddingRight: selectedStudent ? 34 : 12 }}
            placeholder="Search name or admission no."
            value={displayValue}
            onChange={e => {
              setQuery(e.target.value)
              onStudentChange(null)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
          {selectedStudent && (
            <button
              onClick={() => { onStudentChange(null); setQuery(''); setOpen(false) }}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: '#f3f4f6', border: 'none', borderRadius: '50%',
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6b7280', fontSize: 14, lineHeight: 1,
                padding: 0,
              }}
              title="Clear"
            >×</button>
          )}
        </div>

        {/* Dropdown */}
        {open && !selectedStudent && (
          <div
            ref={dropRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0, right: 0,
              background: '#fff',
              border: '1.5px solid #e4e9f0',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              zIndex: 100,
              overflow: 'hidden',
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 14px', color: '#9ca3af', fontSize: 13 }}>No results found</div>
            ) : filtered.map(s => (
              <button
                key={s.id}
                onMouseDown={() => { onStudentChange(s); setQuery(''); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fdf9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${avatarHue(s.id)}, 60%, 88%)`,
                  color: `hsl(${avatarHue(s.id)}, 55%, 32%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#111827', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>{s.admission_number} · Class {s.circular_class}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Exam Type Segmented ── */}
      <div>
        <FieldLabel>Exam Type</FieldLabel>
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: 10,
          padding: 3,
          gap: 2,
        }}>
          {EXAM_TYPES.map(et => {
            const isActive = examType === et.value
            return (
              <button
                key={et.value}
                onClick={() => onExamTypeChange(et.value)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#f07d1a' : '#6b7280',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.18s ease',
                  letterSpacing: '0.03em',
                }}
              >
                {et.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11.5,
      fontWeight: 600,
      color: '#6b7280',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: 7,
    }}>
      {children}
    </div>
  )
}
