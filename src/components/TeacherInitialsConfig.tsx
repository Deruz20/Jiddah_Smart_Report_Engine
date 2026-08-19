"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function TeacherInitialsConfig() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [initials, setInitials] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  
  const levels = [
    { id: 'nursery', label: 'Nursery' },
    { id: 'lower_primary', label: 'Lower Primary' },
    { id: 'upper_primary', label: 'Upper Primary' }
  ]
  const [activeLevel, setActiveLevel] = useState('nursery')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [subRes, initRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/settings/initials')
        ])
        const subData = await subRes.json()
        const initData = await initRes.json()
        
        if (subRes.ok) setSubjects(subData.data || [])
        
        if (initRes.ok) {
          const map: Record<string, string> = {}
          initData.data?.forEach((item: any) => {
            map[`${item.level}_${item.subject_id}`] = item.initials
          })
          setInitials(map)
        }
      } catch (err: any) {
        toast.error("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSave = async (subjectId: string, value: string) => {
    try {
      const res = await fetch('/api/settings/initials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: activeLevel,
          subject_id: subjectId,
          initials: value
        })
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Saved")
      setInitials(prev => ({ ...prev, [`${activeLevel}_${subjectId}`]: value }))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Teacher Initials</h2>
        <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Configure the initials that appear on report cards per subject.</p>
      </div>
      
      <div className="flex gap-2">
        {levels.map(lvl => (
          <button
            key={lvl.id}
            onClick={() => setActiveLevel(lvl.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeLevel === lvl.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Subject</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Teacher Initials</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {subjects.map(sub => (
              <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{sub.name}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={initials[`${activeLevel}_${sub.id}`] || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (initials[`${activeLevel}_${sub.id}`] || '')) {
                        handleSave(sub.id, e.target.value)
                      }
                    }}
                    placeholder="e.g. MK"
                    className="w-full max-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase"
                    maxLength={5}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
