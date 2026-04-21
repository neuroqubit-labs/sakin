import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

export interface Announcement {
  id: string
  title: string
  body: string
  publishedAt: string | null
  createdAt: string
  createdById: string
}

export interface AnnouncementsResponse {
  data: Announcement[]
  meta: { total: number; page: number; limit: number }
}

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (page: number, limit: number) => [...announcementKeys.all, 'list', page, limit] as const,
}

export function useAnnouncements(page = 1, limit = 30) {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: announcementKeys.list(page, limit),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<AnnouncementsResponse>(
        '/announcements',
        { params: { page, limit } },
        session?.tenantId,
      ),
  })
}
