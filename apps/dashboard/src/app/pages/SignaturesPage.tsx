import { useEffect, useRef, useState } from 'react'
import { Upload, Check, AlertCircle, RefreshCw, Trash2, Eye, HardDrive } from 'lucide-react'
import { HeroSection } from '@/components/HeroSection'
import { toast } from 'sonner'
import { useSignatures } from '@/hooks/useSignatures'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function SignaturesPage() {
  const { slots, loading, error, refetch, uploadSignature } = useSignatures()
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previews])

  const handleFileChange = async (slotKey: string, file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or WEBP image.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Signature must be smaller than 5MB.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPreviews((current) => ({ ...current, [slotKey]: previewUrl }))
    setUploadingSlot(slotKey)

    try {
      await uploadSignature(slotKey, file)
      toast.success('Signature uploaded successfully.')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
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

  const handleRemove = async (slotKey: string) => {
    if (!window.confirm('Remove this signature from the slot?')) return
    toast.info('Remove operation is not supported in storage yet.')
  }

  const uploadedCount = slots.filter((slot) => slot.uploaded).length
  const requiredCount = slots.filter((slot) => slot.required).length
  const uploadedRequired = slots.filter((slot) => slot.required && slot.uploaded).length
  const hasAnyUpload = slots.some((slot) => slot.uploaded)

  return (
    <div className="space-y-6">
      <HeroSection
        title="Signatures & Stamps"
        subtitle="Manage signature and stamp assets for official documents."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !hasAnyUpload && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
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
              <div key={label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)' }}>
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
                  <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
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

                  <div className="border-t border-slate-200 p-5">
                    <div className="rounded-3xl overflow-hidden border border-dashed border-slate-200 bg-slate-50 min-h-[160px] mb-4">
                      {previewUrl ? (
                        <img src={previewUrl} alt={`${slot.label} preview`} className="w-full h-full object-contain p-4" />
                      ) : (
                        <div
                          className="h-full w-full flex flex-col items-center justify-center gap-2 text-center p-6"
                          onDragOver={(e) => { e.preventDefault(); setDragOver(slot.slot_key) }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOver(null)
                            const file = e.dataTransfer.files[0]
                            if (file) {
                              handleFileSelection(slot.slot_key, slot.uploaded, file)
                            }
                          }}
                          style={{
                            borderStyle: 'dashed',
                            borderColor: dragOver === slot.slot_key ? '#10B981' : '#D1D5DB',
                            background: dragOver === slot.slot_key ? 'rgba(16,185,129,0.08)' : 'transparent',
                          }}
                        >
                          <Upload className="h-7 w-7 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700">Drag & drop image here</p>
                          <p className="text-sm text-slate-500">PNG, JPG, WEBP · max 5MB</p>
                        </div>
                      )}
                    </div>

                    <input
                      ref={(el) => { fileRefs.current[slot.slot_key] = el }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        handleFileSelection(slot.slot_key, slot.uploaded, file)
                      }}
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileRefs.current[slot.slot_key]?.click()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Upload className="h-4 w-4" />
                        {slot.uploaded ? 'Replace' : 'Upload'}
                      </button>
                      {slot.uploaded && (
                        <button
                          type="button"
                          onClick={() => setDragOver(previews[slot.slot_key] ? null : slot.slot_key)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          <Eye className="h-4 w-4" /> Preview
                        </button>
                      )}
                      {slot.uploaded && (
                        <button
                          type="button"
                          onClick={() => handleRemove(slot.slot_key)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      )}
                    </div>

                    {isUploading && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Uploading…
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload guide</p>
              <p className="mt-2 text-sm text-slate-500">Use the slots above to keep every signature in the correct position for reports.</p>
            </div>
            <HardDrive className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Preview before saving</p>
              <p className="mt-1">A local preview is generated immediately so you can confirm the correct image.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Accepted formats</p>
              <p className="mt-1">PNG, JPG, WEBP files under 5MB.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Replace safely</p>
              <p className="mt-1">If a slot already has a signature, you will be asked to confirm before replacing it.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
