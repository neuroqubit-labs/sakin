import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  eyebrow: string
  title: string
  description: string
  align?: 'left' | 'center'
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={cn('space-y-4', align === 'center' && 'mx-auto max-w-3xl text-center')}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-navy-900/42">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">{title}</h2>
      <p className="max-w-2xl text-pretty text-base leading-8 text-navy-900/70">{description}</p>
    </div>
  )
}
