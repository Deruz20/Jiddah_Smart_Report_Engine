'use client'

import { useEffect, useState, type MouseEvent } from 'react'

type StudentData = {
  id: string
  name: string
  class_name: string
}

type EntryType = 'MOT' | 'EOT'

interface CircularEntryClientProps {
  students: StudentData[]
  entryType: EntryType
}

const SUBJECT_OPTIONS = ['English', 'Mathematics', 'Science', 'SST', 'Computer']

export default function CircularEntryClient({ students, entryType }: CircularEntryClientProps) {
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    setYear(String(new Date().getFullYear()))
  }, [])

  const isEOT = entryType === 'EOT'
  const actionName = isEOT ? 'save-circular-eot' : 'save-circular-mot'
  const payloadField = isEOT ? 'eot_mark' : 'mot_mark'

  const handleSave = async (studentId: string, event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const row = button.closest('tr')
    if (!row) {
      alert('Unable to locate student row.')
      return
    }

    const subjectSelect = row.querySelector<HTMLSelectElement>('.subject-select')
    const scoreInput = row.querySelector<HTMLInputElement>(isEOT ? '.eot-input' : '.mot-input')
    const teacherInput = isEOT ? row.querySelector<HTMLInputElement>('.teacher-input') : null

    const subject = subjectSelect?.value
    const score = scoreInput?.value
    const teacher = teacherInput?.value

    if (!studentId || !subject || !score || !term || !year) {
      alert('Please fill student, subject, mark, term, and year.')
      return
    }

    const payload: Record<string, unknown> = {
      student_id: studentId,
      subject,
      [payloadField]: Number(score),
      term,
      year: Number(year),
    }

    if (isEOT) {
      payload.teacher_initials = teacher || undefined
    }

    try {
      const response = await fetch('/api/circular-results', {
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
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div>
          <label htmlFor={`circular-${entryType.toLowerCase()}-year`} className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <input
            id={`circular-${entryType.toLowerCase()}-year`}
            type="number"
            value={year}
            min={2000}
            max={2100}
            onChange={(event) => setYear(event.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 border-b text-left">Student</th>
              <th className="px-4 py-2 border-b text-left">Class</th>
              <th className="px-4 py-2 border-b text-left">Subject</th>
              <th className="px-4 py-2 border-b text-left">{entryType} Mark</th>
              {isEOT && <th className="px-4 py-2 border-b text-left">Teacher</th>}
              <th className="px-4 py-2 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b">
                <td className="px-4 py-2 font-medium">{student.name}</td>
                <td className="px-4 py-2">{student.class_name}</td>
                <td className="px-4 py-2">
                  <select
                    aria-label={`Circular ${entryType} subject`}
                    className="border rounded px-2 py-1 subject-select"
                    data-student-id={student.id}
                  >
                    {SUBJECT_OPTIONS.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`border rounded px-2 py-1 w-20 ${isEOT ? 'eot-input' : 'mot-input'}`}
                    placeholder="0-100"
                  />
                </td>
                {isEOT && (
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-24 teacher-input"
                      placeholder="Initials"
                    />
                  </td>
                )}
                <td className="px-4 py-2">
                  <button
                    type="button"
                    data-action={actionName}
                    data-student-id={student.id}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={(event) => handleSave(student.id, event)}
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
