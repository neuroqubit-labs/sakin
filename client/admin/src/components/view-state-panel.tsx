import { AlertCircle, Building2, Lock, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import type { ViewState } from '@/lib/ui-contracts'

interface ViewStatePanelProps {
  state: Exclude<ViewState, 'ready'>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  icon?: LucideIcon
}

const STATE_ICONS: Record<Exclude<ViewState, 'ready'>, LucideIcon> = {
  loading: Loader2,
  empty: Building2,
  error: AlertCircle,
  unauthorized: Lock,
}

export function ViewStatePanel({
  state,
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: ViewStatePanelProps) {
  const Icon = icon ?? STATE_ICONS[state]
  return (
    <div className="ledger-panel p-4 md:p-6">
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
    </div>
  )
}
