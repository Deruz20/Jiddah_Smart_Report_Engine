export interface UploadMetricFile {
  size: number
  category: string
  status: 'uploading' | 'done' | 'error'
  targetSlotKey?: string
}

export interface UploadMetricSignature {
  slot_key: string
  uploaded: boolean
  size?: number | null
}

const DOCUMENT_CATEGORIES = ['Branding', 'Documents', 'Other'] as const

export function getUploadMetrics(files: UploadMetricFile[], signatures: UploadMetricSignature[]) {
  const storedDocuments = files.filter((file) =>
    DOCUMENT_CATEGORIES.includes(file.category as typeof DOCUMENT_CATEGORIES[number]) && file.status === 'done'
  )
  const inFlightFiles = files.filter((file) => file.status === 'uploading')
  const slotsBeingReplaced = new Set(inFlightFiles.map((file) => file.targetSlotKey).filter(Boolean))
  const uploadedSignatures = signatures.filter((slot) => slot.uploaded && !slotsBeingReplaced.has(slot.slot_key))
  const stampCount = uploadedSignatures.filter((slot) => slot.slot_key === 'school-stamp').length
  const signatureCount = uploadedSignatures.length - stampCount

  return {
    totalFiles: storedDocuments.length + uploadedSignatures.length + inFlightFiles.length,
    totalBytes: storedDocuments.reduce((sum, file) => sum + file.size, 0)
      + uploadedSignatures.reduce((sum, slot) => sum + (slot.size ?? 0), 0)
      + inFlightFiles.reduce((sum, file) => sum + file.size, 0),
    signatureCount,
    categoryCounts: {
      Signatures: signatureCount,
      Stamps: stampCount,
      Branding: storedDocuments.filter((file) => file.category === 'Branding').length,
      Documents: storedDocuments.filter((file) => file.category === 'Documents').length,
      Other: storedDocuments.filter((file) => file.category === 'Other').length,
    },
  }
}

export function getUploadProgressPercent(loaded: number, total: number) {
  if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(99, Math.round((loaded / total) * 100)))
}

export function getVisibleStoragePercent(bytes: number, quotaBytes: number) {
  if (!Number.isFinite(bytes) || !Number.isFinite(quotaBytes) || bytes <= 0 || quotaBytes <= 0) return 0
  return Math.max(1, Math.min(100, (bytes / quotaBytes) * 100))
}

export function formatStoragePercent(bytes: number, quotaBytes: number) {
  if (bytes <= 0 || quotaBytes <= 0) return '0.00% used'
  const percent = (bytes / quotaBytes) * 100
  return percent < 0.01 ? '<0.01% used' : `${percent.toFixed(2)}% used`
}
