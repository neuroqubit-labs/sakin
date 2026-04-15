import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TicketCategory, TicketPriority, TicketStatus } from '@sakin/shared'
import type { CreateTicketDto } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

export interface TicketItem {
  id: string
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  site?: { name: string } | null
  unit?: { number: string } | null
}

export interface TicketListResponse {
  data: TicketItem[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const ticketKeys = {
  all: ['tickets'] as const,
  my: () => [...ticketKeys.all, 'my'] as const,
}

export function useMyTickets() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: ticketKeys.my(),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<TicketListResponse>('/tickets/my', { params: { limit: 50 } }, session?.tenantId),
  })
}

export function useCreateTicket() {
  const { session } = useAuthSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTicketDto) =>
      apiClient<TicketItem>(
        '/tickets',
        { method: 'POST', body: JSON.stringify(dto) },
        session?.tenantId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}
