"use client";

import React, { useEffect, useRef, useState } from 'react'
import { Upload, FileText, Image, Check, RefreshCw, Folder, HardDrive, Trash2 } from 'lucide-react'
import { HeroSection } from '@/components/HeroSection'
import {
  formatStoragePercent,
  getUploadMetrics,
  getUploadProgressPercent,
  getVisibleStoragePercent,
} from '@/lib/upload-metrics'

interface SignatureSlot {
  slot_key: string
  label: string
  uploaded: boolean
  public_url: string | null
  size: number
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  updated_at: string | null
  public_url: string | null
  status: 'uploading' | 'done' | 'error'
  progress: number
  category: string
  targetLabel?: string
  targetSlotKey?: string
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const ACCEPTED_SIGNATURE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const categories = ['Signatures', 'Stamps', 'Branding', 'Documents', 'Other']

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const STORAGE_REFERENCE_BYTES = 1024 * 1024 * 1024

export default function UploadClient({ initialFiles, initialError = null }: { initialFiles: UploadedFile[]; initialError?: string | null }) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles.map(f => ({ ...f, status: 'done', progress: 100, category: f.category || 'Documents' })))
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('Documents')
  const [signatureSlots, setSignatureSlots] = useState<SignatureSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [documentError, setDocumentError] = useState<string | null>(initialError)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const [signatureSlotsLoaded, setSignatureSlotsLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadSignatures = async () => {
      try {
        const response = await fetch('/api/signatures')
        const result = await response.json()
        if (!response.ok || !Array.isArray(result?.data)) {
          throw new Error(result?.error || 'Unable to load signature and stamp storage.')
        }

        setSignatureSlots(result.data)
        setSelectedSlot((current) => current || result.data[0]?.slot_key || '')
        setSignatureError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load signature and stamp storage.'
        setSignatureError(message)
      } finally {
        setSignatureSlotsLoaded(true)
      }
    }

    void loadSignatures()
  }, [])

  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('/api/documents')
      const data = await response.json()
      if (!response.ok || !Array.isArray(data?.data)) {
        throw new Error(data?.error || 'Unable to load documents.')
      }

      const storedDocuments = data.data.map((item: UploadedFile) => ({
        ...item,
        status: 'done' as const,
        progress: 100,
        category: ['Branding', 'Documents', 'Other'].includes(item.category) ? item.category : 'Documents',
      }))
      setFiles((current) => {
        const activeOrLocalAssets = current.filter((file) =>
          file.status === 'uploading' || file.status === 'error' || file.category === 'Signatures' || file.category === 'Stamps'
        )
        const storedIds = new Set(storedDocuments.map((file: UploadedFile) => file.id))
        return [...storedDocuments, ...activeOrLocalAssets.filter((file) => !storedIds.has(file.id))]
      })
      setDocumentError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load documents.'
      setDocumentError(message)
      throw error
    }
  }

  const uploadFile = async (file: File, localId: string, currentCategory: string) => {
    const isSignature = currentCategory === 'Signatures' || currentCategory === 'Stamps'
    const slotKey = currentCategory === 'Stamps' ? 'school-stamp' : selectedSlot
    const formData = new FormData()
    formData.append('file', file)
    if (!isSignature) formData.append('category', currentCategory)

    if (isSignature) {
      if (!slotKey || !signatureSlots.some((slot) => slot.slot_key === slotKey)) {
        alert("Please select a signature role first.")
        setFiles(current => current.filter(f => f.id !== localId))
        return Promise.reject(new Error("No signature role selected"))
      }
      formData.append('slot_key', slotKey)
    }

    return new Promise<void>(async (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', isSignature ? '/api/signatures/upload' : '/api/documents/upload', true)

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const progress = getUploadProgressPercent(event.loaded, event.total)
        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, progress } : item)))
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let payload: any
          try {
            payload = JSON.parse(xhr.responseText)
          } catch {
            setFiles((current) => current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item)))
            reject(new Error('Upload response could not be verified.'))
            return
          }

          if (isSignature) {
            if (payload?.data?.slot_key !== slotKey || typeof payload?.data?.public_url !== 'string' || !payload.data.public_url.trim() || !Number.isFinite(payload?.data?.size)) {
              setFiles((current) => current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item)))
              reject(new Error('The server did not confirm the selected signature or stamp upload.'))
              return
            }

            const slot = signatureSlots.find((item) => item.slot_key === slotKey)
            const label = slot?.label ?? slotKey
            setSignatureSlots((current) => current.map((item) => item.slot_key === slotKey
              ? { ...item, uploaded: true, public_url: payload.data.public_url, size: payload.data.size }
              : item))
            setFiles((current) => current.map((item) => item.id === localId
              ? { ...item, status: 'done', progress: 100, public_url: payload.data.public_url, targetLabel: label, updated_at: 'Imported just now' }
              : item))
          } else {
            setFiles((current) => current.map((item) => item.id === localId
              ? { ...item, status: 'done', progress: 100, updated_at: 'Uploaded just now' }
              : item))
            try {
              await loadUploadedFiles()
            } catch (error) {
              alert(error instanceof Error
                ? `Upload completed, but the file list could not refresh: ${error.message}`
                : 'Upload completed, but the file list could not refresh.')
            }
          }
          resolve()
          return
        }

        let errorMessage = 'Upload failed.'
        try {
          const body = JSON.parse(xhr.responseText)
          if (body?.error) errorMessage = body.error
        } catch {}

        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item)))
        reject(new Error(errorMessage))
      }

      xhr.onerror = () => {
        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item)))
        reject(new Error('Upload failed.'))
      }

      xhr.send(formData)
    })
  }

  const handleFiles = (fileList: FileList) => {
    if ((category === 'Signatures' || category === 'Stamps') && !signatureSlotsLoaded) {
      alert('Signature and stamp slots are still loading. Please try again in a moment.')
      return
    }

    const selectedFiles = Array.from(fileList)
    const acceptedTypes = category === 'Signatures' || category === 'Stamps'
      ? ACCEPTED_SIGNATURE_TYPES
      : ACCEPTED_TYPES

    selectedFiles.forEach((file) => {
      if (!acceptedTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type.`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} must be smaller than 10MB.`)
        return
      }

      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setFiles((current) => [
        {
          id: localId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          updated_at: 'Just now',
          public_url: null,
          status: 'uploading',
          progress: 0,
          category,
          targetSlotKey: category === 'Stamps' ? 'school-stamp' : category === 'Signatures' ? selectedSlot : undefined,
        },
        ...current,
      ])

      uploadFile(file, localId, category).catch((err) => {
        alert(err instanceof Error ? err.message : 'Upload failed.')
      })
    })
  }

  const removeFile = async (id: string, name: string) => {
    const fileToDelete = files.find((file) => file.id === id)
    if (fileToDelete?.category === 'Signatures' || fileToDelete?.category === 'Stamps') return
    if (!window.confirm(`Delete ${name}?`)) return

    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete file.')
      }

      setFiles((current) => current.filter((file) => file.id !== id))
      await loadUploadedFiles()
    } catch (err: any) {
      alert(err.message || 'Failed to delete file.')
    }
  }

  const metrics = getUploadMetrics(files, signatureSlots)
  const storageBarPercent = getVisibleStoragePercent(metrics.totalBytes, STORAGE_REFERENCE_BYTES)
  const categoryCounts = metrics.categoryCounts
  const storagePercentLabel = formatStoragePercent(metrics.totalBytes, STORAGE_REFERENCE_BYTES)
  const loadError = [documentError, signatureError].filter(Boolean).join(' ')
  const totalFilesDisplay = signatureSlotsLoaded ? metrics.totalFiles : '…'
  const storageDisplay = signatureSlotsLoaded ? formatSize(metrics.totalBytes) : '…'
  const signatureCountDisplay = signatureSlotsLoaded ? metrics.signatureCount : '…'

  return (
    <div className="space-y-6 w-full pb-12">
      <HeroSection
        title="Upload Center"
        subtitle="Manage school documents, logos, stamps, and branding assets in one place."
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        {loadError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            <span>Some storage counts may be incomplete: {loadError}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100"
            >
              Refresh counts
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Files', value: totalFilesDisplay, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
            { label: 'Storage Used', value: storageDisplay, color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
            { label: 'Signatures', value: signatureCountDisplay, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Documents', value: categoryCounts.Documents, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                <HardDrive className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap text-sm font-semibold ${
                    category === cat 
                      ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {category === 'Signatures' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <label className="block text-sm font-semibold text-amber-900 mb-2">Select Signature Role:</label>
                <select 
                  value={selectedSlot}
                  onChange={e => setSelectedSlot(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {signatureSlots.map(slot => (
                    <option key={slot.slot_key} value={slot.slot_key}>
                      {slot.label} {slot.uploaded ? '(Uploaded ✓)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-700 mt-2">Any image dropped below will be assigned to this role and appear on the corresponding report cards.</p>
              </div>
            )}
            {category === 'Stamps' && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Uploading here replaces the official school stamp used on reports.
              </div>
            )}

            <div
              className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all min-h-[200px] ${
                dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                if (event.dataTransfer.files.length) {
                  handleFiles(event.dataTransfer.files)
                }
              }}
              onClick={() => fileRef.current?.click()}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dragOver ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Upload className={`w-8 h-8 ${dragOver ? 'text-emerald-500' : 'text-slate-400'}`} />
              </div>
              <p className="text-base font-semibold text-slate-700">
                Drop files here or <span className="text-emerald-600">click to browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">PNG, JPG, PDF · Max 10MB per file</p>
              <p className="text-xs text-slate-500 mt-2">Category: <strong className="text-emerald-800">{category}</strong></p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                aria-label="Select files to upload"
                onChange={(event) => event.target.files && handleFiles(event.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Uploaded Files</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        file.type.startsWith('image') ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'
                      }`}>
                        {file.type.startsWith('image') ? (
                          <Image className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">{file.category}</span>
                          <span className="text-xs text-slate-400">{formatSize(file.size)} · {file.updated_at ?? 'Uploaded'}</span>
                        </div>
                        {file.status === 'done' && (file.category === 'Signatures' || file.category === 'Stamps') && (
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Imported: {file.targetLabel ?? 'signature slot'}
                          </p>
                        )}
                        {file.status === 'uploading' && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${file.progress}%` }} />
                            </div>
                            <span className="text-[11px] font-medium text-slate-500">{file.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'done' && <Check className="w-4 h-4 text-emerald-500" />}
                        {file.status === 'uploading' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                        {file.category !== 'Signatures' && file.category !== 'Stamps' && (
                          <button
                            onClick={() => removeFile(file.id, file.name)}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title={`Delete ${file.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-800 uppercase tracking-wide">File categories</h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const count = !signatureSlotsLoaded && (cat === 'Signatures' || cat === 'Stamps')
                    ? '…'
                    : categoryCounts[cat as keyof typeof categoryCounts]
                  return (
                    <div key={cat} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <Folder className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-slate-700">{cat}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        typeof count === 'number' && count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-md">
              <h3 className="mb-1 text-sm font-bold tracking-wide">Tracked storage</h3>
              <p className="text-xs text-emerald-100 mb-1 font-medium">{storageDisplay} / 1 GB reference</p>
              <p className="text-[10px] text-emerald-200 mb-4">Project storage quota is not available from this screen.</p>
              <div className="h-2 rounded-full overflow-hidden bg-emerald-900/50">
                <div
                  role="progressbar"
                  aria-label="Tracked storage compared with 1 GB reference"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Number(((metrics.totalBytes / STORAGE_REFERENCE_BYTES) * 100).toFixed(2)))}
                  aria-busy={!signatureSlotsLoaded}
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: signatureSlotsLoaded ? `${storageBarPercent}%` : '0%' }}
                />
              </div>
              <p className="text-[11px] text-emerald-200 mt-2 font-medium">
                {signatureSlotsLoaded ? storagePercentLabel : 'Loading tracked assets…'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
