import { BrandOwnershipPill } from '@/components/marketing/brand-ownership-pill'
import { ButtonLink } from '@/components/marketing/button'
import type { HeroPanelItem } from '@/content/site-content'

type PageHeroProps = {
  eyebrow: string
  title: string
  description: string
  panelItems?: HeroPanelItem[]
  panelTitle?: string
  backgroundImage?: string
}

export function PageHero({
  eyebrow,
  title,
  description,
  panelItems = [],
  panelTitle = 'Bu sayfada',
  backgroundImage,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {backgroundImage ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-24"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : null}
      {backgroundImage ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" /> : null}
      {backgroundImage ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-scrim-left" /> : null}
      <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,rgba(153,178,211,0.28),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(234,223,206,0.92),transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="relative">
            {backgroundImage ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-5 -inset-y-6 rounded-[2.8rem] media-scrim-ultra"
              />
            ) : null}
            <div className="relative max-w-3xl space-y-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-navy-900/48">{eyebrow}</p>
              <BrandOwnershipPill className="max-w-[28rem]" />
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl lg:text-[3.85rem] lg:leading-[1.02]">
                {title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-navy-900/68">{description}</p>
              <div className="flex flex-wrap items-center gap-4">
                <ButtonLink href="/iletisim#demo-form">Demo Talebi</ButtonLink>
                <ButtonLink href="/urun" variant="secondary">
                  Ürün Akışını İncele
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="media-surface overflow-hidden rounded-[2rem] p-6 shadow-halo">
            <div className="flex items-center justify-between gap-4 border-b border-navy-900/8 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-900/42">{panelTitle}</p>
              <span className="h-2.5 w-2.5 rounded-full bg-[#7d8da8]" />
            </div>

            <div className="mt-4 space-y-4">
              {panelItems.map((item, index) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-[1.4rem] border border-navy-900/8 bg-white/84 px-4 py-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] text-navy-900/38">
                    {String(index + 1).padStart(2, '0')} · {item.label}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-7 text-navy-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
