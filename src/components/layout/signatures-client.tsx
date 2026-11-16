"use client";

import React, { useEffect, useRef, useState } from 'react'
import * as Switch from '@radix-ui/react-switch'
import { toast } from 'sonner'
import {
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  Sliders,
  ArrowRight,
  Stamp,
  FileSignature,
  Camera,
} from 'lucide-react'
import Link from 'next/link'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import { SignatureInkReviewCard } from '@/components/SignatureInkReviewCard'
import { CleanSignatureImg } from '@/components/reports/shared/CleanSignatureImg'
import {
  StampGeneratorPanel,
  DEFAULT_STAMP_CONFIG,
  type StampConfig,
} from '@/components/reports/StampGenerator'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export interface SignatureSlot {
  slot_key: string
  label: string
  description: string
  required: boolean
  uploaded: boolean
  active: boolean
  public_url: string | null
}

interface SignaturesClientProps {
  initialSlots?: SignatureSlot[]
  embedded?: boolean
  searchQuery?: string
}

export default function SignaturesClient({
  initialSlots = [],
  embedded = false,
  searchQuery = '',
}: SignaturesClientProps) {
  const [slots, setSlots] = useState<SignatureSlot[]>(initialSlots)
  const [loading, setLoading] = useState(initialSlots.length === 0)
  const [error, setError] = useState<string | null>(null)

  const [dragOver, setDragOver] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null)
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [slotToDelete, setSlotToDelete] = useState<SignatureSlot | null>(null)
  const [pendingSignatureReview, setPendingSignatureReview] = useState<{
    slotKey: string
    label: string
    file: File
  } | null>(null)
  const [stampConfig, setStampConfig] = useState<StampConfig>(DEFAULT_STAMP_CONFIG)
  const [showStampStudio, setShowStampStudio] = useState(true)
  const [signatureInputMode, setSignatureInputMode] = useState<'upload' | 'draw'>('upload')
  const [drawSlotKey, setDrawSlotKey] = useState<string>('head_teacher')
  const [drawPenColor, setDrawPenColor] = useState<'#0C2A84' | '#0F172A'>('#0C2A84')
  const [drawStrokeThickness, setDrawStrokeThickness] = useState<number>(3.2)
  const [hasDrawnStrokes, setHasDrawnStrokes] = useState<boolean>(false)
  const [savingDrawnSignature, setSavingDrawnSignature] = useState<boolean>(false)
  const padCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef<boolean>(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const midPointRef = useRef<{ x: number; y: number } | null>(null)

  const clearSignaturePad = () => {
    const canvas = padCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasDrawnStrokes(false)
    isDrawingRef.current = false
    lastPointRef.current = null
    midPointRef.current = null
  }

  const getPadPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = padCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / Math.max(1, rect.width)
    const scaleY = canvas.height / Math.max(1, rect.height)
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handlePadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = padCanvasRef.current
    if (!canvas) return
    canvas.setPointerCapture?.(e.pointerId)
    const pt = getPadPoint(e)
    isDrawingRef.current = true
    lastPointRef.current = pt
    midPointRef.current = pt
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = drawPenColor
      ctx.fillStyle = drawPenColor
      ctx.lineWidth = drawStrokeThickness
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, drawStrokeThickness / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    setHasDrawnStrokes(true)
  }

  const handlePadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const canvas = padCanvasRef.current
    if (!canvas || !lastPointRef.current || !midPointRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const currentPt = getPadPoint(e)
    const newMid = {
      x: (lastPointRef.current.x + currentPt.x) / 2,
      y: (lastPointRef.current.y + currentPt.y) / 2,
    }
    ctx.strokeStyle = drawPenColor
    ctx.lineWidth = drawStrokeThickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(midPointRef.current.x, midPointRef.current.y)
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, newMid.x, newMid.y)
    ctx.stroke()
    lastPointRef.current = currentPt
    midPointRef.current = newMid
  }

  const handlePadPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    isDrawingRef.current = false
    lastPointRef.current = null
    midPointRef.current = null
  }

  const handleSaveDrawnSignature = async () => {
    const canvas = padCanvasRef.current
    if (!canvas || !hasDrawnStrokes) {
      toast.error('Please draw a signature on the pad first.')
      return
    }
    setSavingDrawnSignature(true)
    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { width, height } = canvas
      const imgData = ctx.getImageData(0, 0, width, height)
      const data = imgData.data
      let minX = width
      let minY = height
      let maxX = 0
      let maxY = 0
      let foundInk = false
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3]
          if (alpha > 16) {
            foundInk = true
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      if (!foundInk) {
        toast.error('Please draw a clear signature before saving.')
        return
      }
      const pad = 16
      const cropX = Math.max(0, minX - pad)
      const cropY = Math.max(0, minY - pad)
      const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2)
      const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2)
      const outCanvas = document.createElement('canvas')
      outCanvas.width = Math.max(64, cropW)
      outCanvas.height = Math.max(32, cropH)
      const outCtx = outCanvas.getContext('2d')
      if (outCtx) {
        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob((b) => resolve(b), 'image/png')
      )
      if (!blob) throw new Error('Failed to export transparent PNG from signature pad.')
      const drawnFile = new File([blob], `${drawSlotKey}-drawn-signature.png`, {
        type: 'image/png',
      })
      await handleFileChange(drawSlotKey, drawnFile)
      clearSignaturePad()
      setSignatureInputMode('upload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save drawn signature.')
    } finally {
      setSavingDrawnSignature(false)
    }
  }

  useEffect(() => {
    let active = true
    fetch('/api/settings/school')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return
        const saved = payload?.data?.print_preferences?.stamp_config
        if (saved && typeof saved === 'object') {
          setStampConfig((prev) => ({ ...prev, ...saved }))
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const refetch = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/signatures', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) {
        setSlots(data.data || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to load signature slots.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error while loading signatures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialSlots.length === 0) {
      void refetch()
    }
  }, [initialSlots.length])

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
      toast.success('Official asset uploaded and activated.')
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed.')
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

  const handleFileSelection = (slotKey: string, _slotUploaded: boolean, file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or WEBP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Signature must be smaller than 5MB.')
      return
    }
    // Signature slots go through Before/After automatic paper background extraction
    if (slotKey !== 'school-stamp') {
      const targetSlot = slots.find((s) => s.slot_key === slotKey)
      setPendingSignatureReview({
        slotKey,
        label: targetSlot?.label || slotKey,
        file,
      })
      return
    }
    void handleFileChange(slotKey, file)
  }

  const toggleActivation = async (slot: SignatureSlot) => {
    const active = !slot.active
    const action = active ? 'reactivate' : 'deactivate'

    setTogglingSlot(slot.slot_key)
    setError(null)
    try {
      const response = await fetch('/api/signatures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_key: slot.slot_key, active }),
      })
      const payload = await response.json()
      if (!response.ok || payload?.data?.slot_key !== slot.slot_key || payload?.data?.active !== active) {
        throw new Error(payload?.error || `Unable to ${action} this report image.`)
      }

      setSlots((current) =>
        current.map((item) =>
          item.slot_key === slot.slot_key ? { ...item, active } : item
        )
      )
      toast.success(`${slot.label} ${active ? 'activated' : 'deactivated'} for reports.`)
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : `Unable to ${action} this report image.`
      setError(message)
      toast.error(message)
    } finally {
      setTogglingSlot(null)
    }
  }

  const deleteSlotAsset = (slot: SignatureSlot) => {
    setSlotToDelete(slot)
  }

  const confirmDeleteSlotAsset = async () => {
    if (!slotToDelete) return
    const slot = slotToDelete
    setDeletingSlot(slot.slot_key)
    setError(null)
    try {
      const response = await fetch(`/api/signatures?slot_key=${encodeURIComponent(slot.slot_key)}`, {
        method: 'DELETE',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete report image.')
      }

      setSlots((current) =>
        current.map((item) =>
          item.slot_key === slot.slot_key
            ? { ...item, uploaded: false, active: false, public_url: null }
            : item
        )
      )
      toast.success(`${slot.label} removed permanently.`)
      setSlotToDelete(null)
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete report image.'
      setError(message)
      toast.error(message)
    } finally {
      setDeletingSlot(null)
    }
  }

  const filteredSlots = searchQuery.trim()
    ? slots.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.slot_key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : slots

  const activeSignaturesCount = slots.filter((s) => s.slot_key !== 'school-stamp' && s.active).length
  const totalSignatureSlots = slots.filter((s) => s.slot_key !== 'school-stamp').length
  const stampSlot = slots.find((s) => s.slot_key === 'school-stamp')

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-[760px] w-full mx-auto space-y-5 py-6 px-4'}>
      {!embedded && (
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#111827]">Stamps & Signatures</h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Upload, preview, and activate official stamps and signatures for printed report cards.
            </p>
          </div>
          <Link
            href="/admin/reports/studio"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-3.5 py-2 text-xs font-semibold text-white transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Report Studio</span>
          </Link>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Card 1: Summary & Studio Placement Link */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#111827]">Stamps & Signatures Overview</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Official PNG, WEBP, and JPG assets injected into report card templates when enabled.
            </p>
          </div>
          <Link
            href="/admin/reports/studio"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-[#F8FAF8] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#0D5C3A] transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust Coordinates in Studio</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 2-Column At-a-Glance Summary Counters */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E3E8E3]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] text-[#0D5C3A] flex items-center justify-center shrink-0">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                Configured Signatures
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {activeSignaturesCount} / {totalSignatureSlots} Active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-[#E3E8E3] pl-3">
            <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <Stamp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                Official Stamp
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {stampSlot?.active
                  ? 'Active on Reports'
                  : stampSlot?.uploaded
                    ? 'Uploaded (Inactive)'
                    : 'Not Uploaded'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Interactive Code-Replicated Official Stamp Studio */}
      <div className="bg-white dark:bg-[#111916] rounded-2xl border border-[#E6ECE8] dark:border-[#1C2622] shadow-[0_1px_3px_rgba(15,41,30,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6ECE8] dark:border-[#1C2622] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F3F7F5]">
              Code-Replicated Official Stamp Designer
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Crisp vector school stamp rendered directly on every printed report card — adjust date, offset, ink color, rotation, and wet-ink texture.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowStampStudio((v) => !v)}
            className="h-8 px-3 rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-[#F8FAF9] dark:bg-[#0D1412] text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] cursor-pointer"
          >
            {showStampStudio ? 'Collapse' : 'Customize Stamp'}
          </button>
        </div>
        {showStampStudio && (
          <StampGeneratorPanel config={stampConfig} onChange={setStampConfig} tone="light" />
        )}
      </div>

      {pendingSignatureReview && (
        <SignatureInkReviewCard
          file={pendingSignatureReview.file}
          targetLabel={pendingSignatureReview.label}
          onCancel={() => setPendingSignatureReview(null)}
          onConfirmUpload={async (fileToUpload) => {
            const slotKey = pendingSignatureReview.slotKey
            setPendingSignatureReview(null)
            await handleFileChange(slotKey, fileToUpload)
          }}
        />
      )}

      {/* Mobile & Desktop Digital Signature Mode Switcher + Draw Pad */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <span>✍️ Digital Signature Capture Studio</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                Mobile &amp; Desktop Ready
              </span>
            </h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Upload or snap a photo of a paper signature (auto-verified &amp; Sauvola-cleaned), or draw directly on your screen with zero paper background.
            </p>
          </div>
          <div className="inline-flex items-center rounded-xl bg-[#F4F6F4] p-1 border border-[#E2E8E2]">
            <button
              type="button"
              onClick={() => setSignatureInputMode('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                signatureInputMode === 'upload'
                  ? 'bg-[#0D5C3A] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              📤 Upload / Camera Photo
            </button>
            <button
              type="button"
              data-testid="draw-signature-tab"
              onClick={() => setSignatureInputMode('draw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                signatureInputMode === 'draw'
                  ? 'bg-[#0D5C3A] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              ✍️ Draw Signature
            </button>
          </div>
        </div>

        {signatureInputMode === 'draw' && (
          <div
            data-testid="digital-signature-pad-panel"
            className="rounded-xl border border-blue-200 bg-slate-50/70 p-3.5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700">Target Slot:</label>
                <select
                  value={drawSlotKey}
                  onChange={(e) => setDrawSlotKey(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                >
                  {slots
                    .filter((s) => s.slot_key !== 'school_stamp')
                    .map((s) => (
                      <option key={s.slot_key} value={s.slot_key}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 px-1.5">Pen Color:</span>
                  <button
                    type="button"
                    onClick={() => setDrawPenColor('#0C2A84')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      drawPenColor === '#0C2A84'
                        ? 'bg-[#0C2A84] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Royal Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawPenColor('#0F172A')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      drawPenColor === '#0F172A'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Black
                  </button>
                </div>

                <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 px-1.5">Stroke Thickness:</span>
                  {[
                    { label: 'Fine', value: 2.2 },
                    { label: 'Medium', value: 3.2 },
                    { label: 'Bold', value: 4.5 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDrawStrokeThickness(opt.value)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                        drawStrokeThickness === opt.value
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
              <div className="pointer-events-none absolute inset-x-6 bottom-7 border-b border-dotted border-slate-300 flex items-end justify-between">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase pb-0.5">
                  SIG: Sign on the line using finger, stylus, or mouse
                </span>
              </div>
              <canvas
                ref={padCanvasRef}
                width={680}
                height={180}
                style={{ touchAction: 'none' }}
                onPointerDown={handlePadPointerDown}
                onPointerMove={handlePadPointerMove}
                onPointerUp={handlePadPointerUp}
                onPointerCancel={handlePadPointerUp}
                className="w-full h-[150px] sm:h-[170px] cursor-crosshair touch-none select-none block"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearSignaturePad}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!hasDrawnStrokes || savingDrawnSignature}
                onClick={() => void handleSaveDrawnSignature()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0A472C] disabled:opacity-50 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{savingDrawnSignature ? 'Saving...' : 'Save Transparent Signature'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Grid of Asset Cards */}
      {loading && slots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E3E8E3] p-8 text-center text-xs text-[#6B7280]">
          Loading signature and stamp slots...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSlots.map((slot) => {
            const previewUrl = previews[slot.slot_key] ?? slot.public_url
            const isUploading = uploadingSlot === slot.slot_key
            const isToggling = togglingSlot === slot.slot_key
            const isDeleting = deletingSlot === slot.slot_key
            const isDragTarget = dragOver === slot.slot_key

            return (
              <div
                key={slot.slot_key}
                className="bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Header + Switch */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#111827] truncate">{slot.label}</h3>
                        {slot.required && (
                          <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                            Core
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{slot.description}</p>
                    </div>

                    {slot.uploaded && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isToggling && <RefreshCw className="w-3.5 h-3.5 text-[#0D5C3A] animate-spin" />}
                        <Switch.Root
                          checked={slot.active}
                          disabled={isUploading || isToggling || isDeleting}
                          onCheckedChange={() => void toggleActivation(slot)}
                          aria-label={`Toggle ${slot.label}`}
                          className="w-9 h-5 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#0D5C3A] transition-colors outline-none cursor-pointer disabled:opacity-50"
                        >
                          <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[18px]" />
                        </Switch.Root>
                      </div>
                    )}
                  </div>

                  {/* Status Pill */}
                  <div className="mb-3">
                    <span
                      aria-live="polite"
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        slot.active
                          ? 'bg-[#E2EEE2] text-[#0D5C3A]'
                          : slot.uploaded
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {slot.active ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {slot.active
                        ? 'Active in reports'
                        : slot.uploaded
                          ? 'Paused on reports'
                          : 'No file uploaded'}
                    </span>
                  </div>

                  {/* Live Preview / Dropzone on Subtle Checkerboard Pad */}
                  <div
                    className={`rounded-xl overflow-hidden border transition-colors min-h-[132px] mb-3.5 flex items-center justify-center relative ${
                      isDragTarget
                        ? 'border-[#0D5C3A] bg-[#EEF3EE]'
                        : 'border-dashed border-[#D5DFD5] bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:12px_12px] bg-white'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(slot.slot_key)
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(null)
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleFileSelection(slot.slot_key, slot.uploaded, file)
                    }}
                  >
                    {previewUrl ? (
                      slot.slot_key !== 'school-stamp' ? (
                        <CleanSignatureImg
                          src={previewUrl}
                          alt={`${slot.label} preview`}
                          className={`w-full h-[128px] object-contain p-3 transition-opacity ${
                            slot.active ? 'opacity-100' : 'opacity-55 grayscale'
                          }`}
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt={`${slot.label} preview`}
                          className={`w-full h-[128px] object-contain p-3 transition-opacity ${
                            slot.active ? 'opacity-100' : 'opacity-55 grayscale'
                          }`}
                        />
                      )
                    ) : (
                      <label
                        htmlFor={`file-${slot.slot_key}`}
                        className="h-full w-full flex flex-col items-center justify-center gap-1.5 text-center p-4 cursor-pointer"
                      >
                        <div className="rounded-full bg-[#F1F5F1] p-2.5 text-[#0D5C3A]">
                          <Upload className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium text-[#374151]">
                          <span className="text-[#0D5C3A] font-semibold">Click to upload</span> or drag & drop
                        </p>
                        <p className="text-[11px] text-[#6B7280]">PNG, WEBP, JPG (max 5MB)</p>
                      </label>
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
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id={`camera-${slot.slot_key}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelection(slot.slot_key, slot.uploaded, file)
                      }}
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F1] flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {slot.uploaded && (
                      <button
                        type="button"
                        onClick={() => void toggleActivation(slot)}
                        disabled={isUploading || isToggling || isDeleting}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                          slot.active
                            ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                            : 'border-[#C6DEC6] text-[#0D5C3A] hover:bg-[#EEF3EE]'
                        }`}
                      >
                        {slot.active ? 'Deactivate from Reports' : 'Reactivate for Reports'}
                      </button>
                    )}
                    {slot.uploaded && (
                      <button
                        type="button"
                        onClick={() => deleteSlotAsset(slot)}
                        disabled={isUploading || isToggling || isDeleting}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Permanently remove uploaded image"
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {slot.slot_key !== 'school_stamp' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawSlotKey(slot.slot_key)
                            setSignatureInputMode('draw')
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
                          title="Draw signature on screen"
                        >
                          <span>✍️ Draw</span>
                        </button>
                        <label
                          htmlFor={`camera-${slot.slot_key}`}
                          className="inline-flex md:hidden cursor-pointer items-center gap-1 rounded-lg border border-[#D5DFD5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAF8] transition-colors"
                          title="Snap signature photo with phone camera"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Camera</span>
                        </label>
                      </>
                    )}
                    <label
                      htmlFor={`file-${slot.slot_key}`}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isUploading || isToggling || isDeleting ? 'opacity-50 pointer-events-none' : ''
                      } ${
                        slot.uploaded
                          ? 'border border-[#D5DFD5] bg-white text-[#374151] hover:bg-[#F8FAF8]'
                          : 'bg-[#0D5C3A] text-white hover:bg-[#0A472C]'
                      }`}
                    >
                      {isUploading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{slot.uploaded ? 'Replace' : 'Upload PNG'}</span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDestructiveDialog
        open={Boolean(slotToDelete)}
        title={`Remove ${slotToDelete?.label || 'Signature'}?`}
        description={`Are you sure you want to permanently remove the uploaded image for ${slotToDelete?.label || 'this slot'}? Reports will no longer display this asset until a new file is uploaded.`}
        confirmLabel="Remove Asset"
        loading={Boolean(deletingSlot)}
        onConfirm={confirmDeleteSlotAsset}
        onCancel={() => setSlotToDelete(null)}
      />
    </div>
  )
}
