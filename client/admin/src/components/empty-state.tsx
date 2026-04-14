import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionHref }: EmptyStateProps) {
  return (
    <div role="status" className="motion-in motion-fade px-5 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/80 bg-white/78 shadow-[0_14px_30px_rgba(8,17,31,0.06)]">
        <Icon className="h-6 w-6 text-[#7d8ea5]" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold tracking-[-0.03em] text-[#0c1427]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{description}</p>
      {actionLabel && (actionHref ? (
        <Link href={actionHref}>
          <Button size="sm" variant="outline" className="mt-4">{actionLabel}</Button>
        </Link>
      ) : onAction ? (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAction}>{actionLabel}</Button>
      ) : null)}
    </div>
  )
}
