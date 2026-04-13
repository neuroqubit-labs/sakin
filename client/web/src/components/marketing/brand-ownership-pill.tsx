import { ArrowUpRight } from 'lucide-react'
import { siteConfig } from '@/content/site-content'
import { cn } from '@/lib/utils'

type BrandOwnershipPillProps = {
  className?: string
  variant?: 'light' | 'dark'
}

export function BrandOwnershipPill({
  className,
  variant = 'light',
}: BrandOwnershipPillProps) {
  return (
    <a
      className={cn(
        'inline-flex max-w-full items-center gap-3 rounded-full border px-4 py-2 shadow-halo backdrop-blur-md transition hover:-translate-y-0.5',
        variant === 'light'
          ? 'border-white/72 bg-white/84 text-navy-950'
          : 'border-white/16 bg-navy-950/74 text-white',
        className,
      )}
      href={siteConfig.operatorUrl}
      rel="noreferrer"
      target="_blank"
    >
      <div className="min-w-0">
        <p
          className={cn(
            'text-[10px] font-semibold uppercase tracking-[0.3em]',
            variant === 'light' ? 'text-navy-900/42' : 'text-white/44',
          )}
        >
          {siteConfig.ownershipBadgeLabel}
        </p>
        <p
          className={cn(
            'text-sm font-medium leading-5 tracking-tight sm:truncate',
            variant === 'light' ? 'text-navy-950' : 'text-white',
          )}
        >
          {siteConfig.ownershipBadgeText}
        </p>
      </div>
      <ArrowUpRight
        className={cn(
          'h-4 w-4 shrink-0',
          variant === 'light' ? 'text-navy-900/56' : 'text-white/66',
        )}
      />
    </a>
  )
}
