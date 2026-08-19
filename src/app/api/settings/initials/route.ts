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
      .select('id, level, subject_id, class_id, initials')

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
    const { level, subject_id, class_id, initials } = body

    if (!level || !subject_id) {
      return NextResponse.json({ error: 'Missing level or subject_id' }, { status: 400 })
    }

    const queryMatch = class_id ? { level, subject_id, class_id } : { level, subject_id }

    // Admins only (handled by RLS implicitly)
    if (!initials) {
       const deleteQuery = supabase.from('teacher_initials').delete().match(queryMatch)
       // If class_id is not provided, we explicitly match class_id IS NULL to avoid deleting class-specific overrides accidentally
       if (!class_id) {
          deleteQuery.is('class_id', null)
       }
       const { error } = await deleteQuery
         
       if (error) throw error
       return NextResponse.json({ success: true, action: 'deleted' })
    }

    // Since upsert with NULL relies on the constraint, we must ensure class_id is passed as null if undefined
    const upsertPayload = { 
      level, 
      subject_id, 
      class_id: class_id || null, 
      initials 
    }
    
    // In Supabase/Postgres 15+ with NULLS NOT DISTINCT, onConflict works perfectly with column lists
    const { error } = await supabase
      .from('teacher_initials')
      .upsert(upsertPayload, { onConflict: 'level, subject_id, class_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
