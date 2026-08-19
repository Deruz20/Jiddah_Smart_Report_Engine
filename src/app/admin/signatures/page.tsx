import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SignaturesClient from '@/components/layout/signatures-client'

export const dynamic = "force-dynamic";

const BUCKET = 'signatures'

import { getDynamicSignatureSlots } from '@/utils/signatures'

function buildPublicUrl(supabase: ReturnType<typeof createClient>, filePath: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data?.publicUrl ?? null
}

export default async function SignaturesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const SIGNATURE_SLOTS = await getDynamicSignatureSlots(supabase)

  const { data: objects, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
  
  const uploadedBySlot = new Map<string, string>()
  for (const object of objects ?? []) {
    const matchingSlot = SIGNATURE_SLOTS.find((slot) => object.name.startsWith(`${slot.slot_key}.`))
    if (matchingSlot && !uploadedBySlot.has(matchingSlot.slot_key)) {
      uploadedBySlot.set(matchingSlot.slot_key, object.name)
    }
  }

  const slots = SIGNATURE_SLOTS.map((slot) => {
    const fileName = uploadedBySlot.get(slot.slot_key)
    const public_url = fileName ? buildPublicUrl(supabase, fileName) : null
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
