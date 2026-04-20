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
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
  attachments: (id: string) => [...ticketKeys.all, 'attachments', id] as const,
}

export interface TicketComment {
  id: string
  body: string
  isInternal: boolean
  createdAt: string
  author: { displayName: string | null } | null
}

export interface TicketDetail extends TicketItem {
  resolution: string | null
  resolvedAt: string | null
  closedAt: string | null
  comments: TicketComment[]
  reportedById: string | null
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

export interface TicketAttachmentMeta {
  id: string
  mimeType: string
  sizeBytes: number
  originalName: string | null
  createdAt: string
  downloadUrl: string
}

export interface UploadAttachmentInput {
  ticketId: string
  mimeType: string
  data: string
  originalName?: string | null
}

export function useTicketDetail(ticketId: string | null) {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: ticketKeys.detail(ticketId ?? ''),
    enabled: Boolean(session) && Boolean(ticketId),
    queryFn: () =>
      apiClient<TicketDetail>(`/tickets/${ticketId}`, {}, session?.tenantId),
  })
}

export function useTicketAttachments(ticketId: string | null) {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: ticketKeys.attachments(ticketId ?? ''),
    enabled: Boolean(session) && Boolean(ticketId),
    queryFn: () =>
      apiClient<TicketAttachmentMeta[]>(
        `/tickets/${ticketId}/attachments`,
        {},
        session?.tenantId,
      ),
  })
}

export interface AttachmentPayload {
  mimeType: string
  filename: string
  data: string
}

export function useTicketAttachmentPayload(attachmentId: string | null) {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: [...ticketKeys.all, 'attachment-payload', attachmentId ?? ''] as const,
    enabled: Boolean(session) && Boolean(attachmentId),
    // Base64 gövdeler büyük; kullanıcı aynı ekranı açmadığı sürece tekrar çekmeye gerek yok.
    staleTime: Infinity,
    queryFn: () =>
      apiClient<AttachmentPayload>(
        `/tickets/attachments/${attachmentId}/download`,
        {},
        session?.tenantId,
      ),
  })
}

export function useAddTicketComment(ticketId: string) {
  const { session } = useAuthSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      apiClient<TicketComment>(
        `/tickets/${ticketId}/comments`,
        { method: 'POST', body: JSON.stringify({ body }) },
        session?.tenantId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) })
    },
  })
}

export function useUploadTicketAttachment() {
  const { session } = useAuthSession()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, ...body }: UploadAttachmentInput) =>
      apiClient<TicketAttachmentMeta>(
        `/tickets/${ticketId}/attachments`,
        { method: 'POST', body: JSON.stringify(body) },
        session?.tenantId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}
