import { useEffect, useRef, useState } from 'react'
import { Upload, FileText, Image, Check, RefreshCw, Folder, HardDrive, Trash2 } from 'lucide-react'
import { HeroSection } from '@/components/HeroSection'
import { api } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { toast } from 'sonner'
import { getCsrfToken } from '@/lib/csrf'

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

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('Documents')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadUploadedFiles = async () => {
    try {
      const response = await api.get<{ data: UploadedFile[] }>(ENDPOINTS.documents)
      setFiles(response.data.map((item) => ({ ...item, status: 'done' as const, progress: 100, category: 'Documents' })))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load documents.')
    }
  }

  useEffect(() => {
    loadUploadedFiles()
  }, [])

  const uploadFile = async (file: File, localId: string) => {
    const formData = new FormData()
    formData.append('file', file)

    return new Promise<void>(async (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', ENDPOINTS.documentsUpload, true)
      xhr.withCredentials = true
      const csrfToken = await getCsrfToken()
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken)
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const progress = Math.round((event.loaded / event.total) * 100)
        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, progress } : item)))
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((current) => current.filter((item) => item.id !== localId))
          await loadUploadedFiles()
          toast.success(`Uploaded ${file.name}`)
          resolve()
          return
        }

        let errorMessage = 'Upload failed.'
        try {
          const body = JSON.parse(xhr.responseText)
          if (body?.error) errorMessage = body.error
        } catch {
          // ignore parse error
        }

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
        },
        ...current,
      ])

      uploadFile(file, localId).catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Upload failed.')
      })
    })
  }

  const removeFile = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return

    setFiles((current) => current.filter((file) => file.id !== id))
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(ENDPOINTS.documents, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ fileName: name }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete file.')
      }

      toast.success('File deleted successfully.')
      await loadUploadedFiles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file.')
    }
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0)

  return (
    <div className="space-y-6">
      <HeroSection
        title="Upload Center"
        subtitle="Manage school documents, logos, stamps, and branding assets in one place."
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Files', value: files.length, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Storage Used', value: formatSize(totalSize), color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Signatures', value: files.filter((f) => f.category === 'Signatures').length, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Documents', value: files.filter((f) => f.category === 'Documents').length, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <HardDrive className="w-4 h-4" style={{ color }} />
            </div>
            <p style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: category === cat ? '#065F46' : 'white',
                  color: category === cat ? 'white' : '#6B7280',
                  border: category === cat ? 'none' : '1px solid #E5E7EB',
                  fontSize: '13px',
                  fontWeight: category === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? '#10B981' : '#E5E7EB',
              background: dragOver ? 'rgba(16,185,129,0.03)' : 'white',
              minHeight: '200px',
            }}
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: dragOver ? 'rgba(16,185,129,0.15)' : '#F3F4F6' }}>
              <Upload className="w-8 h-8" style={{ color: dragOver ? '#10B981' : '#9CA3AF' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>
              Drop files here or <span style={{ color: '#10B981' }}>click to browse</span>
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>PNG, JPG, PDF · Max 10MB per file</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Category: <strong style={{ color: '#065F46' }}>{category}</strong></p>
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
            <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                <h3 className="text-sm font-semibold text-slate-900">Uploaded Files</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: file.type.startsWith('image') ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)' }}>
                      {file.type.startsWith('image') ? (
                        <Image className="w-5 h-5" style={{ color: '#10B981' }} />
                      ) : (
                        <FileText className="w-5 h-5" style={{ color: '#6366F1' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full px-1.5 py-0.5 text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>{file.category}</span>
                        <span className="text-xs text-slate-500">{formatSize(file.size)} · {file.updated_at ?? 'Uploaded'}</span>
                      </div>
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                            <div className="h-full rounded-full" style={{ width: `${file.progress}%`, background: '#10B981' }} />
                          </div>
                          <span className="text-[11px] text-slate-500">{file.progress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'done' && <Check className="w-4 h-4" style={{ color: '#10B981' }} />}
                      {file.status === 'uploading' && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#F59E0B' }} />}
                      <button
                        onClick={() => removeFile(file.id, file.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                        aria-label={`Delete ${file.name}`}
                        title={`Delete ${file.name}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">File categories</h3>
            {categories.map((cat) => {
              const count = files.filter((file) => file.category === cat).length
              return (
                <div key={cat} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4" style={{ color: '#F59E0B' }} />
                    <span className="text-sm text-slate-900">{cat}</span>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: count > 0 ? 'rgba(16,185,129,0.1)' : '#F3F4F6', color: count > 0 ? '#065F46' : '#9CA3AF' }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #065F46, #047857)' }}>
            <h3 className="text-white mb-1 text-sm font-semibold">Storage quota</h3>
            <p className="text-[12px] text-white/80 mb-4">Total used: {formatSize(totalSize)} / 1 GB</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: `${(totalSize / (1024 * 1024 * 1024)) * 100}%`, background: '#F59E0B' }} />
            </div>
            <p className="text-[11px] text-white/80 mt-2">{((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(2)}% used</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
