import { useState } from 'react'
import SelectionBar from '../components/SelectionBar'
import StudentBanner from '../components/StudentBanner'
import CircularTable from '../components/CircularTable'
import TheologyTable from '../components/TheologyTable'
import SaveButton from '../components/SaveButton'

export type ExamType = 'BOT' | 'MOT' | 'EOT'

export type Term = {
  id: string
  label: string
  isCurrent: boolean
}

export type Student = {
  id: string
  name: string
  admissionNo: string
  class: string
  section: string
  arabicLevel: string
}

export type ScoreMap = Record<string, string>

export const MOCK_TERMS: Term[] = [
  { id: 't1', label: 'Term 1 — 2026', isCurrent: true },
  { id: 't2', label: 'Term 2 — 2026', isCurrent: false },
  { id: 't3', label: 'Term 3 — 2026', isCurrent: false },
  { id: 't4', label: 'Term 1 — 2025', isCurrent: false },
]

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Amara Okonkwo', admissionNo: 'ADM-2024-001', class: 'P4', section: 'Blue', arabicLevel: 'الصف الرابع' },
  { id: 's2', name: 'Fatima Al-Rashid', admissionNo: 'ADM-2024-002', class: 'P5', section: 'Green', arabicLevel: 'الصف الخامس' },
  { id: 's3', name: 'Daniel Mwangi', admissionNo: 'ADM-2024-003', class: 'P3', section: 'Red', arabicLevel: 'الصف الثالث' },
  { id: 's4', name: 'Nour El-Hassan', admissionNo: 'ADM-2024-004', class: 'Nursery', section: 'Yellow', arabicLevel: 'مرحلة الروضة' },
  { id: 's5', name: 'Kezia Achieng', admissionNo: 'ADM-2024-005', class: 'P6', section: 'Blue', arabicLevel: 'الصف السادس' },
  { id: 's6', name: 'Ibrahim Suleiman', admissionNo: 'ADM-2024-006', class: 'P1', section: 'Green', arabicLevel: 'الصف الأول' },
  { id: 's7', name: 'Grace Nakato', admissionNo: 'ADM-2024-007', class: 'P2', section: 'Red', arabicLevel: 'الصف الثاني' },
  { id: 's8', name: 'Yusuf Kamara', admissionNo: 'ADM-2024-008', class: 'P4', section: 'Yellow', arabicLevel: 'الصف الرابع' },
]

export default function MarksEntryPage() {
  const [selectedTerm, setSelectedTerm] = useState<Term>(MOCK_TERMS[0])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [examType, setExamType] = useState<ExamType>('BOT')
  const [circularScores, setCircularScores] = useState<ScoreMap>({})
  const [theologyScores, setTheologyScores] = useState<ScoreMap>({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const isReady = !!selectedStudent

  const handleSave = async () => {
    if (!isReady || isSaving) return
    setIsSaving(true)
    setSavedSuccess(false)
    await new Promise(r => setTimeout(r, 1800))
    setIsSaving(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '0' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 100px' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Enter Marks
          </h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
            Choose term and student, then enter circular and theology scores.
          </p>
        </div>

        {/* ── Selection Bar ── */}
        <SelectionBar
          terms={MOCK_TERMS}
          students={MOCK_STUDENTS}
          selectedTerm={selectedTerm}
          selectedStudent={selectedStudent}
          examType={examType}
          onTermChange={setSelectedTerm}
          onStudentChange={student => {
            setSelectedStudent(student)
            setCircularScores({})
            setTheologyScores({})
            setSavedSuccess(false)
          }}
          onExamTypeChange={e => {
            setExamType(e)
            setSavedSuccess(false)
          }}
        />

        {/* ── Student Banner ── */}
        {selectedStudent && (
          <div className="animate-up" style={{ marginTop: 16 }}>
            <StudentBanner student={selectedStudent} examType={examType} />
          </div>
        )}

        {/* ── Data Entry Tables ── */}
        {isReady ? (
          <div
            className="animate-up"
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <CircularTable
              examType={examType}
              scores={circularScores}
              onChange={(id, val) => setCircularScores(p => ({ ...p, [id]: val }))}
            />
            <TheologyTable
              examType={examType}
              scores={theologyScores}
              onChange={(id, val) => setTheologyScores(p => ({ ...p, [id]: val }))}
            />
          </div>
        ) : (
          <EmptyPrompt />
        )}
      </div>

      {/* ── Sticky Save Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #e4e9f0',
        padding: '14px 20px',
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1160,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            {savedSuccess ? (
              <div className="animate-up" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#e8f8ef', color: '#1a9e5c',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>✓</span>
                <span style={{ color: '#1a9e5c', fontSize: 14, fontWeight: 600 }}>
                  Marks saved successfully
                </span>
              </div>
            ) : isReady ? (
              <span style={{ color: '#6b7280', fontSize: 13 }}>
                Saving{' '}
                <span style={{ color: '#111827', fontWeight: 600 }}>
                  {examType === 'BOT' ? 'Beginning of Term' : examType === 'MOT' ? 'Mid of Term' : 'End of Term'}
                </span>{' '}
                marks for <span style={{ color: '#111827', fontWeight: 600 }}>{selectedStudent?.name}</span>
              </span>
            ) : (
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Select a student to enable saving</span>
            )}
          </div>
          <SaveButton
            examType={examType}
            isSaving={isSaving}
            isReady={isReady}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  )
}

function EmptyPrompt() {
  return (
    <div style={{
      marginTop: 40,
      textAlign: 'center',
      padding: '56px 24px',
      background: '#fff',
      borderRadius: 16,
      border: '1.5px dashed #e4e9f0',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#f0fdf4',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, fontSize: 26,
      }}>
        📝
      </div>
      <div style={{ color: '#374151', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
        No student selected
      </div>
      <div style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
        Use the controls above to select a term, student, and exam type to begin entering marks.
      </div>
    </div>
  )
}
