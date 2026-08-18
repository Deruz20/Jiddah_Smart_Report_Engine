'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Save, X } from 'lucide-react'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
  next_term_start?: string | null
  created_at?: string
}

export function TermsListClient({ initialTerms }: { initialTerms: TermData[] }) {
  const [terms, setTerms] = useState(initialTerms)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ start_date: string; end_date: string; next_term_start: string }>({
    start_date: '',
    end_date: '',
    next_term_start: ''
  })
  const router = useRouter()

  const handleSetActive = async (termId: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/settings/terms/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set active term')
      }
      
      // Update local state
      setTerms(terms.map(t => ({
        ...t,
        is_current: t.id === termId
      })))
      
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error setting active term')
    } finally {
      setIsUpdating(false)
    }
  }

  const startEditing = (term: TermData) => {
    setEditingId(term.id)
    setEditValues({
      start_date: term.start_date || '',
      end_date: term.end_date || '',
      next_term_start: term.next_term_start || ''
    })
  }

  const saveEditing = async (termId: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/settings/terms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termId,
          start_date: editValues.start_date || null,
          end_date: editValues.end_date || null,
          next_term_start: editValues.next_term_start || null
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save term dates')
      }

      setTerms(terms.map(t => t.id === termId ? { 
        ...t, 
        start_date: editValues.start_date, 
        end_date: editValues.end_date, 
        next_term_start: editValues.next_term_start 
      } : t))
      
      setEditingId(null)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving term dates')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Academic Terms (Terms Table)</h2>
        <p className="text-sm text-gray-600 mt-1">
          {terms.length} term{terms.length === 1 ? '' : 's'} configured
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                <th className="px-6 py-3">Term Info</th>
                <th className="px-6 py-3">Term Dates</th>
                <th className="px-6 py-3">Next Term Starts</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-gray-50 transition align-top">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{term.academic_year}</div>
                    <div className="text-sm text-gray-600">{term.label}</div>
                  </td>
                  
                  <td className="px-6 py-4 text-sm">
                    {editingId === term.id ? (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500">Start Date</label>
                        <input 
                          type="date" 
                          value={editValues.start_date}
                          onChange={(e) => setEditValues({...editValues, start_date: e.target.value})}
                          className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-emerald-500"
                        />
                        <label className="text-xs text-gray-500 mt-1">End Date</label>
                        <input 
                          type="date" 
                          value={editValues.end_date}
                          onChange={(e) => setEditValues({...editValues, end_date: e.target.value})}
                          className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col text-gray-700 gap-1">
                        <div><span className="text-gray-400 text-xs w-10 inline-block">Start:</span> {term.start_date || '—'}</div>
                        <div><span className="text-gray-400 text-xs w-10 inline-block">End:</span> {term.end_date || '—'}</div>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm">
                    {editingId === term.id ? (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500">Next Term Date</label>
                        <input 
                          type="date" 
                          value={editValues.next_term_start}
                          onChange={(e) => setEditValues({...editValues, next_term_start: e.target.value})}
                          className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="text-gray-700">{term.next_term_start || '—'}</div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {term.is_current ? (
                      <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-3">
                      {editingId === term.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditing(term.id)}
                            disabled={isUpdating}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={isUpdating}
                            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium"
                          >
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(term)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Edit2 size={14} /> Edit Dates
                        </button>
                      )}

                      {!term.is_current && (
                        <button
                          onClick={() => handleSetActive(term.id)}
                          disabled={isUpdating}
                          className="text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50 text-left"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {terms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No terms found in the terms table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
