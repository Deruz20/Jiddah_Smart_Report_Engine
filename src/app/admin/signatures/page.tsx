import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SignaturesClient from '@/components/layout/signatures-client'
import { verifyDataAccess } from '@/lib/auth-server'
import {
  getDynamicSignatureSlots,
  getLatestSignatureObjectNameForSlot,
  withSignatureVersion,
} from '@/utils/signatures'

export const dynamic = "force-dynamic";

const BUCKET = 'signatures'

function buildPublicUrl(supabase: ReturnType<typeof createClient>, filePath: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data?.publicUrl ?? null
}

export default async function SignaturesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return <main role="alert">Sign in to manage official report images.</main>
  }

  const access = await verifyDataAccess(supabase, user, 'read')
  if (!access.isAuthorized || access.canonicalRole !== 'Administrator') {
    return <main role="alert">Only administrators may manage official report images.</main>
  }

  const admin = createAdminClient()
  const SIGNATURE_SLOTS = await getDynamicSignatureSlots(admin)
  const storage = admin.storage.from(BUCKET)
  const [activeResult, disabledResult] = await Promise.all([
    storage.list('', { limit: 1000 }),
    storage.list('disabled', { limit: 1000 }),
  ])
  if (activeResult.error || disabledResult.error) {
    throw new Error(`Unable to load stored report images: ${activeResult.error?.message ?? disabledResult.error?.message}`)
  }
  
  const activeBySlot = new Map<string, string>()
  const disabledBySlot = new Map<string, string>()
  for (const slot of SIGNATURE_SLOTS) {
    const activePath = getLatestSignatureObjectNameForSlot(activeResult.data ?? [], slot.slot_key)
    const disabledPath = getLatestSignatureObjectNameForSlot(disabledResult.data ?? [], slot.slot_key)
    if (activePath) activeBySlot.set(slot.slot_key, activePath)
    if (disabledPath) disabledBySlot.set(slot.slot_key, disabledPath)
  }

  const slots = SIGNATURE_SLOTS.map((slot) => {
    const activePath = activeBySlot.get(slot.slot_key)
    const disabledPath = disabledBySlot.get(slot.slot_key)
    const filePath = activePath ?? (disabledPath ? `disabled/${disabledPath}` : null)
    const rawUrl = filePath ? buildPublicUrl(admin, filePath) : null
    const public_url = rawUrl ? withSignatureVersion(rawUrl, String(Date.now())) : null
    return {
      ...slot,
      public_url,
      uploaded: Boolean(filePath),
      active: Boolean(activePath),
    }
  })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <SignaturesClient initialSlots={slots} />
    </div>
  )
}
