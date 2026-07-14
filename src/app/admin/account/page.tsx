import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AccountClient, { UserProfileData } from '@/components/layout/account-client'

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  let profile: UserProfileData | null = null
  let email = ''

  if (user) {
    email = user.email || ''
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      profile = {
        id: profileData.id,
        email: email,
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        role: profileData.role || 'admin',
        avatar_url: profileData.avatar_url || ''
      }
    }
  }

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <AccountClient initialProfile={profile} userEmail={email} />
    </div>
  )
}
