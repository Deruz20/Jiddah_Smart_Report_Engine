"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Folder,
  FolderKanban,
  HardDrive,
  FileSignature,
  Stamp,
  Trash2,
  Eye,
  Wand2,
  Download,
  PenTool,
  Eraser,
  ExternalLink,
} from 'lucide-react'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { toast } from 'sonner'
import { HeroSection } from '@/components/HeroSection'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import { SignatureInkReviewCard } from '@/components/SignatureInkReviewCard'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import {
  getUploadMetrics,
  getUploadProgressPercent,
  getVisibleStoragePercent,
  formatStoragePercent,
} from '@/lib/upload-metrics'

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
  targetSlotKey?: string
}

export interface SignatureSlotAsset {
  slot_key: string
  label: string
  role: string
  description?: string
  required?: boolean
  public_url: string | null
  size?: number
  updated_at?: string | null
  uploaded: boolean
  active: boolean
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024 // 1 GB
const CATEGORIES = ['Signatures', 'Stamps', 'Branding', 'Documents', 'Other'] as const

const DRAW_INK_OPTIONS = [
  { label: 'Official Ink Navy', hex: '#1B3B8B' },
  { label: 'Archival Jet Black', hex: '#0F172A' },
  { label: 'Institutional Green', hex: '#0D5C3A' },
]

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function DigitalSignaturePad({
  targetLabel,
  saving,
  onSaveSignature,
}: {
  targetLabel: string
  saving: boolean
  onSaveSignature: (file: File) => Promise<void>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [inkColor, setInkColor] = useState('#1B3B8B')
  const [strokeWidth, setStrokeWidth] = useState(3.5)
  const [hasStrokes, setHasStrokes] = useState(false)

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    event.currentTarget.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    const pt = getCanvasPoint(event)
    lastPointRef.current = pt

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = inkColor
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, strokeWidth * 0.5, 0, Math.PI * 2)
    ctx.fill()
    setHasStrokes(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const prev = lastPointRef.current
    if (!canvas || !ctx || !prev) return

    const curr = getCanvasPoint(event)
    const midX = (prev.x + curr.x) / 2
    const midY = (prev.y + curr.y) / 2

    ctx.strokeStyle = inkColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
    ctx.lineTo(curr.x, curr.y)
    ctx.stroke()

    lastPointRef.current = curr
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) {
      toast.error('Please draw your signature before saving.')
      return
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      toast.error('Could not export signature image.')
      return
    }

    const file = new File([blob], `drawn-signature-${Date.now()}.png`, { type: 'image/png' })
    await onSaveSignature(file)
    handleClear()
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Digital Signature Pad — {targetLabel}
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Sign smoothly with mouse, stylus, or finger. Background is saved transparent cleanly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-2 py-1">
            {DRAW_INK_OPTIONS.map((opt) => (
              <button
                key={opt.hex}
                type="button"
                title={opt.label}
                aria-label={opt.label}
                onClick={() => setInkColor(opt.hex)}
                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                  inkColor === opt.hex ? 'scale-110 border-amber-400 shadow-xs' : 'border-white/70 opacity-80'
                }`}
                style={{ backgroundColor: opt.hex }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-1 text-[10px] font-bold">
            {[
              { label: 'Fine', width: 2.4 },
              { label: 'Medium', width: 3.5 },
              { label: 'Bold', width: 5.0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStrokeWidth(item.width)}
                className={`px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  strokeWidth === item.width
                    ? 'bg-emerald-600 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={920}
          height={280}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-44 sm:h-52 block cursor-crosshair select-none"
          style={{ touchAction: 'none' }}
          aria-label="Digital signature drawing canvas"
        />
        <div className="pointer-events-none absolute inset-x-10 bottom-10 border-b border-dotted border-slate-300" />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 select-none">
              Sign neatly above the dotted baseline
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasStrokes || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-45 cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear Canvas
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving Signature...' : 'Save Drawn Signature'}
        </button>
      </div>
    </div>
  )
}

export default function UploadClient({
  initialFiles,
  initialSignatureSlots = [],
}: {
  initialFiles: UploadedFile[]
  initialSignatureSlots?: SignatureSlotAsset[]
}) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>(
    initialFiles.map((f) => ({
      ...f,
      status: 'done' as const,
      progress: 100,
      category: f.category || 'Documents',
    }))
  )
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState<string>('Signatures')
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload')
  const [signatureSlots, setSignatureSlots] = useState<SignatureSlotAsset[]>(initialSignatureSlots)
  const [selectedSlot, setSelectedSlot] = useState<string>(() => {
    const firstNonStamp = initialSignatureSlots.find((s) => s.slot_key !== 'school-stamp')
    return firstNonStamp?.slot_key || initialSignatureSlots[0]?.slot_key || 'head-teacher'
  })
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null)
  const [slotToDelete, setSlotToDelete] = useState<SignatureSlotAsset | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [savingDrawn, setSavingDrawn] = useState(false)
  const [pendingSignatureFile, setPendingSignatureFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refreshSignatureSlots = async () => {
    try {
      const res = await fetch('/api/signatures').then((r) => r.json())
      if (Array.isArray(res?.data)) {
        setSignatureSlots(res.data)
        setSelectedSlot((current) => {
          if (
            current &&
            current !== 'school-stamp' &&
            res.data.some((s: SignatureSlotAsset) => s.slot_key === current)
          ) {
            return current
          }
          const firstNonStamp = res.data.find((s: SignatureSlotAsset) => s.slot_key !== 'school-stamp')
          return firstNonStamp?.slot_key || res.data[0]?.slot_key || ''
        })
      }
    } catch (err) {
      console.error('Failed to load signature slots:', err)
    }
  }

  useEffect(() => {
    void refreshSignatureSlots()
  }, [])

  // Backfill real byte sizes for uploaded signature assets if storage metadata omitted Content-Length
  useEffect(() => {
    const missingSizeSlots = signatureSlots.filter(
      (slot) => slot.uploaded && slot.public_url && (!slot.size || slot.size <= 0)
    )
    if (missingSizeSlots.length === 0) return

    let cancelled = false
    Promise.all(
      missingSizeSlots.map(async (slot) => {
        try {
          const headRes = await fetch(slot.public_url!, { method: 'HEAD' })
          const contentLength = Number(headRes.headers.get('content-length') || 0)
          return { slot_key: slot.slot_key, size: Number.isFinite(contentLength) ? contentLength : 0 }
        } catch {
          return { slot_key: slot.slot_key, size: 0 }
        }
      })
    ).then((sizes) => {
      if (cancelled) return
      const sizeMap = new Map(sizes.filter((entry) => entry.size > 0).map((e) => [e.slot_key, e.size]))
      if (sizeMap.size === 0) return
      setSignatureSlots((prev) =>
        prev.map((slot) =>
          sizeMap.has(slot.slot_key) ? { ...slot, size: sizeMap.get(slot.slot_key) } : slot
        )
      )
    })

    return () => {
      cancelled = true
    }
  }, [signatureSlots])

  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('/api/documents')
      const data = await response.json()
      if (response.ok && Array.isArray(data?.data)) {
        setFiles(
          data.data.map((item: any) => ({
            ...item,
            status: 'done' as const,
            progress: 100,
            category: item.category || 'Documents',
          }))
        )
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to load documents.')
    }
  }

