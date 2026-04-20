import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '@/lib/api'
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

export interface RegisterDevicePayload {
  token: string
  platform: 'IOS' | 'ANDROID' | 'WEB'
  appVersion?: string
}

export function useRegisterDeviceToken() {
  const { session } = useAuthSession()
  return useMutation({
    mutationFn: (payload: RegisterDevicePayload) =>
      apiClient<{ id: string; reused: boolean }>(
        '/notifications/devices',
        { method: 'POST', body: JSON.stringify(payload) },
        session?.tenantId,
      ),
  })
}

export function useUnregisterDeviceToken() {
  const { session } = useAuthSession()
  return useMutation({
    mutationFn: (token: string) =>
      apiClient<{ removed: number }>(
        '/notifications/devices',
        { method: 'DELETE', body: JSON.stringify({ token }) },
        session?.tenantId,
      ),
  })
}

/**
 * Hook-dışı: logout anında çağrılır. Hata yutar — logout akışını hiçbir durumda bloklamamalı.
 */
export async function unregisterDeviceTokenDirect(
  token: string,
  tenantId: string | null,
): Promise<void> {
  try {
    await apiClient<{ removed: number }>(
      '/notifications/devices',
      { method: 'DELETE', body: JSON.stringify({ token }) },
      tenantId,
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return
    // Diğer hatalar: logout'u bloklamayalım.
  }
}
