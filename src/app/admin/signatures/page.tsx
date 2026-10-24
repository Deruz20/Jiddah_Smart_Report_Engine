import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SignaturesClient from '@/components/layout/signatures-client'
import { verifyDataAccess } from '@/lib/auth-server'
import {
  getLatestSignatureObjectNameForSlot,
  withSignatureVersion,
} from '@/utils/signatures'

export const dynamic = "force-dynamic";

import { getDynamicSignatureSlots } from '@/utils/signatures'

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
  const storage = admin.storage.from('signatures')
  const [activeResult, disabledResult] = await Promise.all([
    storage.list('', { limit: 1000 }),
    storage.list('disabled', { limit: 1000 }),
  ])
  if (activeResult.error || disabledResult.error) {
    throw new Error(`Unable to load stored report images: ${activeResult.error?.message ?? disabledResult.error?.message}`)
  }

  const slots = SIGNATURE_SLOTS.map((slot) => {
    const activeFile = getLatestSignatureObjectNameForSlot(activeResult.data ?? [], slot.slot_key)
    const disabledFile = getLatestSignatureObjectNameForSlot(disabledResult.data ?? [], slot.slot_key)
    const file = activeFile
      ? activeResult.data?.find((object) => object.name === activeFile)
      : null
    const url = file
      ? admin.storage.from('signatures').getPublicUrl(file.name).data?.publicUrl ?? null
      : null
    const public_url = url ? withSignatureVersion(url, file?.updated_at) : null
    return {
      ...slot,
      public_url,
      uploaded: Boolean(activeFile || disabledFile),
      active: Boolean(activeFile),
    }
  })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <SignaturesClient initialSlots={slots} />
    </div>
  )
}
