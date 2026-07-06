'use client'

import { useEffect, useState, type MouseEvent } from 'react'

type EnrollmentData = {
  enrollment_id: string
  name: string
  class_name: string
}

type TermData = { id: string; term_name: string; is_current: boolean }
type SubjectData = { id: string; subject_name_arabic: string }

type EntryType = 'MOT' | 'EOT'

interface TheologyEntryClientProps {
  enrollments: EnrollmentData[]
  terms: TermData[]
  subjects: SubjectData[]
  entryType: EntryType
}

export default function TheologyEntryClient({ enrollments, terms, subjects, entryType }: TheologyEntryClientProps) {
  const [termId, setTermId] = useState('')

  useEffect(() => {
    const activeTerm = terms.find(t => t.is_current)
    if (activeTerm) setTermId(activeTerm.id)
    else if (terms.length > 0) setTermId(terms[0].id)
  }, [terms])

  const isEOT = entryType === 'EOT'
  const inputClass = isEOT ? 'theology-eot-input' : 'theology-mot-input'

  const handleSave = async (enrollmentId: string, event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const row = button.closest('tr')
    if (!row) {
      alert('Unable to locate student row.')
      return
    }

    const inputs = Array.from(row.querySelectorAll<HTMLInputElement>(`.${inputClass}`))
    const payloads = inputs
      .map((input) => ({ subjectId: input.dataset.subjectId, score: input.value }))
      .filter((item) => item.subjectId && item.score !== '')

    if (!enrollmentId || !termId) {
      alert('Please select a term.')
      return
    }

    if (payloads.length === 0) {
      alert(`Enter at least one theology ${entryType} score to save.`)
      return
    }

    try {
      for (const payloadItem of payloads) {
        const payload: Record<string, unknown> = {
          enrollment_id: enrollmentId,
          subject_id: payloadItem.subjectId,
          term_id: termId,
          mot_score: !isEOT ? Number(payloadItem.score) : null,
          eot_score: isEOT ? Number(payloadItem.score) : null,
        }

        const response = await fetch('/api/theology-marks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const result = await response.json()
        if (!response.ok) {
          alert(result.error || 'Failed to save theology score')
          return
        }
      }

      alert(isEOT ? 'Theology EOT scores saved successfully' : 'Theology MOT scores saved successfully')
    } catch (err) {
      alert('Network error while saving theology scores')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`theology-${entryType.toLowerCase()}-term`} className="block text-sm font-medium text-gray-700 mb-2">Term</label>
          <select
            id={`theology-${entryType.toLowerCase()}-term`}
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
              {subjects.map((subject) => (
                <th key={subject.id} className="px-4 py-2 border-b text-left">{subject.subject_name_arabic} {entryType}</th>
              ))}
              <th className="px-4 py-2 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((student) => (
              <tr key={student.enrollment_id} className="border-b">
                <td className="px-4 py-2 font-medium">{student.name}</td>
                <td className="px-4 py-2">{student.class_name}</td>
                {subjects.map((subject) => (
                  <td key={subject.id} className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      data-subject-id={subject.id}
                      className={`border rounded px-2 py-1 w-20 ${inputClass}`}
                      placeholder={`${entryType}`}
                    />
                  </td>
                ))}
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
