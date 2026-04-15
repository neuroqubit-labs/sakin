import { useMutation, useQuery } from '@tanstack/react-query'
import type { PaymentMethod } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'
import { queryClient } from '@/lib/query-client'
import { duesKeys } from '@/features/dues/queries'

export interface PaymentItem {
  id: string
  amount: string | number
  currency: string
  method: PaymentMethod
  status: string
  receiptNumber: string | null
  note: string | null
  paidAt: string | null
  confirmedAt: string | null
  createdAt: string
  dues: {
    periodMonth: number
    periodYear: number
    description: string | null
  } | null
  unit: {
    number: string
    site: { name: string }
  } | null
}

export interface CheckoutResponse {
  paymentId: string
  attemptId: string
  token: string
  checkoutFormContent: string
  amount: number
  currency: string
}

export const paymentKeys = {
  all: ['payments'] as const,
  mine: () => [...paymentKeys.all, 'mine'] as const,
}

export function useMyPayments() {
  const { session } = useAuthSession()
  return useQuery({
    queryKey: paymentKeys.mine(),
    enabled: Boolean(session),
    queryFn: () =>
      apiClient<{ data: PaymentItem[] }>(
        '/payments/my',
        { params: { limit: 50 } },
        session?.tenantId,
      ),
  })
}

interface StartPaymentInput {
  duesId: string
  callbackUrl: string
}

export function useStartPayment() {
  const { session } = useAuthSession()
  return useMutation({
    mutationFn: (input: StartPaymentInput) =>
      apiClient<CheckoutResponse>(
        '/payments/checkout',
        { method: 'POST', body: JSON.stringify(input) },
        session?.tenantId,
      ),
    onSuccess: () => {
      // Ödeme sonrası teyit webview üzerinden gelecek; borç/ödeme listelerini yenile.
      void queryClient.invalidateQueries({ queryKey: duesKeys.all })
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all })
    },
  })
}
