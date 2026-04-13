import { ButtonLink } from '@/components/marketing/button'
import { Reveal } from '@/components/marketing/reveal'
import { noHypePrinciples, whySakinPoints } from '@/content/site-content'
import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  path: '/neden-sakin',
  title: 'Neden Sakin',
  description:
    'Bina yönetim firmaları için ölçülebilir değer üreten, sade ve güvenilir SaaS yaklaşımı.',
})

const quickActions = [
  {
    title: 'Tahsilat takibi',
    description: 'Gecikmeleri ve ödeme performansını tek ekranda izleyin.',
  },
  {
    title: 'Bina özeti',
    description: 'Portföyden bina detayına kesintisiz geçiş.',
  },
  {
    title: 'Sakin iletişimi',
    description: 'Duyuru ve hatırlatmaları kayıt altına alın.',
  },
]

const accessibilityFeatures = [
  {
    title: 'Rol bazlı görünüm',
    description: 'Yönetici, muhasebe ve saha ekibi için farklı odaklar.',
  },
  {
    title: 'Tekrarlanabilir süreç',
    description: 'Tahsilat, gider ve duyuru akışları standartlaşır.',
  },
  {
    title: 'Takip ve sorumluluk',
    description: 'Hangi işin kimde olduğu net şekilde görünür.',
  },
  {
    title: 'Kurumsal raporlama',
    description: 'Yönetim raporları karar vermeyi hızlandırır.',
  },
]

