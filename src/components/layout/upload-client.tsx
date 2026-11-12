"use client";

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image, Check, RefreshCw, Folder, HardDrive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { HeroSection } from '@/components/HeroSection'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import { SignatureInkReviewCard } from '@/components/SignatureInkReviewCard'

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
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const categories = ['Signatures', 'Stamps', 'Branding', 'Documents', 'Other']

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadClient({ initialFiles }: { initialFiles: UploadedFile[] }) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles.map(f => ({ ...f, status: 'done', progress: 100, category: 'Documents' })))
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('Documents')
  const [signatureSlots, setSignatureSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingSignatureFile, setPendingSignatureFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/signatures')
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setSignatureSlots(res.data)
          if (res.data.length > 0) setSelectedSlot(res.data[0].slot_key)
        }
      })
      .catch(console.error)
  }, [])

  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('/api/documents')
      const data = await response.json()
      if (response.ok) {
        setFiles(data.data.map((item: any) => ({ ...item, status: 'done' as const, progress: 100, category: 'Documents' })))
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to load documents.')
    }
  }

  const uploadFile = async (file: File, localId: string, currentCategory: string) => {
    const isSignature = currentCategory === 'Signatures'
    const formData = new FormData()
    formData.append('file', file)

    if (isSignature) {
      if (!selectedSlot) {
        toast.error("Please select a signature role first.")
        setFiles(current => current.filter(f => f.id !== localId))
        return Promise.reject(new Error("No signature role selected"))
      }
      formData.append('slot_key', selectedSlot)
    }

    return new Promise<void>(async (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', isSignature ? '/api/signatures/upload' : '/api/documents/upload', true)

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const progress = Math.round((event.loaded / event.total) * 100)
        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, progress } : item)))
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((current) => current.filter((item) => item.id !== localId))
          toast.success(`${file.name} uploaded successfully`)
          if (!isSignature) {
            await loadUploadedFiles()
          } else {
             fetch('/api/signatures').then(r => r.json()).then(res => {
               if (res.data) setSignatureSlots(res.data)
               router.refresh()
             }).catch(console.error)
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

  const startUploadFile = (file: File, currentCategory: string) => {
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
        category: currentCategory,
      },
      ...current,
    ])

    return uploadFile(file, localId, currentCategory).catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    })
  }

  const handleFiles = (fileList: FileList) => {
    const selectedFiles = Array.from(fileList)

    selectedFiles.forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} must be smaller than 10MB.`)
        return
      }

      if (category === 'Signatures' && file.type.startsWith('image/') && selectedSlot !== 'school-stamp') {
        setPendingSignatureFile(file)
        return
      }

      void startUploadFile(file, category)
    })
  }

  const removeFile = (id: string, name: string) => {
    setFileToDelete({ id, name })
  }

  const confirmRemoveFile = async () => {
    if (!fileToDelete) return
    const { id, name } = fileToDelete
    setDeleting(true)
    setFiles((current) => current.filter((file) => file.id !== id))
    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: name }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete file.')
      }

      toast.success(`${name} deleted successfully`)
      setFileToDelete(null)
      await loadUploadedFiles()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file.')
      await loadUploadedFiles()
    } finally {
      setDeleting(false)
    }
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0)

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full min-w-0 space-y-6 pb-16">
      <HeroSection
        title="Upload Center"
        subtitle="Manage official school documents, badges, signatures, stamps, and branding assets in one centralized repository."
        label="Storage & Assets"
      />

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Files', value: files.length, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'Storage Used', value: formatSize(totalSize), color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
          { label: 'Signatures', value: signatureSlots.filter(s => s.uploaded).length, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Documents', value: files.filter((f) => f.category === 'Documents').length, color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <HardDrive className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Asset category filter">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs font-bold cursor-pointer ${
                  category === cat 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {category === 'Signatures' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5">
                Select Signature Role:
              </label>
              <select 
                value={selectedSlot}
                onChange={e => setSelectedSlot(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-amber-500/30 text-[var(--text-primary)] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                {signatureSlots.map(slot => (
                  <option key={slot.slot_key} value={slot.slot_key}>
                    {slot.label} {slot.uploaded ? '(Uploaded ✓)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-2">
                Any image dropped below will be assigned to this role and appear on corresponding student report cards.
              </p>
            </div>
          )}

          {pendingSignatureFile && category === 'Signatures' && (
            <SignatureInkReviewCard
              file={pendingSignatureFile}
              targetLabel={signatureSlots.find((s) => s.slot_key === selectedSlot)?.label || selectedSlot}
              onCancel={() => setPendingSignatureFile(null)}
              onConfirmUpload={async (fileToUpload) => {
                setPendingSignatureFile(null)
                await startUploadFile(fileToUpload, 'Signatures')
              }}
            />
          )}

          {/* High-Contrast Responsive Dropzone */}
          <div
            className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all p-6 sm:p-10 ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/15'
                : 'border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)]'
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${dragOver ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
              <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)] text-center">
              Drop files here or <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
              PNG, JPG, WebP, PDF &bull; Max 10MB per file
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              Target category: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{category}</strong>
            </p>
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

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] shadow-xs border border-[var(--border)]">
              <div className="px-5 py-3.5 bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Uploaded Repository Files ({files.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3.5 px-4 sm:px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      file.type.startsWith('image') ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    }`}>
                      {file.type.startsWith('image') ? (
                        <Image className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[var(--bg-sunken)] border border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider">
                          {file.category}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{formatSize(file.size)} &bull; {file.updated_at ?? 'Uploaded'}</span>
                      </div>
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--bg-sunken)]">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${file.progress}%` }} />
                          </div>
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{file.progress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'done' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                      {file.status === 'uploading' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                      <button
                        onClick={() => removeFile(file.id, file.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Delete ${file.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary & Quota Cards */}
        <aside className="space-y-4">
          <div className="rounded-2xl p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
            <h3 className="mb-3 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Asset Categories
            </h3>
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const count = files.filter((file) => file.category === cat).length
                return (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{cat}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      count > 0
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25'
                        : 'bg-[var(--bg-sunken)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-md border border-emerald-800/50">
            <h3 className="text-xs font-bold tracking-wider uppercase text-emerald-300">Storage Quota</h3>
            <p className="text-sm font-extrabold text-white mt-1">Used: {formatSize(totalSize)} of 1 GB</p>
            <div className="h-2 rounded-full overflow-hidden bg-emerald-950/80 mt-3 border border-emerald-800/40">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(1, (totalSize / (1024 * 1024 * 1024)) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-200/90 mt-2 font-medium">
              {((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(2)}% consumed
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDestructiveDialog
        open={Boolean(fileToDelete)}
        title={`Delete ${fileToDelete?.name || 'File'}?`}
        description={`Are you sure you want to permanently delete "${fileToDelete?.name || ''}" from the school document repository?`}
        confirmLabel="Delete File"
        loading={deleting}
        onConfirm={confirmRemoveFile}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  )
}
