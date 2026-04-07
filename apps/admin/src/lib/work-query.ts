export interface WorkQueryContract {
  siteId?: string
  page?: number
  limit?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | number | boolean | undefined
}

export function workQuery(params: WorkQueryContract): Record<string, string | number | boolean | undefined> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}
