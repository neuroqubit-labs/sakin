import { ArrowRight, Building2, Compass, Layers3, MessageSquareMore } from 'lucide-react'
import { buildMetadata } from '@/lib/metadata'
import {
  featureItems,
  heroStats,
  journeySteps,
  serviceItems,
  whySakinPoints,
} from '@/content/site-content'
import { BrandOwnershipPill } from '@/components/marketing/brand-ownership-pill'
import { ButtonLink } from '@/components/marketing/button'
import { DashboardPreview } from '@/components/marketing/dashboard-preview'
import { ProductJourneyScene } from '@/components/marketing/product-journey-scene'
import { Reveal } from '@/components/marketing/reveal'
import { SectionHeading } from '@/components/marketing/section-heading'

export const metadata = buildMetadata({
  path: '/',
  title: 'Bina yönetim firmaları için kurumsal operasyon yüzeyi',
  description:
    'Aidat, tahsilat, gider ve sakin iletişimini daha düzenli bir akışta toplayan modern bina yönetim platformu.',
})

const iconMap = [Layers3, Building2, Compass, MessageSquareMore] as const

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-18"
          style={{ backgroundImage: 'url(/media/glass-ribbons-01.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-scrim-left" />
        <div className="hero-ribbon absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="relative z-10 flex flex-col justify-center">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -inset-y-8 rounded-[3rem] media-scrim-ultra" />
            <Reveal className="relative space-y-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-navy-900/48">
                Yönetim Firmaları İçin Kurumsal SaaS
              </p>
              <BrandOwnershipPill className="max-w-[30rem]" />
              <div className="space-y-5">
                <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-navy-950 sm:text-6xl lg:text-[4.5rem] lg:leading-[0.98]">
                  Bina yönetim operasyonlarını tek panelde toplayan, daha{' '}
                  <span className="display-accent">ölçeklenebilir</span> ve daha{' '}
                  <span className="display-accent">izlenebilir</span> bir kurumsal platform.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-navy-900/68">
                  Tahsilat, gider, portföy ve sakin iletişimini tek akışta birleştirip ekiplerin karar ve aksiyon
                  hızını artırıyoruz.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <ButtonLink href="/iletisim#demo-form" size="lg">
                  Demo Talebi
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/urun" size="lg" variant="secondary">
                  Ürün Akışını Gör
                </ButtonLink>
              </div>

              <div className="grid gap-4 border-t border-navy-900/8 pt-6 sm:grid-cols-3">
                {heroStats.map((stat, index) => (
                  <Reveal key={stat.label} delay={index * 0.08} className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{stat.label}</p>
                    <p className="text-sm leading-7 text-navy-900/68">{stat.value}</p>
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="relative">
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      <section id="hizmet-omurgasi" className="section-line scroll-mt-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-14"
          style={{ backgroundImage: 'url(/media/glass-stream-01.png)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-left opacity-[0.08]"
          style={{ backgroundImage: 'url(/media/glass-ribbons-02.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="relative max-w-4xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-6 -top-8 h-[13rem] w-full max-w-[46rem] rounded-[2.8rem] media-scrim-ultra"
            />
            <div className="relative">
              <SectionHeading
                description="Ürün detayına boğmadan, yönetim firmalarının en kritik iş yüklerini kurumsal bir dille özetliyoruz."
                eyebrow="Hizmet Omurgası"
                title="Günlük operasyonu taşıyan dört ana modül."
              />
            </div>
          </div>

          <div className="mt-10 divide-y divide-navy-900/8 rounded-[2.2rem] border border-navy-900/8 bg-white/88 shadow-halo backdrop-blur-md">
            {serviceItems.map((service, index) => {
              const Icon = iconMap[index] ?? Layers3

              return (
                <Reveal
                  key={service.title}
                  className="grid gap-6 px-6 py-7 lg:grid-cols-[0.25fr_0.75fr] lg:px-8"
                  delay={index * 0.06}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-navy-900/10 bg-[#f6f2ec] text-navy-950">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/36">
                        {String(index + 1).padStart(2, '0')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr]">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold tracking-tight text-navy-950">{service.title}</h3>
                      <p className="text-sm leading-7 text-navy-900/68">{service.description}</p>
                    </div>
                    <ul className="grid gap-3 text-sm leading-7 text-navy-900/66">
                      {service.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className="mt-3 h-1.5 w-1.5 rounded-full bg-[#445d81]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section id="urun-vitrini" className="section-line scroll-mt-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-11"
          style={{ backgroundImage: 'url(/media/dashboard-isometric.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-20">
          <div className="space-y-10">
            <div className="relative max-w-4xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-8 h-[13rem] w-full max-w-[44rem] rounded-[2.8rem] media-scrim-ultra"
              />
              <div className="relative">
                <SectionHeading
                  description="Arayüzü değil, değer üreten iş adımlarını öne çıkaran bir ürün vitrini kuruyoruz."
                  eyebrow="Ürün Vitrini"
                  title="Panelin nasıl göründüğünü değil, nasıl değer ürettiğini gösteriyoruz."
                />
              </div>
            </div>

            <div className="divide-y divide-navy-900/8 rounded-[2rem] border border-navy-900/8 bg-white/82 px-6 py-2 shadow-halo backdrop-blur-md">
              {featureItems.map((item, index) => (
                <Reveal
                  key={item.title}
                  delay={index * 0.08}
                  className="grid gap-5 py-6 first:pt-4 last:pb-4 lg:grid-cols-[0.52fr_0.48fr]"
                >
                  <div className="space-y-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{item.eyebrow}</p>
                    <h3 className="text-2xl font-semibold tracking-tight text-navy-950">{item.title}</h3>
                    <p className="text-sm leading-7 text-navy-900/68">{item.description}</p>
                  </div>
                  <ul className="grid content-start gap-3 text-sm leading-7 text-navy-900/62">
                    {item.points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span className="mt-3 h-1.5 w-1.5 rounded-full bg-[#445d81]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={0.12}>
            <ProductJourneyScene />
          </Reveal>
        </div>
      </section>

      <section id="operasyon-akisi" className="section-line scroll-mt-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-12"
          style={{ backgroundImage: 'url(/media/city-digital-flow-01.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="relative mx-auto max-w-4xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 -top-8 h-[11rem] rounded-[2.8rem] media-scrim-ultra"
            />
            <div className="relative">
              <SectionHeading
                align="center"
                description="Portföyden aksiyona uzanan tek hat, ekiplerin işini hızlandırır."
                eyebrow="Operasyon Akışı"
                title="Portföy → bina → tahsilat → iletişim: tek hat."
              />
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {journeySteps.map((step, index) => (
              <Reveal
                key={step.step}
                className={`rounded-[1.8rem] border border-navy-900/8 p-6 shadow-halo ${
                  index % 2 === 0 ? 'bg-white/90' : 'bg-[#f7f2ea]/95'
                } ${index % 2 === 1 ? 'lg:translate-y-8' : ''}`}
                delay={index * 0.05}
              >
                <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{step.step}</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-navy-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-navy-900/66">{step.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="neden-sakin" className="section-line scroll-mt-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-11"
          style={{ backgroundImage: 'url(/media/precision-balance.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-20">
          <div className="space-y-8">
            <div className="relative max-w-3xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-8 h-[12rem] w-full rounded-[2.8rem] media-scrim-ultra"
              />
              <div className="relative">
                <SectionHeading
                  description="Kurumsal güven, net yapı ve sürdürülebilir süreçle kurulur."
                  eyebrow="Neden Sakin"
                  title="B2B karar vericiler için sade ve güven veren bir vitrin."
                />
              </div>
            </div>

            <Reveal className="rounded-[2rem] border border-navy-900/8 bg-[linear-gradient(180deg,rgba(247,242,234,0.98)_0%,rgba(255,255,255,0.94)_100%)] p-7 shadow-halo backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.3em] text-navy-900/38">Kurumsal Tavır</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-navy-950 sm:text-[2rem] sm:leading-[1.15]">
                İlk izlenimi sloganlarla değil, net hiyerarşi ve kurumsal güvenle kuruyoruz.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-navy-900/66">
                Güçlü görünüm, karmaşık görünüm değildir. Bu yüzden her bölümde net bağlam, ölçülü görsel dil ve hızlı
                aksiyon akışı sunuyoruz.
              </p>
            </Reveal>
          </div>

          <div className="rounded-[2rem] border border-navy-900/8 bg-white/84 px-6 py-2 shadow-halo backdrop-blur-md">
            {whySakinPoints.map((item, index) => (
              <Reveal
                key={item.title}
                className="grid gap-4 border-b border-navy-900/8 py-6 last:border-b-0 lg:grid-cols-[auto_1fr]"
                delay={index * 0.05}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-900/36">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-navy-950">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-navy-900/66">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="son-cta" className="section-line scroll-mt-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(/media/glass-balance-stack.png)' }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Reveal className="overflow-hidden rounded-[2.4rem] border border-white/60 bg-[linear-gradient(135deg,#0d1930_0%,#162742_54%,#647694_100%)] px-6 py-10 text-white shadow-panel sm:px-8 sm:py-12 lg:flex lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/46">Son CTA</p>
              <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Kurumsal sitenizi doğru firmalarla görüşme başlatan bir satış kanalı haline getirelim.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-white/72">
                Demo akışı şimdilik şeffaf V1 kurgusunda; içerik, dil ve güven duygusunu bugünden doğru zemine
                oturtuyoruz.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 lg:mt-0">
              <ButtonLink href="/iletisim#demo-form" className="bg-white text-navy-950 hover:bg-white/92">
                Demo Talebi
              </ButtonLink>
              <ButtonLink
                href="/hizmetler"
                variant="secondary"
                className="border-white/18 bg-white/8 text-white hover:bg-white/12"
              >
                Hizmetleri İncele
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
