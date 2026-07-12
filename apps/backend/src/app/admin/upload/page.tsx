import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import UploadClient from '@/components/layout/upload-client'

export const dynamic = "force-dynamic";

const BUCKET = 'documents'

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

  const { data: objects, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
  
  const files = (objects ?? []).map((object) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(object.name)
    const size = Number(object.metadata?.size ?? 0)

    return {
      id: object.name,
      name: object.name,
      size,
      type: getFileType(object.name),
      updated_at: object.updated_at ?? null,
      public_url: data?.publicUrl ?? null,
      status: 'done' as const,
      progress: 100,
      category: 'Documents'
    }
  })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <UploadClient initialFiles={files} />
    </div>
  )
}
