import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const level = searchParams.get('level')

  if (!level || !['raudha', 'ibtidaai_lower', 'ibtidaai_upper'].includes(level)) {
    return NextResponse.json({ error: 'Valid level parameter required: raudha, ibtidaai_lower, or ibtidaai_upper' }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: subjects, error: subjectsError } = await supabase
      .from('theology_subjects')
      .select('id, subject_name_arabic, level, sort_order')
      .eq('level', level)
      .order('sort_order', { ascending: true })

    if (subjectsError) {
      console.error('theology_subjects DB error:', subjectsError.message)
      return NextResponse.json({ error: subjectsError.message }, { status: 500 })
    }

    return NextResponse.json(subjects || [])
  } catch (err) {
    console.error('Theology subjects API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
