import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

export interface Residency {
  occupancyId: string
  occupancyRole: string
  isPrimaryResponsible: boolean
  startDate: string
  unitId: string
  unitNumber: string
  floor: number | null
  siteId: string
  siteName: string
  blockId: string | null
  blockName: string | null
}

export const authKeys = {
  all: ['auth'] as const,
  residencies: () => [...authKeys.all, 'residencies'] as const,
}

/**
 * Kullanıcının aktif daire(ler)i. Çoklu daire durumunda mobil "daire seçici"
 * bu hook'u besler; tek daire varsa auto-select.
 */
export function useResidencies() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: authKeys.residencies(),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<{ data: Residency[] }>('/auth/residencies', {}, session?.tenantId),
  })
}
