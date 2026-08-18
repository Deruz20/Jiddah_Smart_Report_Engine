// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifyDataAccess } from '@/lib/auth-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized || (authRes.role !== 'Administrator' && authRes.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Only Administrators can perform this action.' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 })
    }

    // We must use the service role key to update another user's password
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error: any) {
    console.error('Password reset endpoint error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

