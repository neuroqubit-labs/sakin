import { resolveSmartAction } from '@/features/shell/smart-action'

describe('resolveSmartAction', () => {
  it('returns hidden when shell asks for it', () => {
    expect(
      resolveSmartAction({ overdueCount: 1, dueCount: 2, paymentFlow: null, hidden: true }).state,
    ).toBe('hidden')
  })

  it('prioritizes pending payment flow over dues', () => {
    expect(
      resolveSmartAction({
        overdueCount: 3,
        dueCount: 5,
        paymentFlow: {
          status: 'active',
          duesId: 'dues_1',
          paymentId: 'pay_1',
          amount: 1250,
          updatedAt: new Date().toISOString(),
        },
      }).state,
    ).toBe('resume_payment')
  })

  it('prefers overdue payments over regular due items', () => {
    expect(
      resolveSmartAction({ overdueCount: 1, dueCount: 4, paymentFlow: null }).state,
    ).toBe('pay_overdue')
  })

  it('falls back to pay_due when there are only open dues', () => {
    expect(
      resolveSmartAction({ overdueCount: 0, dueCount: 2, paymentFlow: null }).state,
    ).toBe('pay_due')
  })

  it('shows history when user is clear', () => {
    expect(
      resolveSmartAction({ overdueCount: 0, dueCount: 0, paymentFlow: null }).state,
    ).toBe('view_history')
  })
})
