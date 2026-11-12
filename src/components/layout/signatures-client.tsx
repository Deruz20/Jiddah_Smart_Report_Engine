"use client";

import React, { useEffect, useState } from 'react'
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
} from 'lucide-react'
import Link from 'next/link'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'

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
                      <img
                        src={previewUrl}
                        alt={`${slot.label} preview`}
                        className={`w-full h-[128px] object-contain p-3 transition-opacity ${
                          slot.active ? 'opacity-100' : 'opacity-55 grayscale'
                        }`}
                      />
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
