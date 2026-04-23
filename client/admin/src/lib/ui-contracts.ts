import type { UserRole } from '@sakin/shared'

export type AdminModule = 'operations' | 'finance' | 'communication'

export interface NavigationVisibilityPolicy {
  role: UserRole
  module: AdminModule
  visible: boolean
  fallbackMessageKey: string | null
}

export type ViewState = 'loading' | 'empty' | 'error' | 'unauthorized' | 'ready'

export interface ActionCard {
  priority: 'high' | 'medium' | 'low'
  metric: string
  message: string
  ctaLabel: string
  ctaTarget: string
}
