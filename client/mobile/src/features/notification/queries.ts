import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

export interface NotificationItem {
  id: string
  templateKey: string | null
  title: string | null
  body: string | null
  payload: unknown
  channel: string
  status: string
  readAt: string | null
  createdAt: string
  sentAt: string | null
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

export function useUnreadNotificationCount() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    enabled: Boolean(session),
    refetchInterval: 60_000,
    queryFn: () =>
      apiClient<{ count: number }>('/notifications/unread-count', {}, session?.tenantId),
  })
}

export function useNotifications() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: notificationKeys.list(),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<NotificationItem[]>('/notifications', { params: { limit: 50 } }, session?.tenantId),
  })
}

export function useMarkNotificationRead() {
  const { session } = useAuthSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ id: string; readAt: string }>(
        `/notifications/${id}/read`,
        { method: 'POST' },
        session?.tenantId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { session } = useAuthSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient<{ updated: number }>(
        '/notifications/read-all',
        { method: 'POST' },
        session?.tenantId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
