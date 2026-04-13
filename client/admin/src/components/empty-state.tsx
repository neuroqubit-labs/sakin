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
    <div className="px-5 py-12 text-center">
      <Icon className="h-10 w-10 mx-auto text-[#c5c6cd] mb-3" />
      <p className="text-sm font-semibold text-[#0c1427]">{title}</p>
      <p className="text-sm text-[#6b7280] mt-1">{description}</p>
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
