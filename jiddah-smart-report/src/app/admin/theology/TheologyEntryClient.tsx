'use client'

import { useEffect, useState, type MouseEvent } from 'react'

type StudentData = {
  id: string
  name: string
  class_name: string
}

type EntryType = 'MOT' | 'EOT'

interface TheologyEntryClientProps {
  students: StudentData[]
  entryType: EntryType
}

const THEOLOGY_SUBJECTS = ['Quran', 'Fiqh', 'Tarbiya', 'Arabic']

export default function TheologyEntryClient({ students, entryType }: TheologyEntryClientProps) {
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    setYear(String(new Date().getFullYear()))
  }, [])

  const actionName = entryType === 'EOT' ? 'save-theology-eot' : 'save-theology-mot'
  const scoreField = entryType === 'EOT' ? 'eot_score' : 'mot_score'
  const inputClass = entryType === 'EOT' ? 'theology-eot-input' : 'theology-mot-input'

  const handleSave = async (studentId: string, event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const row = button.closest('tr')
    if (!row) {
      alert('Unable to locate student row.')
      return
    }

    const inputs = Array.from(row.querySelectorAll<HTMLInputElement>(`.${inputClass}`))
    const payloads = inputs
      .map((input) => ({ subject: input.dataset.subject, score: input.value }))
      .filter((item) => item.subject && item.score !== '')

    if (!studentId || !term || !year) {
      alert('Please select term and year.')
      return
    }

    if (payloads.length === 0) {
      alert('Enter at least one theology score to save.')
      return
    }

    try {
      for (const payloadItem of payloads) {
        const payload = {
          student_id: studentId,
          subject: payloadItem.subject,
          [scoreField]: Number(payloadItem.score),
          term,
          year: Number(year),
        }

        const response = await fetch('/api/theology-results', {
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

      alert(entryType === 'EOT' ? 'Theology EOT scores saved successfully' : 'Theology MOT scores saved successfully')
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
          <label htmlFor={`theology-${entryType.toLowerCase()}-year`} className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <input
            id={`theology-${entryType.toLowerCase()}-year`}
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
              {THEOLOGY_SUBJECTS.map((subject) => (
                <th key={subject} className="px-4 py-2 border-b text-left">{subject} {entryType}</th>
              ))}
              <th className="px-4 py-2 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b">
                <td className="px-4 py-2 font-medium">{student.name}</td>
                <td className="px-4 py-2">{student.class_name}</td>
                {THEOLOGY_SUBJECTS.map((subject) => (
                  <td key={subject} className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      data-subject={subject}
                      className={`border rounded px-2 py-1 w-20 ${inputClass}`}
                      placeholder="0-100"
                    />
                  </td>
                ))}
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
