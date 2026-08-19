import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('teacher_initials')
      .select('id, level, subject_id, initials')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { level, subject_id, initials } = body

    if (!level || !subject_id) {
      return NextResponse.json({ error: 'Missing level or subject_id' }, { status: 400 })
    }

    // Admins only (handled by RLS implicitly, but we can just run the upsert)
    // Upsert using the unique constraint on (level, subject_id)
    if (!initials) {
       // if empty, we could delete it, but an empty update is fine too or we delete it
       const { error } = await supabase
         .from('teacher_initials')
         .delete()
         .match({ level, subject_id })
         
       if (error) throw error
       return NextResponse.json({ success: true, action: 'deleted' })
    }

    const { error } = await supabase
      .from('teacher_initials')
      .upsert({ level, subject_id, initials }, { onConflict: 'level, subject_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
