import { cn } from '@/lib/utils'

interface BrandLockupProps {
  subtitle?: string
  caption?: string
  inverted?: boolean
  compact?: boolean
  minimal?: boolean
  className?: string
}

export function BrandLockup({
  subtitle,
  caption = 'Wafra Software',
  inverted = false,
  compact = false,
  minimal = false,
  className,
}: BrandLockupProps) {
  return (
    <div className={cn('flex items-start gap-3', compact ? 'gap-2.5' : 'gap-3.5', className)}>
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_16px_30px_rgba(8,17,31,0.12)]',
          inverted
            ? 'border-white/20 bg-white/10 backdrop-blur-xl'
            : 'border-white/85 bg-white/88 backdrop-blur-xl',
        )}
      >
        <img
          src="/brand/wafra/icon.png"
          alt="Wafra"
          width={24}
          height={24}
          loading="eager"
          className="h-6 w-6 object-contain"
        />
      </div>
      <div className="min-w-0">
        <img
          src={inverted ? '/brand/wafra/logo-white.png' : '/brand/wafra/logo-primary.png'}
          alt="Wafra Software"
          width={500}
          height={200}
          loading="eager"
          className={cn('block h-auto w-auto object-contain', compact ? 'max-w-[108px]' : 'max-w-[146px]')}
        />
        <div className={cn('space-y-0.5', compact ? 'mt-1.5' : 'mt-2')}>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.24em]',
              inverted ? 'text-white/60' : 'text-[#7c8ea5]',
            )}
          >
            {caption}
          </p>
          <p
            className={cn(
              'font-semibold tracking-[-0.04em]',
              compact ? 'text-base' : 'text-lg',
              inverted ? 'text-white' : 'text-[#0d182b]',
            )}
          >
            Sakin Yönetim
          </p>
          {!minimal && subtitle ? (
            <p className={cn('text-xs leading-5', inverted ? 'text-white/68' : 'text-[#64758b]')}>{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
