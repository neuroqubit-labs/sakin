import * as SecureStore from 'expo-secure-store'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

const PAYMENT_FLOW_KEY = 'sakin.payment-flow.v1'

export interface PaymentFlowState {
  status: 'active' | 'unknown'
  duesId: string
  paymentId: string
  amount: number
  updatedAt: string
}

export const paymentFlowKeys = {
  current: () => ['payment-flow'] as const,
}

async function persistPaymentFlow(flow: PaymentFlowState | null): Promise<void> {
  try {
    if (!flow) {
      await SecureStore.deleteItemAsync(PAYMENT_FLOW_KEY)
      return
    }
    await SecureStore.setItemAsync(PAYMENT_FLOW_KEY, JSON.stringify(flow))
  } catch {
    // Sessiz kal: query cache en azindan uygulama acikken state'i tasir.
  }
}

async function loadPaymentFlow(): Promise<PaymentFlowState | null> {
  try {
    const raw = await SecureStore.getItemAsync(PAYMENT_FLOW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PaymentFlowState>
    if (
      (parsed.status !== 'active' && parsed.status !== 'unknown') ||
      typeof parsed.duesId !== 'string' ||
      typeof parsed.paymentId !== 'string' ||
      typeof parsed.amount !== 'number' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null
    }
    return parsed as PaymentFlowState
  } catch {
    return null
  }
}

export function usePaymentFlow() {
  return useQuery({
    queryKey: paymentFlowKeys.current(),
    queryFn: loadPaymentFlow,
    staleTime: Infinity,
  })
}

export async function savePaymentFlow(flow: PaymentFlowState): Promise<void> {
  queryClient.setQueryData(paymentFlowKeys.current(), flow)
  await persistPaymentFlow(flow)
}

export async function clearPaymentFlow(): Promise<void> {
  queryClient.setQueryData(paymentFlowKeys.current(), null)
  await persistPaymentFlow(null)
}
