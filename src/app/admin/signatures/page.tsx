import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SignaturesClient from '@/components/layout/signatures-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { mapLatestSignatureObjects, withSignatureVersion } from '@/utils/signatures'

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
  const { data: objects, error } = await admin.storage.from('signatures').list('', { limit: 1000 })
  if (error) {
    throw new Error(`Unable to load stored report images: ${error.message}`)
  }

  const uploadedBySlot = mapLatestSignatureObjects(
    objects ?? [],
    SIGNATURE_SLOTS.map((slot) => slot.slot_key)
  )
  const slots = SIGNATURE_SLOTS.map((slot) => {
    const file = uploadedBySlot.get(slot.slot_key)
    const url = file
      ? admin.storage.from('signatures').getPublicUrl(file.name).data?.publicUrl ?? null
      : null
    const public_url = url ? withSignatureVersion(url, file?.updated_at) : null
    return {
      ...slot,
      public_url,
      uploaded: Boolean(public_url),
    }
  })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <SignaturesClient initialSlots={slots} />
    </div>
  )
}
