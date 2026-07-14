"use client";

import React, { useEffect, useRef, useState } from 'react'
import { Upload, Check, AlertCircle, RefreshCw, Trash2, Eye, HardDrive } from 'lucide-react'
import { HeroSection } from '@/components/HeroSection'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function SignaturesClient({ initialSlots }: { initialSlots: any[] }) {
  const [slots, setSlots] = useState(initialSlots)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  const refetch = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/signatures')
      const data = await response.json()
      if (response.ok) {
        setSlots(data.data)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previews])

  const uploadSignature = async (slotKey: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('slot_key', slotKey)

    const response = await fetch('/api/signatures/upload', {
      method: 'POST',
      body: formData,
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'Signature upload failed.')
    }
    return payload.data
  }

  const handleFileChange = async (slotKey: string, file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Please upload a PNG, JPG, or WEBP image.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('Signature must be smaller than 5MB.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPreviews((current) => ({ ...current, [slotKey]: previewUrl }))
    setUploadingSlot(slotKey)

    try {
      await uploadSignature(slotKey, file)
      await refetch()
    } catch (err: any) {
      alert(err.message || 'Upload failed.')
    } finally {
      setUploadingSlot(null)
      setPreviews((current) => {
        const next = { ...current }
        const url = next[slotKey]
        if (url) {
          URL.revokeObjectURL(url)
        }
        delete next[slotKey]
        return next
      })
    }
  }

  const handleFileSelection = (slotKey: string, slotUploaded: boolean, file: File) => {
    if (slotUploaded && !window.confirm('Replace the existing signature?')) {
      return
    }
    handleFileChange(slotKey, file)
  }

  const uploadedCount = slots.filter((slot) => slot.uploaded).length
  const requiredCount = slots.filter((slot) => slot.required).length
  const uploadedRequired = slots.filter((slot) => slot.required && slot.uploaded).length
  const hasAnyUpload = slots.some((slot) => slot.uploaded)

  return (
    <div className="space-y-6 w-full pb-12">
      <HeroSection
        title="Signatures & Stamps"
        subtitle="Manage signature and stamp assets for official documents."
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 mb-6">
            {error}
          </div>
        ) : null}

        {!loading && !hasAnyUpload && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 mb-6">
            <p className="font-semibold text-slate-900">No signatures uploaded yet.</p>
            <p className="mt-2">
              Upload your official signature and stamp images so reports can include authenticated branding. Use the upload card for each slot to preview the file before it is saved.
            </p>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="grid gap-5 md:grid-cols-3 mb-6">
              {[
                { label: 'Total Uploaded', value: `${uploadedCount}/${slots.length}`, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { label: 'Required Uploads', value: `${uploadedRequired}/${requiredCount}`, color: uploadedRequired < requiredCount ? '#EF4444' : '#10B981', bg: uploadedRequired < requiredCount ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' },
                { label: 'Storage Used', value: 'Calculated on Supabase', color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: bg }}>
                    <HardDrive className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">{label}</p>
                    <p className="mt-2 text-xl font-semibold" style={{ color }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              {slots.map((slot) => {
                const previewUrl = previews[slot.slot_key] ?? slot.public_url
                const isUploading = uploadingSlot === slot.slot_key

                return (
                  <div key={slot.slot_key} className="rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between bg-slate-50 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-slate-900">{slot.label}</h3>
                          {slot.required && (
                            <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">Required</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{slot.description}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${slot.uploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {slot.uploaded ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {slot.uploaded ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>

                    <div className="p-5 bg-white">
                      <div className="rounded-3xl overflow-hidden border border-dashed border-slate-200 bg-slate-50 min-h-[160px] mb-4">
                        {previewUrl ? (
                          <img src={previewUrl} alt={`${slot.label} preview`} className="w-full h-full object-contain p-4 max-h-[200px]" />
                        ) : (
                          <div
                            className="h-full w-full flex flex-col items-center justify-center gap-2 text-center p-6 min-h-[160px]"
                            onDragOver={(e) => { e.preventDefault(); setDragOver(slot.slot_key) }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setDragOver(null)
                              const file = e.dataTransfer.files?.[0]
                              if (file) handleFileSelection(slot.slot_key, slot.uploaded, file)
                            }}
                          >
                            <div className="rounded-full bg-slate-200/50 p-3 mb-2 text-slate-400">
                              <Upload className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                              <span className="text-[#065F46]">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-400">PNG, JPG, or WEBP (max. 5MB)</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept={ACCEPTED_TYPES.join(',')}
                          className="hidden"
                          id={`file-${slot.slot_key}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelection(slot.slot_key, slot.uploaded, file)
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        <label
                          htmlFor={`file-${slot.slot_key}`}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                          } ${
                            slot.uploaded
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-[#065F46] text-white hover:bg-[#047857]'
                          }`}
                        >
                          {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {slot.uploaded ? 'Replace Image' : 'Upload Image'}
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900 uppercase tracking-wide">Signature Guidelines</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-none rounded-full bg-emerald-100 p-1 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>Use high-resolution scans on plain white or transparent backgrounds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-none rounded-full bg-emerald-100 p-1 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>Crop closely around the signature or stamp to remove excess whitespace.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-none rounded-full bg-emerald-100 p-1 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>Ensure stamps are legible and straight before uploading.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex-none rounded-full bg-rose-100 p-1 text-rose-600">
                    <AlertCircle className="h-3 w-3" />
                  </span>
                  <span>Avoid uploading photos with shadows or uneven lighting.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