  const uploadFile = async (
    file: File,
    localId: string,
    currentCategory: string,
    explicitSlotKey?: string
  ) => {
    const isSignatureAsset = currentCategory === 'Signatures' || currentCategory === 'Stamps'
    const resolvedSlotKey = explicitSlotKey || (currentCategory === 'Stamps' ? 'school-stamp' : selectedSlot)
    const formData = new FormData()
    formData.append('file', file)

    if (isSignatureAsset) {
      if (!resolvedSlotKey) {
        toast.error('Please select a signature role first.')
        setFiles((current) => current.filter((f) => f.id !== localId))
        return Promise.reject(new Error('No signature role selected'))
      }
      formData.append('slot_key', resolvedSlotKey)
    }

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', isSignatureAsset ? '/api/signatures/upload' : '/api/documents/upload', true)

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const progress = getUploadProgressPercent(event.loaded, event.total)
        setFiles((current) => current.map((item) => (item.id === localId ? { ...item, progress } : item)))
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((current) => current.filter((item) => item.id !== localId))
          toast.success(`${file.name} uploaded successfully`)
          if (!isSignatureAsset) {
            await loadUploadedFiles()
          } else {
            await refreshSignatureSlots()
            router.refresh()
          }
          resolve()
          return
        }

        let errorMessage = 'Upload failed.'
        try {
          const body = JSON.parse(xhr.responseText)
          if (body?.error) errorMessage = body.error
        } catch {}

