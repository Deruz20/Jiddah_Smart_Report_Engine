import { useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { getCsrfToken } from '@/lib/csrf'

export interface SignatureSlot {
  slot_key: string
  label: string
  role: string
  description: string
  required: boolean
  public_url: string | null
  uploaded: boolean
}

const SIGNATURES_ENDPOINT = '/api/signatures'
const SIGNATURES_UPLOAD_ENDPOINT = '/api/signatures/upload'

export function useSignatures() {
  const { data, loading, error, refetch } = useApi<SignatureSlot[]>(SIGNATURES_ENDPOINT)

  const uploadSignature = useCallback(
    async (slotKey: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slot_key', slotKey)

      const csrfToken = await getCsrfToken()
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }

      const response = await fetch(SIGNATURES_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      })

      const payload = await response.json()
      if (!response.ok) {
        const message = payload?.error || 'Signature upload failed. Please try again.'
        throw new Error(message)
      }

      await refetch()
      return payload.data
    },
    [refetch]
  )

  return {
    slots: data ?? [] as SignatureSlot[],
    loading,
    error,
    refetch,
    uploadSignature,
  }
}
