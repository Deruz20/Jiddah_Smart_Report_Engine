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
  Search,
  RotateCw,
} from 'lucide-react'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
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
    <div className="rounded-xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[var(--bg-sunken)]/50 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5 truncate">
            <PenTool className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{targetLabel}</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-1">
            {DRAW_INK_OPTIONS.map((opt) => (
              <Tooltip key={opt.hex}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={opt.label}
                    onClick={() => setInkColor(opt.hex)}
                    className={`w-4 h-4 rounded-full border-2 transition-transform cursor-pointer ${
                      inkColor === opt.hex ? 'scale-110 border-amber-400 shadow-2xs' : 'border-white/70 opacity-80'
                    }`}
                    style={{ backgroundColor: opt.hex }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">{opt.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5 text-[10px] font-bold">
            {[
              { label: 'Fine', width: 2.4 },
              { label: 'Med', width: 3.5 },
              { label: 'Bold', width: 5.0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStrokeWidth(item.width)}
                className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${
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

      <div className="relative rounded-xl border border-dashed border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={920}
          height={280}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-40 block cursor-crosshair select-none"
          style={{ touchAction: 'none' }}
          aria-label="Digital signature drawing canvas"
        />
        <div className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-dotted border-slate-300" />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-semibold text-slate-400 select-none">
              Sign neatly above the dotted baseline
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasStrokes || saving}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-45 cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Signature'}
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
  const [mobilePane, setMobilePane] = useState<'capture' | 'gallery'>('capture')
  const [roleSearch, setRoleSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'uploaded' | 'missing'>('all')
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
      toast.success(`${slotToDelete.label} removed cleanly`)
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
    setMobilePane('capture')
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
  const quotaPercentDisplay = useMemo(
    () => formatStoragePercent(metrics.totalBytes, STORAGE_QUOTA_BYTES).replace(/\s*used$/i, ''),
    [metrics.totalBytes]
  )

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

  const filteredRoleSlots = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    return signatureRoleSlots.filter((slot) => {
      if (roleFilter === 'uploaded' && !slot.uploaded) return false
      if (roleFilter === 'missing' && slot.uploaded) return false
      if (!q) return true
      return (
        slot.label.toLowerCase().includes(q) ||
        slot.slot_key.toLowerCase().includes(q) ||
        slot.role.toLowerCase().includes(q)
      )
    })
  }, [signatureRoleSlots, roleFilter, roleSearch])

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
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 w-full min-w-0 space-y-3.5 pb-10">
      {/* Zone 1: Compact Single-Row Control & Telemetry Bar */}
      <div
        data-testid="upload-telemetry-bar"
        className="rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[var(--bg-card)] px-3 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5"
      >
        {/* Left: Segmented Category Pill Track */}
        <div
          role="tablist"
          aria-label="Asset category filter"
          className="inline-flex items-center gap-1 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] p-1 overflow-x-auto max-w-full"
        >
          {CATEGORIES.map((cat) => {
            const count = metrics.categoryCounts[cat as keyof typeof metrics.categoryCounts] ?? 0
            const active = category === cat
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#0D5C3A] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10.5px] font-extrabold tabular-nums px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right: Compact Inline Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="tabular-nums">{metrics.totalFiles} Files</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold">
            <FileSignature className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {metrics.signatureCount}/{signatureRoleSlots.length || 22} Signatures
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-800 dark:text-purple-300 font-bold">
            <Stamp className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {metrics.categoryCounts.Stamps} {metrics.categoryCounts.Stamps === 1 ? 'Stamp' : 'Stamps'}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-900 dark:text-sky-200 font-bold">
            <HardDrive className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="tabular-nums whitespace-nowrap">
              {formatSize(metrics.totalBytes)} / 1 GB ({quotaPercentDisplay})
            </span>
            <span className="w-14 h-1.5 rounded-full bg-sky-950/15 dark:bg-white/15 overflow-hidden shrink-0">
              <span
                className="block h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${visibleQuotaPercent}%` }}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Mobile View Switcher (< lg) */}
      <div
        data-testid="upload-mobile-view-switcher"
        className="lg:hidden grid grid-cols-2 gap-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#1E2623] p-1 border border-[var(--border)]"
      >
        <button
          type="button"
          onClick={() => setMobilePane('capture')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobilePane === 'capture'
              ? 'bg-[#0D5C3A] text-white shadow-xs'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Upload / Draw
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('gallery')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobilePane === 'gallery'
              ? 'bg-[#0D5C3A] text-white shadow-xs'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {category === 'Signatures'
            ? `Assigned Assets (${uploadedSignatureAssets.length})`
            : `Files (${filteredRepositoryFiles.length})`}
        </button>
      </div>

      {/* Zone 2: Above-the-Fold 12-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Pane (lg:col-span-5 — Target Role & Capture Dock) */}
        <section
          className={`lg:col-span-5 rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[var(--bg-card)] p-4 shadow-xs space-y-3.5 ${
            mobilePane === 'capture' ? 'block' : 'hidden lg:block'
          }`}
        >
          {category === 'Signatures' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="upload-signature-role-select"
                  className="block text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
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
                  triggerClassName="w-full justify-between bg-[var(--bg-sunken)] border-[#0D5C3A]/20 text-[var(--text-primary)] py-2 px-3 text-xs font-semibold"
                />
              </div>

              {/* Compact Mode Switcher */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Capture Method
                </span>
                <div className="inline-flex rounded-xl border border-[#0D5C3A]/15 dark:border-white/10 bg-[#F0F4F9] dark:bg-[#1E2623] p-0.5 gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSignatureMode('upload')}
                        aria-label="Upload and Auto-Clean Photo"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          signatureMode === 'upload'
                            ? 'bg-[#0D5C3A] text-white shadow-2xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Upload &amp; Auto-Clean Photo</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSignatureMode('draw')}
                        aria-label="Draw Digital Signature"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          signatureMode === 'draw'
                            ? 'bg-[#0D5C3A] text-white shadow-2xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Draw Digital Signature</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Sign directly on touch canvas</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}

          {category === 'Stamps' && (
            <div className="rounded-xl border border-indigo-500/20 bg-[var(--bg-sunken)]/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <Stamp className="w-4 h-4 text-indigo-500" />
                  <span>Dynamic Stamp Preview</span>
                </h3>
                <Link
                  href="/admin/reports/studio"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors"
                >
                  Studio
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center min-h-[110px]">
                <OfficialReportStamp
                  reportData={{ settings: { school_name: 'Jiddah Islamic Nursery & Primary School' } }}
                  maxWidth={185}
                  maxHeight={88}
                />
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
            <div
              className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all p-5 sm:p-7 ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-500/15'
                  : 'border-[#0D5C3A]/20 dark:border-white/15 bg-[var(--bg-sunken)]/60 hover:bg-[var(--bg-hover)]'
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
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
                  dragOver ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
                }`}
              >
                <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] text-center">
                Drop {category === 'Signatures' ? 'signature photo' : 'files'} here or{' '}
                <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                  click to browse
                </span>
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 text-center">
                PNG, JPG, WebP{category === 'Documents' || category === 'Other' ? ', PDF' : ''} &bull; Max 10MB
              </p>
              {category === 'Signatures' && selectedSlotInfo && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 text-center">
                  Target: <strong>{selectedSlotInfo.label}</strong>
                </p>
              )}
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

          {selectedSlotInfo?.description && category === 'Signatures' && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {selectedSlotInfo.description}
            </p>
          )}
        </section>

        {/* Right Pane (lg:col-span-7 — Live Visual Asset Gallery Visible Immediately Above the Fold) */}
        <section
          className={`lg:col-span-7 rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[var(--bg-card)] shadow-xs overflow-hidden ${
            mobilePane === 'gallery' ? 'block' : 'hidden lg:block'
          }`}
        >
          {category === 'Signatures' ? (
            <>
              <div className="px-4 py-3 bg-[var(--bg-sunken)]/80 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                    Live Signature Assets ({uploadedSignatureAssets.length} / {signatureRoleSlots.length} Assigned)
                  </h2>
                  <p className="text-[10.5px] text-[var(--text-secondary)]">
                    Canonical roles (Leadership &rarr; Secular Baby–P.7 &rarr; Theology Baby–P.6)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      placeholder="Filter roles..."
                      aria-label="Filter signature roles"
                      className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5 text-[11px] font-bold">
                    {(['all', 'uploaded', 'missing'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setRoleFilter(status)}
                        className={`px-2 py-0.5 rounded-md capitalize cursor-pointer transition-colors ${
                          roleFilter === status
                            ? 'bg-[#0D5C3A] text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100dvh-165px)] overflow-y-auto">
                {filteredRoleSlots.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-xs text-[var(--text-muted)]">
                    No matching signature roles found.
                  </div>
                ) : (
                  filteredRoleSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.slot_key
                    return (
                      <div
                        key={slot.slot_key}
                        className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'border-emerald-600/60 bg-emerald-500/5 dark:bg-emerald-500/10'
                            : 'border-[var(--border)] bg-[var(--bg-sunken)]/40 hover:border-[#0D5C3A]/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[11.5px] font-bold text-[var(--text-primary)] truncate">
                              {slot.label}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                              {slot.uploaded && slot.size ? formatSize(slot.size) : slot.slot_key}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold ${
                              slot.uploaded
                                ? slot.active
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-stone-500/15 text-[var(--text-muted)]'
                            }`}
                          >
                            {slot.uploaded ? (slot.active ? 'Active' : 'Hidden') : 'Missing'}
                          </span>
                        </div>

                        <div
                          onClick={() => {
                            setSelectedSlot(slot.slot_key)
                            setMobilePane('capture')
                          }}
                          className="relative h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center px-2.5 overflow-hidden cursor-pointer"
                        >
                          <div className="pointer-events-none absolute inset-x-3 bottom-2.5 border-b border-dotted border-slate-300" />
                          {slot.uploaded && slot.public_url ? (
                            <img
                              src={slot.public_url}
                              alt={slot.label}
                              className="relative max-h-12 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Click to assign
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={slot.uploaded ? `Replace ${slot.label}` : `Upload ${slot.label}`}
                                onClick={() => {
                                  setSelectedSlot(slot.slot_key)
                                  setSignatureMode('upload')
                                  setMobilePane('capture')
                                  fileRef.current?.click()
                                }}
                                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                              >
                                <RotateCw className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {slot.uploaded ? 'Replace' : 'Upload Photo'}
                            </TooltipContent>
                          </Tooltip>

                          {slot.uploaded && slot.public_url && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`Re-Clean Ink for ${slot.label}`}
                                    onClick={() => void reCleanSlot(slot)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                                  >
                                    <Wand2 className="w-3 h-3" />
                                    <span>Re-Clean Ink</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Re-Clean Ink Background</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => setSlotToDelete(slot)}
                                    aria-label={`Delete ${slot.label}`}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete Signature</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : category === 'Stamps' ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                    School Stamp Assets
                  </h2>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Optional physical stamp scan backup (`school-stamp`) paired with dynamic vector engine.
                  </p>
                </div>
              </div>

              {schoolStampSlot?.uploaded && schoolStampSlot.public_url ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)]/50 p-4 flex items-center justify-between gap-4">
                  <div className="h-24 w-44 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-2">
                    <img
                      src={schoolStampSlot.public_url}
                      alt="Uploaded physical school stamp"
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)]">Physical School Stamp Scan</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Size: {schoolStampSlot.size ? formatSize(schoolStampSlot.size) : 'Stored'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlotToDelete(schoolStampSlot)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 border border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  Using dynamic crisp vector rubber stamp engine (recommended). Drop a stamp PNG on the left if a scanned image backup is required.
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 bg-[var(--bg-sunken)]/80 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                  Repository Files ({filteredRepositoryFiles.length})
                </h2>
              </div>

              {filteredRepositoryFiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No files uploaded under <strong>{category}</strong> yet. Use the dropzone on the left to upload.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-[calc(100dvh-165px)] overflow-y-auto">
                  {filteredRepositoryFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
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
                        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[var(--bg-sunken)] border border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider">
                            {file.category}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {formatSize(file.size)} &bull; {file.updated_at ?? 'Uploaded'}
                          </span>
                        </div>
                        {file.status === 'uploading' && (
                          <div className="flex items-center gap-2 mt-1.5">
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
                      <div className="flex items-center gap-1.5">
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
              )}
            </div>
          )}
        </section>
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
