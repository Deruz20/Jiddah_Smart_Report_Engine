import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SignaturesClient from '@/components/layout/signatures-client'

export const dynamic = "force-dynamic";

const BUCKET = 'signatures'

const SIGNATURE_SLOTS = [
  {
    slot_key: 'head-teacher',
    label: 'Head Teacher Signature',
    role: 'Head Teacher',
    description: 'Used on all student report cards. Must be a clear scan or photo.',
    required: true,
  },
  {
    slot_key: 'principal',
    label: 'Principal Signature',
    role: 'Principal',
    description: 'Authority signature for official reports and certificates.',
    required: true,
  },
  {
    slot_key: 'class-teacher-p3',
    label: 'Class Teacher — Primary 3',
    role: 'Class Teacher',
    description: 'Signature for Primary 3 report cards.',
    required: true,
  },
  {
    slot_key: 'class-teacher-p5',
    label: 'Class Teacher — Primary 5',
    role: 'Class Teacher',
    description: 'Signature for Primary 5 report cards.',
    required: false,
  },
  {
    slot_key: 'school-stamp',
    label: 'Official School Stamp',
    role: 'Stamp',
    description: 'School stamp image used on reports and official documents.',
    required: true,
  },
]

function buildPublicUrl(supabase: ReturnType<typeof createClient>, filePath: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data?.publicUrl ?? null
}

export default async function SignaturesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

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