        setFiles((current) =>
          current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item))
        )
        reject(new Error(errorMessage))
      }

      xhr.onerror = () => {
        setFiles((current) =>
          current.map((item) => (item.id === localId ? { ...item, status: 'error', progress: 0 } : item))
        )
        reject(new Error('Upload failed.'))
      }

      xhr.send(formData)
    })
  }

  const startUploadFile = (file: File, currentCategory: string, explicitSlotKey?: string) => {
    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const resolvedSlotKey = explicitSlotKey || (currentCategory === 'Stamps' ? 'school-stamp' : selectedSlot)
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
        targetSlotKey: currentCategory === 'Signatures' || currentCategory === 'Stamps' ? resolvedSlotKey : undefined,
      },
      ...current,
    ])

    return uploadFile(file, localId, currentCategory, explicitSlotKey).catch((err) => {
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
        headers: { 'Content-Type': 'application/json' },
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

  const confirmDeleteSignatureSlot = async () => {
    if (!slotToDelete) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/signatures?slot_key=${encodeURIComponent(slotToDelete.slot_key)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete signature slot.')
      }
      toast.success(`${slotToDelete.label} deleted cleanly`)
      setSlotToDelete(null)
      await refreshSignatureSlots()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete signature slot.')
    } finally {
      setDeleting(false)
    }
  }

  const reCleanSlot = async (slot: SignatureSlotAsset) => {
    if (!slot.public_url) return
    setSelectedSlot(slot.slot_key)
    setCategory('Signatures')
    setSignatureMode('upload')
    toast.info(`Loading ${slot.label} into Smart Ink Cleaner...`)
    try {
      const res = await fetch(slot.public_url)
      const blob = await res.blob()
      const file = new File([blob], `${slot.slot_key}.png`, { type: blob.type || 'image/png' })
      setPendingSignatureFile(file)
    } catch {
      toast.error('Unable to load existing signature image for re-cleaning.')
    }
  }

  const metrics = useMemo(() => getUploadMetrics(files, signatureSlots), [files, signatureSlots])
  const visibleQuotaPercent = getVisibleStoragePercent(metrics.totalBytes, STORAGE_QUOTA_BYTES)
  const quotaPercentText = formatStoragePercent(metrics.totalBytes, STORAGE_QUOTA_BYTES)

  const signatureRoleSlots = useMemo(
    () =>
      signatureSlots.filter(
        (slot) => slot.slot_key !== 'school-stamp' && slot.slot_key !== 'theology-teacher-p7'
      ),
    [signatureSlots]
  )

  const uploadedSignatureAssets = useMemo(
    () => signatureRoleSlots.filter((slot) => slot.uploaded && slot.public_url),
    [signatureRoleSlots]
  )

  const schoolStampSlot = useMemo(
    () => signatureSlots.find((slot) => slot.slot_key === 'school-stamp') || null,
    [signatureSlots]
  )

  const selectedSlotInfo = useMemo(
    () => signatureRoleSlots.find((slot) => slot.slot_key === selectedSlot) || signatureRoleSlots[0],
    [signatureRoleSlots, selectedSlot]
  )

  const filteredRepositoryFiles = useMemo(() => {
    if (category === 'Signatures' || category === 'Stamps') {
      return files.filter((file) => file.status === 'uploading' || file.category === category)
    }
    return files.filter((file) => file.category === category || category === 'Documents')
  }, [files, category])

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full min-w-0 space-y-5 pb-14">
      <HeroSection
        title="Upload Center"
        subtitle="Manage official signatures, digital ink stamps, branding assets, and school documents."
        label="Storage & Assets"
      />

      {/* Unified Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Files',
            value: metrics.totalFiles,
            color: '#10B981',
            bg: 'rgba(16,185,129,0.12)',
            Icon: FolderKanban,
          },
          {
            label: 'Storage Used',
            value: formatSize(metrics.totalBytes),
            color: '#38BDF8',
            bg: 'rgba(56,189,248,0.12)',
            Icon: HardDrive,
          },
          {
            label: 'Signatures',
            value: metrics.signatureCount,
            color: '#F59E0B',
            bg: 'rgba(245,158,11,0.12)',
            Icon: FileSignature,
          },
          {
            label: 'Official Stamps',
            value: metrics.categoryCounts.Stamps,
            color: '#A855F7',
            bg: 'rgba(168,85,247,0.12)',
            Icon: Stamp,
          },
        ].map(({ label, value, color, bg, Icon }) => (
          <div
            key={label}
            className="card-jiddah h-20 rounded-2xl px-4 flex items-center gap-3.5 transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] leading-none tabular-nums">
                {value}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium truncate">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Asset category filter">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 ${
                  category === cat
                    ? 'pill-jiddah-gold shadow-xs'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat}</span>
                <span className="opacity-75 tabular-nums">
                  ({metrics.categoryCounts[cat as keyof typeof metrics.categoryCounts] ?? 0})
                </span>
              </button>
            ))}
          </div>

          {category === 'Signatures' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="upload-signature-role-select"
                    className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1.5"
                  >
                    Target Signature Role
                  </label>
                  <CustomPillSelect
                    id="upload-signature-role-select"
                    dataTestId="upload-signature-role-select"
                    ariaLabel="Select Signature Role"
                    value={selectedSlot}
                    onChange={setSelectedSlot}
                    placeholder="Choose signatory role..."
                    options={signatureRoleSlots.map((slot) => ({
                      value: slot.slot_key,
                      label: slot.label,
                      badge: slot.uploaded ? '✓ Uploaded' : 'Missing',
                    }))}
                    triggerClassName="w-full justify-between bg-[var(--bg-card)] border-amber-500/35 text-[var(--text-primary)] py-2.5 px-3 text-xs font-semibold"
                  />
                </div>

                {/* 2-Mode Switcher */}
                <div className="shrink-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-900/70 dark:text-amber-200/70 mb-1.5">
                    Capture Method
                  </span>
                  <div className="inline-flex rounded-xl border border-amber-500/30 bg-[var(--bg-card)] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        signatureMode === 'upload'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Upload &amp; Auto-Clean Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        signatureMode === 'draw'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Draw Digital Signature
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-amber-900/80 dark:text-amber-200/85">
                {selectedSlotInfo?.description ||
                  'Any uploaded or drawn signature below binds immediately to corresponding student report cards.'}
              </p>
            </div>
          )}

          {category === 'Stamps' && (
            <div className="rounded-2xl border border-indigo-500/25 bg-[var(--bg-card)] p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-indigo-500" />
                    Official Dynamic Stamp Engine Preview
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Crisp dual-ink vector rubber stamp rendered natively across all 8 report templates.
                  </p>
                </div>
                <Link
                  href="/admin/reports/studio"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Configure in Studio
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center min-h-[128px]">
                  <OfficialReportStamp
                    reportData={{
                      settings: {
                        school_name: 'Jiddah Islamic Nursery & Primary School',
                      },
                    }}
                    maxWidth={190}
                    maxHeight={92}
                  />
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vector Rubber Stamp Output
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4 flex flex-col justify-between min-h-[128px]">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Scanned Image Backup ({schoolStampSlot?.uploaded ? 'Uploaded' : 'Optional'})
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Upload a cleaned PNG/WebP scan if an external physical stamp image is preferred for `school-stamp`.
                    </p>
                  </div>
                  {schoolStampSlot?.uploaded && schoolStampSlot.public_url ? (
                    <div className="mt-3 flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-slate-200">
                      <img
                        src={schoolStampSlot.public_url}
                        alt="Uploaded physical school stamp"
                        className="h-10 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setSlotToDelete(schoolStampSlot)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {pendingSignatureFile && category === 'Signatures' && signatureMode === 'upload' && (
            <SignatureInkReviewCard
              file={pendingSignatureFile}
              targetLabel={selectedSlotInfo?.label || selectedSlot}
              onCancel={() => setPendingSignatureFile(null)}
              onConfirmUpload={async (fileToUpload) => {
                setPendingSignatureFile(null)
                await startUploadFile(fileToUpload, 'Signatures', selectedSlot)
              }}
            />
          )}

          {category === 'Signatures' && signatureMode === 'draw' ? (
            <DigitalSignaturePad
              targetLabel={selectedSlotInfo?.label || selectedSlot}
              saving={savingDrawn}
              onSaveSignature={async (file) => {
                setSavingDrawn(true)
                try {
                  await startUploadFile(file, 'Signatures', selectedSlot)
                } finally {
                  setSavingDrawn(false)
                }
              }}
            />
          ) : (
            /* High-Contrast Responsive Dropzone */
            <div
              className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all p-6 sm:p-9 ${
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
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                  dragOver ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
                }`}
              >
                <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] text-center">
                Drop {category === 'Signatures' ? 'signature photo' : 'files'} here or{' '}
                <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                  click to browse
                </span>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
                PNG, JPG, WebP{category === 'Documents' || category === 'Other' ? ', PDF' : ''} &bull; Max 10MB per file
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Target category:{' '}
                <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{category}</strong>
                {category === 'Signatures' && selectedSlotInfo ? (
                  <span> &bull; Role: <strong>{selectedSlotInfo.label}</strong></span>
                ) : null}
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple={category !== 'Signatures' && category !== 'Stamps'}
                accept={category === 'Signatures' || category === 'Stamps' ? 'image/*' : 'image/*,.pdf'}
                className="hidden"
                aria-label="Select files to upload"
                onChange={(event) => {
                  if (event.target.files) {
                    handleFiles(event.target.files)
                    event.target.value = ''
                  }
                }}
              />
            </div>
          )}

          {/* Live Visual Signature Asset Gallery */}
          {category === 'Signatures' && (
            <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] shadow-xs border border-[var(--border)]">
              <div className="px-5 py-3.5 bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Live Signature Assets ({uploadedSignatureAssets.length} / {signatureRoleSlots.length} Assigned)
                </h3>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Theology stops at P.6 (PLE is Secular)
                </span>
              </div>

              {uploadedSignatureAssets.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  No signatures uploaded yet. Select a role above to upload or draw a crisp signature.
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {uploadedSignatureAssets.map((slot) => (
                    <div
                      key={slot.slot_key}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)]/50 p-3 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{slot.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                            {slot.slot_key} &bull; {slot.size ? formatSize(slot.size) : 'Stored'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            slot.active
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                          }`}
                        >
                          {slot.active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="relative h-20 rounded-lg border border-slate-200 bg-white flex items-center justify-center px-3 overflow-hidden">
                        <div className="pointer-events-none absolute inset-x-4 bottom-3 border-b border-dotted border-slate-300" />
                        <img
                          src={slot.public_url!}
                          alt={slot.label}
                          className="relative max-h-14 max-w-full object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot.slot_key)
                            setSignatureMode('upload')
                            fileRef.current?.click()
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => void reCleanSlot(slot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <Wand2 className="w-3 h-3" />
                          Re-Clean Ink
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlotToDelete(slot)}
                          aria-label={`Delete ${slot.label}`}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Uploaded Documents / Repository Files List */}
          {filteredRepositoryFiles.length > 0 && (
            <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] shadow-xs border border-[var(--border)]">
              <div className="px-5 py-3.5 bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Repository Files ({filteredRepositoryFiles.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {filteredRepositoryFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3.5 px-4 sm:px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        file.type.startsWith('image')
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {file.type.startsWith('image') ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[var(--bg-sunken)] border border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider">
                          {file.category}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatSize(file.size)} &bull; {file.updated_at ?? 'Uploaded'}
                        </span>
                      </div>
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--bg-sunken)]">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            {file.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'done' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                      {file.status === 'uploading' && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                      <MoreActionsMenu
                        items={[
                          ...(file.public_url
                            ? [
                                {
                                  label: 'Preview',
                                  icon: Eye,
                                  onClick: () => window.open(file.public_url!, '_blank'),
                                },
                                {
                                  label: 'Download',
                                  icon: Download,
                                  onClick: () => {
                                    const a = document.createElement('a')
                                    a.href = file.public_url!
                                    a.download = file.name
                                    a.click()
                                  },
                                },
                              ]
                            : []),
                          ...(file.type.startsWith('image')
                            ? [
                                {
                                  label: 'Clean Signature Ink',
                                  icon: Wand2,
                                  onClick: () => {
                                    toast.info(`Preparing ink cleaning for ${file.name}...`)
                                    if (file.public_url) {
                                      fetch(file.public_url)
                                        .then((res) => res.blob())
                                        .then((blob) => {
                                          const f = new File([blob], file.name, { type: file.type })
                                          setPendingSignatureFile(f)
                                          setCategory('Signatures')
                                          setSignatureMode('upload')
                                        })
                                        .catch(() => toast.error('Unable to fetch file for cleaning.'))
                                    }
                                  },
                                },
                              ]
                            : []),
                          {
                            label: 'Delete',
                            icon: Trash2,
                            destructive: true,
                            onClick: () => removeFile(file.id, file.name),
                          },
                        ]}
                        align="end"
                      />
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
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const count =
                  metrics.categoryCounts[cat as keyof typeof metrics.categoryCounts] ?? 0
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-xl border-b border-[var(--border)] last:border-0 transition-colors cursor-pointer ${
                      category === cat ? 'bg-amber-500/10' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{cat}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        count > 0
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25'
                          : 'bg-[var(--bg-sunken)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-md border border-emerald-800/50">
            <h3 className="text-xs font-bold tracking-wider uppercase text-emerald-300">
              Storage Quota
            </h3>
            <p className="text-sm font-extrabold text-white mt-1 tabular-nums">
              Used: {formatSize(metrics.totalBytes)} of 1 GB
            </p>
            <div className="h-2 rounded-full overflow-hidden bg-emerald-950/80 mt-3 border border-emerald-800/40">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${visibleQuotaPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-200/90 mt-2 font-medium tabular-nums">
              {quotaPercentText} consumed
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

      <ConfirmDestructiveDialog
        open={Boolean(slotToDelete)}
        title={`Delete ${slotToDelete?.label || 'Signature'}?`}
        description={`Remove the uploaded asset for "${slotToDelete?.label || ''}"? Student report cards using this slot will fall back cleanly until replaced.`}
        confirmLabel="Remove Asset"
        loading={deleting}
        onConfirm={confirmDeleteSignatureSlot}
        onCancel={() => setSlotToDelete(null)}
      />
    </div>
  )
}
