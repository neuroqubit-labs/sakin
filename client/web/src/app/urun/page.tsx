import { ButtonLink } from '@/components/marketing/button'
import { PageHero } from '@/components/marketing/page-hero'
import { ProductJourneyScene } from '@/components/marketing/product-journey-scene'
import { Reveal } from '@/components/marketing/reveal'
import { SectionHeading } from '@/components/marketing/section-heading'
import { featureItems, journeySteps, productHeroPanel, productPrinciples } from '@/content/site-content'
import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  path: '/urun',
  title: 'Ürün',
  description:
    'Portföy, tahsilat ve daire yönetimini tek platformda toplayan SaaS ürün sayfası.',
})

export default function ProductPage() {
  return (
    <>
      <PageHero
        description="Teknik detaylara boğmadan, ürünün ekiplerin işini nasıl hızlandırdığını anlatıyoruz."
        eyebrow="Ürün"
        backgroundImage="/media/dashboard-isometric.png"
        panelItems={productHeroPanel}
        panelTitle="Ürün Özeti"
        title="Panelin tasarımını değil, yarattığı etkiyi gösteriyoruz."
      />

      <section className="section-line relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-12"
          style={{ backgroundImage: 'url(/media/glass-stream-02.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="space-y-8">
            <div className="relative max-w-4xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-8 h-[12rem] w-full max-w-[44rem] rounded-[2.8rem] media-scrim-ultra"
              />
              <div className="relative">
                <SectionHeading
                  description="Ürün akışı, karar ve aksiyon sıralarını netleştirir."
                  eyebrow="Akış Mantığı"
                  title="Portföyden tahsilata uzanan net düzen."
                />
              </div>
            </div>

            <div className="divide-y divide-navy-900/8 rounded-[2rem] border border-navy-900/8 bg-white/84 px-6 py-2 shadow-halo backdrop-blur-md">
              {featureItems.map((item, index) => (
                <Reveal
                  key={item.title}
                  delay={index * 0.08}
                  className="grid gap-5 py-6 first:pt-4 last:pb-4 lg:grid-cols-[0.52fr_0.48fr]"
                >
                  <div className="space-y-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{item.eyebrow}</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-navy-950">{item.title}</h2>
                    <p className="text-sm leading-7 text-navy-900/66">{item.description}</p>
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

      <section className="section-line relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <video
            autoPlay
            className="h-full w-full object-cover opacity-16"
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/media/portfolio-flow.mp4" type="video/mp4" />
          </video>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-10"
          style={{ backgroundImage: 'url(/media/city-digital-flow-02.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(245,241,235,0.98)_100%)]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="relative space-y-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-5 -inset-y-6 rounded-[2.8rem] media-scrim-ultra"
            />
            <div className="relative space-y-6">
              <SectionHeading
                description="Akışın tek bir ekranda kilitlenmeden ilerlemesi, kurumsal verim kazandırır."
                eyebrow="Görsel Akış"
                title="Portföyden bina katmanına akan veri hattı."
              />
              <p className="max-w-xl text-sm leading-7 text-navy-900/68">
                Yönetim ekipleri için görünürlük, hangi binada ne olduğunu tek bakışta anlama gücüdür.
              </p>
              <p className="max-w-xl text-sm leading-7 text-navy-900/62">
                Bu ürün katmanı, Wafra Software’in kurumsal ürün dili ve teslim standardı üzerinden geliştirilir.
              </p>
            </div>
          </div>

          <Reveal
            aria-hidden="true"
            className="rounded-[2.2rem] border border-white/70 bg-white/82 shadow-panel backdrop-blur-xl"
          >
            <div className="min-h-[18rem]" />
          </Reveal>
        </div>
      </section>

      <section className="section-line relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-12"
          style={{ backgroundImage: 'url(/media/model-light-trace.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            description="Ürünün karakteri, çalışma prensipleriyle netleşir."
            eyebrow="Ürün Karakteri"
            title="Kurumsal kaliteyi taşıyan üç temel prensip."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {productPrinciples.map((item, index) => (
              <Reveal
                key={item.title}
                className="rounded-[1.9rem] border border-white/12 bg-navy-950 p-6 text-white shadow-panel"
                delay={index * 0.05}
              >
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/72">{item.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-line relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: 'url(/media/networked-city-block.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-wash" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="relative max-w-4xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-6 -top-8 h-[12rem] w-full max-w-[44rem] rounded-[2.8rem] media-scrim-ultra"
            />
            <div className="relative">
              <SectionHeading
                description="Bu bölüm, karar akışını net ve ölçülebilir şekilde özetler."
                eyebrow="Çalışma Döngüsü"
                title="Yöneticinin günü hangi sırayla toplandığını gösteren rota."
              />
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {journeySteps.map((step, index) => (
              <Reveal
                key={step.step}
                className={`rounded-[1.8rem] border border-navy-900/8 p-6 shadow-halo ${
                  index % 2 === 0 ? 'bg-[#f7f2ea]/95' : 'bg-white/90'
                } ${index % 2 === 1 ? 'lg:translate-y-6' : ''}`}
                delay={index * 0.05}
              >
                <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{step.step}</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-navy-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-navy-900/66">{step.description}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 flex">
            <ButtonLink href="/iletisim#demo-form">Demo Akışını Konuşalım</ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
