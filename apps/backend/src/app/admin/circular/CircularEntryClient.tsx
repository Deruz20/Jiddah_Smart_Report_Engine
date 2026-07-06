'use client'

import { useEffect, useState, type MouseEvent } from 'react'

type EnrollmentData = {
  enrollment_id: string
  name: string
  class_name: string
}

type TermData = { id: string; term_name: string; is_current: boolean }
type SubjectData = { id: string; subject_name: string }

type EntryType = 'MOT' | 'EOT'

interface CircularEntryClientProps {
  enrollments: EnrollmentData[]
  terms: TermData[]
  subjects: SubjectData[]
  entryType: EntryType
}

export default function CircularEntryClient({ enrollments, terms, subjects, entryType }: CircularEntryClientProps) {
  const [termId, setTermId] = useState('')

  useEffect(() => {
    const activeTerm = terms.find(t => t.is_current)
    if (activeTerm) setTermId(activeTerm.id)
    else if (terms.length > 0) setTermId(terms[0].id)
  }, [terms])

  const isEOT = entryType === 'EOT'

  const handleSave = async (enrollmentId: string, event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const row = button.closest('tr')
    if (!row) {
      alert('Unable to locate student row.')
      return
    }

    const subjectSelect = row.querySelector<HTMLSelectElement>('.subject-select')
    const botInput = row.querySelector<HTMLInputElement>('.bot-input')
    const scoreInput = row.querySelector<HTMLInputElement>(isEOT ? '.eot-input' : '.mot-input')
    
    const subjectId = subjectSelect?.value
    const score = scoreInput?.value
    const botScore = botInput?.value

    if (!enrollmentId || !subjectId || !termId) {
      alert('Please fill student, subject, and term.')
      return
    }

    if (!score) {
      alert(`Please enter a ${entryType} mark.`)
      return
    }

    const payload: Record<string, unknown> = {
      enrollment_id: enrollmentId,
      subject_id: subjectId,
      term_id: termId,
      bot_score: botScore ? Number(botScore) : null,
      mot_score: !isEOT ? Number(score) : null,
      eot_score: isEOT ? Number(score) : null,
    }

    try {
      const response = await fetch('/api/circular-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error || 'Failed to save circular result')
        return
      }
      alert(isEOT ? 'Circular EOT saved successfully' : 'Circular MOT saved successfully')
    } catch (err) {
      alert('Network error while saving circular result')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`circular-${entryType.toLowerCase()}-term`} className="block text-sm font-medium text-gray-700 mb-2">Term</label>
          <select
            id={`circular-${entryType.toLowerCase()}-term`}
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.term_name} {t.is_current ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 border-b text-left">Student</th>
              <th className="px-4 py-2 border-b text-left">Class</th>
              <th className="px-4 py-2 border-b text-left">Subject</th>
              <th className="px-4 py-2 border-b text-left">BOT Mark</th>
              <th className="px-4 py-2 border-b text-left">{entryType} Mark</th>
              <th className="px-4 py-2 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((student) => (
              <tr key={student.enrollment_id} className="border-b">
                <td className="px-4 py-2 font-medium">{student.name}</td>
                <td className="px-4 py-2">{student.class_name}</td>
                <td className="px-4 py-2">
                  <select
                    aria-label={`Circular ${entryType} subject`}
                    className="border rounded px-2 py-1 subject-select"
                    data-student-id={student.enrollment_id}
                  >
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="border rounded px-2 py-1 w-20 bot-input"
                    placeholder="BOT"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`border rounded px-2 py-1 w-20 ${isEOT ? 'eot-input' : 'mot-input'}`}
                    placeholder={`${entryType}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={(event) => handleSave(student.enrollment_id, event)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
