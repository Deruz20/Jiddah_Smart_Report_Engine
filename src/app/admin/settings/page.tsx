import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SettingsClient from '@/components/layout/SettingsClient'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'

export const dynamic = 'force-dynamic'

export default async function SchoolSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="p-10 text-[#111827] bg-[#F8FAF8] min-h-screen font-medium">
        Unauthorized: Please sign in to access School Settings.
      </div>
    )
  }

  const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
  const authRes = await verifyDataAccess(supabase, user, 'read')

  if (!authRes.isAuthorized || !hasPermission(authRes, 'manage_settings')) {
    return (
      <div className="p-10 text-rose-700 bg-[#F8FAF8] min-h-screen font-medium">
        Access Denied: Only Administrators may access School Settings.
      </div>
    )
  }

  const supabaseAdmin = createAdminClient(cookieStore)
  const [{ data: terms }, initialSettings] = await Promise.all([
    supabase
      .from('terms')
      .select('id, name, academic_year, start_date, end_date, next_term_begins, is_active, created_at')
      .order('academic_year', { ascending: false })
      .order('name', { ascending: true }),
    fetchMergedSchoolSettings(supabaseAdmin),
  ])

  return (
    <div className="min-h-screen bg-[#F8FAF8] dark:bg-[#0B100E] w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SettingsClient
          terms={terms ?? []}
          initialSettings={initialSettings}
          userEmail={user.email ?? ''}
        />
      </div>
    </div>
  )
}
