import { useCallback } from 'react'
import { useApi } from './useApi'
import { api } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { NotificationItem } from '@/services/api/types'

export function useNotifications() {
  const { data, loading, error, refetch } = useApi<{ data: NotificationItem[] }>(
    ENDPOINTS.notifications
  )
  const { data: unreadData, refetch: refetchCount } = useApi<{ count: number }>(
    ENDPOINTS.notificationsUnread
  )

  const markAsRead = useCallback(
    async (id: number) => {
      await api.patch(ENDPOINTS.notificationRead(id))
      await Promise.all([refetch(), refetchCount()])
    },
    [refetch, refetchCount]
  )

  return {
    notifications: data?.data ?? [],
    unreadCount: unreadData?.count ?? 0,
    loading,
    error,
    refetch,
    markAsRead,
  }
}
