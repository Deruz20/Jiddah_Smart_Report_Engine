import { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { AccountProfileForm } from '@/lib/validation'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  avatar_url?: string | null
}

type UserProfileApiResponse = {
  data: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string | null
    role: string
    avatar_url?: string | null
    avatar?: string | null
  }
}

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get<UserProfileApiResponse>(ENDPOINTS.settings.user)
      const raw = response.data
      const full_name = [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim() || raw.email.split('@')[0]

      setProfile({
        id: raw.id,
        email: raw.email,
        full_name,
        phone: raw.phone ?? '',
        role: raw.role,
        avatar_url: raw.avatar_url ?? raw.avatar ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (values: AccountProfileForm) => {
      const fullName = values.full_name.trim()
      const [first_name, ...remaining] = fullName.split(/\s+/)
      const last_name = remaining.join(' ')

      await api.patch<{ success: boolean }>(ENDPOINTS.settings.user, {
        first_name,
        last_name,
        phone: values.phone || '',
      })
      await fetchProfile()
    },
    [fetchProfile]
  )

  const uploadAvatar = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)

    const url = `${apiBase ? apiBase : ''}/api/settings/user/avatar`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || 'Avatar upload failed')
    }

    await fetchProfile()
    return payload as { data: { avatar_url: string } }
  }, [fetchProfile])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return api.patch<{ success: boolean }>(ENDPOINTS.settings.userPassword, {
      currentPassword,
      newPassword,
    })
  }, [])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
  }
}
