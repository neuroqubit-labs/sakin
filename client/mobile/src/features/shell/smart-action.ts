import type { PaymentFlowState } from '@/features/payment/flow-state'

export type SmartActionState =
  | 'resume_payment'
  | 'pay_overdue'
  | 'pay_due'
  | 'view_history'
  | 'hidden'

export interface SmartActionConfig {
  state: SmartActionState
  label: string
  helper: string
  icon: string
  target: '/(tabs)/pay' | '/payment-history' | null
}

interface ResolveInput {
  overdueCount: number
  dueCount: number
  paymentFlow: PaymentFlowState | null
  hidden?: boolean
}

export function resolveSmartAction({
  overdueCount,
  dueCount,
  paymentFlow,
  hidden = false,
}: ResolveInput): SmartActionConfig {
  if (hidden) {
    return {
      state: 'hidden',
      label: '',
      helper: '',
      icon: 'remove',
      target: null,
    }
  }

  if (paymentFlow) {
    return {
      state: 'resume_payment',
      label: 'Durumu Kontrol Et',
      helper: 'Yarim kalan odeme akisini tekrar yuzeye cikar.',
      icon: 'refresh-circle',
      target: '/(tabs)/pay',
    }
  }

  if (overdueCount > 0) {
    return {
      state: 'pay_overdue',
      label: 'Simdi Ode',
      helper: `${overdueCount} gecikmis odemeyi tek akista kapat.`,
      icon: 'arrow-up-circle',
      target: '/(tabs)/pay',
    }
  }

  if (dueCount > 0) {
    return {
      state: 'pay_due',
      label: 'Odeme Yap',
      helper: `${dueCount} acik odeme hazir bekliyor.`,
      icon: 'wallet',
      target: '/(tabs)/pay',
    }
  }

  return {
    state: 'view_history',
    label: 'Son Odemeler',
    helper: 'Gecmis islemlerini ve makbuzlarini ac.',
    icon: 'receipt',
    target: '/payment-history',
  }
}
