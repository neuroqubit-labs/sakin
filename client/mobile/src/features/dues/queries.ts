import { useQuery } from '@tanstack/react-query'
import { DuesStatus } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

export interface DuesItem {
  id: string
  amount: string | number
  status: DuesStatus
  dueDate: string
  periodMonth: number
  periodYear: number
  unit: { number: string; site: { name: string } }
}

export interface DuesListResponse {
  data: DuesItem[]
  meta: { total: number; page?: number; limit?: number }
}

export const UNPAID_STATUSES: DuesStatus[] = [
  DuesStatus.PENDING,
  DuesStatus.OVERDUE,
  DuesStatus.PARTIALLY_PAID,
]

export const duesKeys = {
  all: ['dues'] as const,
  list: (statuses: DuesStatus[]) => [...duesKeys.all, 'list', statuses.join(',')] as const,
}

export function useUnpaidDues() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: duesKeys.list(UNPAID_STATUSES),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<DuesListResponse>(
        '/dues',
        { params: { limit: 50, status: UNPAID_STATUSES.join(',') } },
        session?.tenantId,
      ),
  })
}
