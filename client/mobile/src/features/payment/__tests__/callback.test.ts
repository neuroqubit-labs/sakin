import { parseCallbackStatus } from '../callback'

describe('parseCallbackStatus', () => {
  it('returns success only when status=success', () => {
    expect(parseCallbackStatus('sakin://payment/callback?status=success')).toBe('success')
  })

  it('returns failure for failure/error/cancelled', () => {
    expect(parseCallbackStatus('sakin://payment/callback?status=failure')).toBe('failure')
    expect(parseCallbackStatus('sakin://payment/callback?status=error')).toBe('failure')
    expect(parseCallbackStatus('sakin://payment/callback?status=cancelled')).toBe('failure')
  })

  it('returns unknown when status is missing (no optimistic success)', () => {
    expect(parseCallbackStatus('sakin://payment/callback')).toBe('unknown')
    expect(parseCallbackStatus('sakin://payment/callback?token=abc')).toBe('unknown')
  })

  it('returns unknown for malformed urls', () => {
    expect(parseCallbackStatus('not-a-url')).toBe('unknown')
    expect(parseCallbackStatus('')).toBe('unknown')
  })
})