export default function WhySakinPage() {
  return (
    <main className="relative overflow-hidden bg-[#eef4f9] text-navy-950">
      <div className="pointer-events-none absolute inset-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-18"
          style={{ backgroundImage: 'url(/media/model-light-trace.png)' }}
        />
        <div className="absolute -top-28 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(125,141,168,0.45),rgba(255,255,255,0))]" />
        <div className="absolute bottom-[-35%] left-[-12%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(118,177,214,0.45),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(234,244,252,0.78)_45%,rgba(255,255,255,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(circle_at_1px_1px,rgba(8,17,32,0.08)_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal className="space-y-6">
            <p className="text-sm uppercase tracking-[0.22em] text-navy-900/60">Neden Sakin</p>
            <h1 className="text-3xl font-display tracking-tight text-navy-950 sm:text-4xl lg:text-5xl">
              Bina yönetim firmaları için kurumsal, ölçülebilir ve hızlı bir SaaS deneyimi.
            </h1>
            <p className="text-lg leading-8 text-navy-900/80 sm:text-xl">
              Wafra Software tarafından sunulan Sakin Yönetim; tahsilat, gider, portföy ve iletişim süreçlerini tek
              platformda birleştirir.
              Amacımız, ekiplerin iş yükünü azaltan ve yönetimin karar almasını hızlandıran bir yapı kurmaktır.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/iletisim#demo-form" size="lg" className="min-h-14 px-7 text-lg">
                Demo talebi
              </ButtonLink>
              <ButtonLink
                href="/urun"
                variant="secondary"
                size="lg"
                className="min-h-14 px-7 text-lg"
              >
                Ürün akışını gör
              </ButtonLink>
            </div>
            <p className="text-base leading-7 text-navy-900/65">
              İhtiyacınıza göre modüler ilerler; hızlı devreye alım ve kademeli geçiş için tasarlandı.
            </p>
          </Reveal>

          <Reveal className="relative" delay={0.08}>
            <div
              aria-hidden="true"
              className="relative overflow-hidden rounded-[2.6rem] border border-white/60 bg-white/70 p-6 shadow-panel backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.2)_45%,rgba(255,255,255,0.6)_100%)] opacity-70" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between text-sm font-semibold text-navy-900/60">
                  <span>09:41</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-navy-900/40" />
                    <span className="h-2 w-2 rounded-full bg-navy-900/40" />
                    <span className="h-2 w-2 rounded-full bg-navy-900/40" />
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/70 bg-white/80 p-5 shadow-halo">
                  <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Günlük özet</p>
                  <h2 className="mt-3 text-2xl font-semibold text-navy-950">Tek bakışta durum</h2>
                  <p className="mt-2 text-lg leading-7 text-navy-900/75">
                    Tahsilat, gider ve duyurular tek ekranda, net ve aksiyon odaklı.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Hızlı işlemler</p>
                  <div className="grid gap-3">
                    {quickActions.map((action) => (
                      <div
                        key={action.title}
                        className="flex items-start justify-between rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-4"
                      >
                        <div>
                          <p className="text-lg font-semibold text-navy-950">{action.title}</p>
                          <p className="mt-1 text-base leading-6 text-navy-900/70">{action.description}</p>
                        </div>
                        <span className="mt-2 h-3 w-3 rounded-full bg-navy-900/40" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/70 bg-white/80 px-5 py-4">
                  <p className="text-base font-semibold text-navy-950">Güvenli yardım</p>
                  <p className="mt-2 text-base leading-6 text-navy-900/70">
                    Tek dokunuşla ekip, çağrı veya not oluşturma.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <Reveal className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/70 p-8 shadow-panel backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.7),rgba(255,255,255,0.15)_40%,rgba(255,255,255,0.55))] opacity-70" />
            <div className="relative z-10 space-y-6">
              <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Üç temel neden</p>
              <h2 className="text-2xl font-semibold text-navy-950">Sakin dilini net bir omurgaya bağladık.</h2>
              <ul className="space-y-5 text-lg leading-8 text-navy-900/75">
                {whySakinPoints.map((item) => (
                  <li key={item.title} className="border-l-2 border-navy-900/20 pl-4">
                    <p className="font-semibold text-navy-950">{item.title}</p>
                    <p className="mt-1 text-base leading-7 text-navy-900/70">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/70 p-8 shadow-panel backdrop-blur-xl" delay={0.06}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(200deg,rgba(255,255,255,0.6),rgba(255,255,255,0.15)_45%,rgba(255,255,255,0.55))] opacity-70" />
            <div className="relative z-10 space-y-6">
              <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Ne yapmıyoruz</p>
              <h2 className="text-2xl font-semibold text-navy-950">
                Kullanıcıya yük olan gösteriyi kaldırdık.
              </h2>
              <ul className="space-y-5 text-lg leading-8 text-navy-900/75">
                {noHypePrinciples.map((item) => (
                  <li key={item.title} className="border-l-2 border-navy-900/20 pl-4">
                    <p className="font-semibold text-navy-950">{item.title}</p>
                    <p className="mt-1 text-base leading-7 text-navy-900/70">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-10 rounded-[2.2rem] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Kurumsal Standart</p>
          <h2 className="mt-3 text-2xl font-semibold text-navy-950">
            Kullanım kolaylığı ve kurumsal kontrol birlikte tasarlandı.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {accessibilityFeatures.map((feature) => (
              <div key={feature.title} className="rounded-[1.6rem] border border-white/70 bg-white/80 px-5 py-5">
                <p className="text-lg font-semibold text-navy-950">{feature.title}</p>
                <p className="mt-2 text-base leading-7 text-navy-900/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-10 rounded-[2.4rem] border border-white/60 bg-white/80 p-8 text-center shadow-panel backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.22em] text-navy-900/55">Detaylı geliştirme</p>
          <h2 className="mt-3 text-2xl font-semibold text-navy-950 sm:text-3xl">
            İhtiyacınıza göre doğru akışı birlikte kurgulayalım.
          </h2>
          <p className="mt-4 text-lg leading-8 text-navy-900/75">
            Demo akışında süreçler, ekip rolleri ve raporlama ihtiyaçları netleşir. Hedefimiz, hızlı ve ölçülebilir
            bir operasyon yüzeyi kurmaktır.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/iletisim#demo-form" size="lg" className="min-h-14 px-7 text-lg">
              Görüşme planla
            </ButtonLink>
            <ButtonLink
              href="/iletisim"
              variant="secondary"
              size="lg"
              className="min-h-14 px-7 text-lg"
            >
              İletişim bilgileri
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </main>
  )
}
