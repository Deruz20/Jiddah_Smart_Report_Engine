import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import UploadClient from '@/components/layout/upload-client'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import {
  getDynamicSignatureSlots,
  getLatestSignatureObjectNameForSlot,
  resolveAllowedSignatureSlotsForUser,
  withSignatureVersion,
} from '@/utils/signatures'

export const dynamic = "force-dynamic";

const BUCKET = 'documents'
const SIGNATURES_BUCKET = 'signatures'

function getFileType(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return `image/${extension === 'jpg' ? 'jpeg' : extension}`
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'doc') return 'application/msword'
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return 'application/octet-stream'
}

export default async function UploadPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="p-10 text-rose-600 font-medium">Unauthorized</div>
  }
  const authRes = await verifyDataAccess(supabase, user, 'read')
  const admin = createAdminClient(cookieStore)
  const allowedSlots = authRes.isAuthorized
    ? await resolveAllowedSignatureSlotsForUser(admin, authRes)
    : new Set<string>()
  const canAccessUploadCenter =
    authRes.isAuthorized &&
    (allowedSlots === null ||
      allowedSlots.size > 0 ||
      hasPermission(authRes, 'manage_settings') ||
      hasPermission(authRes, 'lock_marks') ||
      Boolean(authRes.canonicalRole?.startsWith('DOS')))
  if (!canAccessUploadCenter) {
    return <div className="p-10 text-rose-600 font-medium">Access Denied: You must have an assigned class or supervisory role to access the Upload &amp; Signature Center.</div>
  }

  const { data: objects, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
  if (error) {
    console.error('Upload Center could not load document storage:', error.message)
  }
  const files = (objects ?? []).filter((o) => o.name && !o.name.startsWith('.')).map((object) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(object.name)
    const size = Number(object.metadata?.size ?? object.metadata?.contentLength ?? 0) || 0
    const rawCategory = String(object.metadata?.category ?? '')

    return {
      id: object.name,
      name: object.name,
      size,
      type: getFileType(object.name),
      updated_at: object.updated_at ?? null,
      public_url: data?.publicUrl ?? null,
      status: 'done' as const,
      progress: 100,
      category: ['Branding', 'Documents', 'Signatures', 'Stamps', 'Other'].includes(rawCategory)
        ? rawCategory
        : 'Documents'
    }
  })

  let initialSignatureSlots: any[] = []
  try {
    const [activeResult, disabledResult, dynamicSlots] = await Promise.all([
      admin.storage.from(SIGNATURES_BUCKET).list('', { limit: 1000 }),
      admin.storage.from(SIGNATURES_BUCKET).list('disabled', { limit: 1000 }),
      getDynamicSignatureSlots(admin),
    ])
    const activeFiles = !activeResult.error && activeResult.data ? activeResult.data : []
    const disabledFiles = !disabledResult.error && disabledResult.data ? disabledResult.data : []
    initialSignatureSlots = dynamicSlots
      .filter((slot) => allowedSlots === null || allowedSlots.has(slot.slot_key))
      .map((slot) => {
      const activePath = getLatestSignatureObjectNameForSlot(activeFiles, slot.slot_key)
      const disabledPath = getLatestSignatureObjectNameForSlot(disabledFiles, slot.slot_key)
      const activeObj = activePath ? activeFiles.find((f) => f?.name === activePath) : null
      const disabledObj = disabledPath ? disabledFiles.find((f) => f?.name === disabledPath) : null
      const { data } = activePath ? admin.storage.from(SIGNATURES_BUCKET).getPublicUrl(activePath) : { data: null }
      const public_url = data?.publicUrl ? withSignatureVersion(data.publicUrl, activePath) : null
      return {
        ...slot,
        public_url,
        size: Number(activeObj?.metadata?.size ?? activeObj?.metadata?.contentLength ?? disabledObj?.metadata?.size ?? 0) || 0,
        updated_at: activeObj?.updated_at ?? disabledObj?.updated_at ?? null,
        uploaded: Boolean(activePath || disabledPath),
        active: Boolean(activePath),
      }
    })
  } catch (err) {
    console.warn('UploadPage signature slots preload warning:', err)
  }

  return (
    <div className="w-full min-h-screen bg-[var(--bg-canvas)]">
      <UploadClient initialFiles={files} initialSignatureSlots={initialSignatureSlots} />
    </div>
  )
}
