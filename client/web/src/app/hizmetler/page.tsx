import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/marketing/reveal'
import { SectionHeading } from '@/components/marketing/section-heading'
import { buildMetadata } from '@/lib/metadata'
import { serviceItems, serviceOutcomes, servicesHeroPanel } from '@/content/site-content'

export const metadata = buildMetadata({
  path: '/hizmetler',
  title: 'Hizmetler',
  description:
    'Aidat takibi, tahsilat yönetimi, gider görünürlüğü ve sakin iletişimi için kurumsal çalışma başlıkları.',
})

export default function ServicesPage() {
  return (
    <>
      <PageHero
        description="Hizmet dili, teknik liste değil; yönetim firmalarının iş yükünü azaltan kurumsal modüller üzerine kurulur."
        eyebrow="Hizmetler"
        backgroundImage="/media/mint-architecture.png"
        panelItems={servicesHeroPanel}
        panelTitle="Hizmet Çerçevesi"
        title="Operasyonu hızlandıran, yönetimi şeffaflaştıran hizmet seti."
      />

      <section className="section-line relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-14"
          style={{ backgroundImage: 'url(/media/residential-terrace.png)' }}
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
                description="Her başlık ekiplerin karar ve aksiyon hızını artırır."
                eyebrow="Çalışma Başlıkları"
                title="Yönetim ekibinin her gün kullandığı çekirdek modüller."
              />
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {serviceItems.map((service, index) => (
              <Reveal
                key={service.title}
                className="rounded-[2rem] border border-navy-900/8 bg-white/86 p-6 shadow-halo backdrop-blur-md"
                delay={index * 0.05}
              >
                <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy-950">{service.title}</h2>
                <p className="mt-3 text-sm leading-7 text-navy-900/66">{service.description}</p>
                <ul className="mt-6 grid gap-3 text-sm leading-7 text-navy-900/62">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-3 h-1.5 w-1.5 rounded-full bg-[#445d81]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-line relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <video
            autoPlay
            className="h-full w-full object-cover opacity-18"
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/media/liquid-clarity.mp4" type="video/mp4" />
          </video>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: 'url(/media/precision-balance.png)' }}
        />
        <div className="pointer-events-none absolute inset-0 media-wash" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(245,241,235,0.95)_0%,rgba(255,255,255,0.98)_100%)]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-20">
          <Reveal className="rounded-[2.2rem] bg-[linear-gradient(160deg,#0d1930_0%,#172844_70%,#71829f_100%)] p-8 text-white shadow-panel">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/46">Hizmet Etkisi</p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight">
              Hizmeti değil, yarattığı etkiyi anlatıyoruz.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-8 text-white/74">
              Vaat ettiğimiz şey özellik kalabalığı değil; günlük iş yükünü ölçülebilir şekilde sadeleştiren bir yapı.
            </p>
            <p className="mt-6 text-sm leading-7 text-white/66">
              Sakin Yönetim, Wafra Software ürün standardı ve kurumsal teslim yaklaşımıyla şekillenir.
            </p>
          </Reveal>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-navy-900/8 bg-white/86 px-6 py-2 shadow-halo backdrop-blur-md">
              {serviceOutcomes.map((item, index) => (
                <Reveal
                  key={item.title}
                  className="grid gap-4 border-b border-navy-900/8 py-6 last:border-b-0 lg:grid-cols-[auto_1fr]"
                  delay={index * 0.05}
                >
                  <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-navy-950">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-navy-900/66">{item.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
