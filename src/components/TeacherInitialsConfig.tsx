"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function TeacherInitialsConfig() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [initials, setInitials] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  
  const levels = [
    { id: 'nursery', label: 'Nursery' },
    { id: 'lower_primary', label: 'Lower Primary' },
    { id: 'upper_primary', label: 'Upper Primary' }
  ]
  const [activeLevel, setActiveLevel] = useState('nursery')
  const [targetScope, setTargetScope] = useState<'section' | 'class'>('section')
  const [activeClassId, setActiveClassId] = useState<string>('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [subRes, initRes, classRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/settings/initials'),
          fetch('/api/classes')
        ])
        const subData = await subRes.json()
        const initData = await initRes.json()
        const classData = await classRes.json()
        
        if (subRes.ok) setSubjects(subData.data || [])
        if (classRes.ok) setClasses(classData.data || [])
        
        if (initRes.ok) {
          const map: Record<string, string> = {}
          initData.data?.forEach((item: any) => {
            const classKey = item.class_id ? `_${item.class_id}` : ''
            map[`${item.level}_${item.subject_id}${classKey}`] = item.initials
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

  const availableClasses = classes.filter(c => c.section === activeLevel)

  useEffect(() => {
    if (targetScope === 'class' && availableClasses.length > 0) {
      if (!activeClassId || !availableClasses.find(c => c.id === activeClassId)) {
        setActiveClassId(availableClasses[0].id)
      }
    }
  }, [targetScope, activeLevel, availableClasses, activeClassId])

  // teacher initials ONLY apply to secular subjects
  const visibleSubjects = subjects.filter(s => s.section === activeLevel && s.curriculum === 'secular')

  const handleSaveAll = async () => {
    const classIdPayload = targetScope === 'class' ? activeClassId : null
    
    if (targetScope === 'class' && !activeClassId) {
      toast.error('Please select a class first')
      return
    }

    const updates = Object.entries(pendingChanges).map(([key, value]) => {
      // key is like `${activeLevel}_${sub.id}${classKey}`
      // but we actually need to know the subject_id
      // It's easier to just parse the subject ID out of the key, but we know the activeLevel and classKey.
      // A better way: just pass the subject_id directly in pendingChanges.
      return { key, value }
    })

    if (updates.length === 0) {
      toast.info('No changes to save')
      return
    }

    setIsSaving(true)
    let hasError = false
    try {
      await Promise.all(
        Object.entries(pendingChanges).map(async ([subjectId, value]) => {
          const res = await fetch('/api/settings/initials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: activeLevel,
              subject_id: subjectId,
              class_id: classIdPayload,
              initials: value
            })
          })
          if (!res.ok) throw new Error("Failed to save")
        })
      )
      
      const classKey = classIdPayload ? `_${classIdPayload}` : ''
      const newInitials = { ...initials }
      for (const [subjectId, value] of Object.entries(pendingChanges)) {
        newInitials[`${activeLevel}_${subjectId}${classKey}`] = value
      }
      setInitials(newInitials)
      setPendingChanges({})
      toast.success('Changes saved successfully')
    } catch (err: any) {
      toast.error('Failed to save some changes')
      hasError = true
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Teacher Initials</h2>
        <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Configure the initials that appear on report cards per subject.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {levels.map(lvl => (
            <button
              key={lvl.id}
              onClick={() => {
                setActiveLevel(lvl.id)
                setPendingChanges({}) // clear pending changes when switching level
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeLevel === lvl.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving || Object.keys(pendingChanges).length === 0}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={() => {
              setTargetScope('section')
              setPendingChanges({}) // clear pending on scope change
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              targetScope === 'section' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entire Section
          </button>
          <button
            onClick={() => {
              setTargetScope('class')
              setPendingChanges({}) // clear pending on scope change
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              targetScope === 'class' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Specific Class
          </button>
        </div>

        {targetScope === 'class' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Select Class:</span>
            <select
              value={activeClassId}
              onChange={(e) => {
                setActiveClassId(e.target.value)
                setPendingChanges({}) // clear pending on class change
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {availableClasses.length === 0 ? (
                <option value="">No classes found</option>
              ) : (
                availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.class_name}</option>
                ))
              )}
            </select>
          </div>
        )}
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
            {visibleSubjects.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No subjects found for this section.
                </td>
              </tr>
            ) : visibleSubjects.map(sub => {
              const classKey = (targetScope === 'class' && activeClassId) ? `_${activeClassId}` : ''
              const savedVal = initials[`${activeLevel}_${sub.id}${classKey}`] || ''
              const currentVal = pendingChanges[sub.id] !== undefined ? pendingChanges[sub.id] : savedVal
              
              return (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{sub.subject_name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => {
                        setPendingChanges(prev => ({ ...prev, [sub.id]: e.target.value }))
                      }}
                      placeholder={targetScope === 'class' ? "Override Initials..." : "e.g. MK"}
                      className="w-full max-w-[140px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase placeholder:normal-case"
                      maxLength={5}
                      disabled={targetScope === 'class' && !activeClassId}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
