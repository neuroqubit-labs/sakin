import { ArrowUpRight } from 'lucide-react'
import { DemoForm } from '@/components/marketing/demo-form'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/marketing/reveal'
import { SectionHeading } from '@/components/marketing/section-heading'
import { contactAgenda, contactChannels, contactHeroPanel, faqs } from '@/content/site-content'
import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  path: '/iletisim',
  title: 'İletişim',
  description:
    'Demo talebi, iletişim kanalları ve sık sorulan sorular için kurumsal iletişim sayfası.',
})

export default function ContactPage() {
  return (
    <>
      <PageHero
        description="Kısa bir ihtiyaç analiziyle uygun demo akışını belirliyoruz."
        eyebrow="İletişim"
        backgroundImage="/media/balcony-tablet.png"
        panelItems={contactHeroPanel}
        panelTitle="İletişim Notu"
        title="Firmanıza uygun SaaS akışını birlikte kurgulayalım."
      />

      <section className="section-line relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-18"
          style={{ backgroundImage: 'url(/media/mobile-payment.png)' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 media-scrim-left" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-20">
          <div className="relative space-y-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-5 -inset-y-8 rounded-[2.8rem] media-scrim-strong"
            />
            <div className="relative">
              <SectionHeading
                description="Doğrudan iletişim kanalları ve demo formu burada bir arada."
                eyebrow="Temas Noktaları"
                title="Kurumsal temas için hızlı ve net kanallar."
              />
            </div>

            <div className="relative grid gap-4">
              {contactChannels.map((channel, index) => (
                <Reveal
                  key={channel.title}
                  className="rounded-[1.6rem] border border-navy-900/8 bg-white/88 p-5 shadow-halo backdrop-blur-md"
                  delay={index * 0.05}
                >
                  <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">{channel.title}</p>
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-navy-950"
                    href={channel.href}
                    rel="noreferrer"
                    target={channel.href.startsWith('http') ? '_blank' : undefined}
                  >
                    {channel.value}
                    {channel.href.startsWith('http') ? <ArrowUpRight className="h-4 w-4" /> : null}
                  </a>
                  <p className="mt-2 text-sm leading-7 text-navy-900/66">{channel.detail}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div id="demo-form" className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-5 -inset-y-6 rounded-[2.8rem] media-scrim-strong"
            />
            <div className="relative">
              <DemoForm />
            </div>
          </div>
        </div>
      </section>

      <section className="section-line">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            description="İlk görüşmede hangi çerçeveyi netleştireceğimizi baştan belirliyoruz."
            eyebrow="İlk Görüşme"
            title="Kısa bir görüşmede ele alacağımız başlıklar."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {contactAgenda.map((item, index) => (
              <Reveal
                key={item.title}
                className="rounded-[1.8rem] border border-navy-900/8 bg-[#f7f2ea] p-6"
                delay={index * 0.05}
              >
                <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/38">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-navy-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-navy-900/66">{item.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-line">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            description="En sık sorulan konuları kısa ve net yanıtlıyoruz."
            eyebrow="Kısa SSS"
            title="Demo öncesi netleşen başlıklar."
          />

          <div className="mt-10 divide-y divide-navy-900/8 rounded-[2rem] border border-navy-900/8 bg-[#f7f2ea] px-6 py-2">
            {faqs.map((faq, index) => (
              <Reveal
                key={faq.question}
                className="py-6"
                delay={index * 0.05}
              >
                <h2 className="text-lg font-semibold tracking-tight text-navy-950">{faq.question}</h2>
                <p className="mt-3 text-sm leading-7 text-navy-900/66">{faq.answer}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
