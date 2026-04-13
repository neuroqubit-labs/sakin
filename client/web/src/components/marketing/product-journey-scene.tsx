'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

const pills = ['Portföy seçimi', 'Geciken borç görünümü', 'Tahsilat sırası', 'Sakin bilgilendirmesi']

export function ProductJourneyScene() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const cardY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [70, -35])
  const cardScale = useTransform(scrollYProgress, [0, 0.4, 1], prefersReducedMotion ? [1, 1, 1] : [0.94, 1, 0.98])
  const glowOpacity = useTransform(scrollYProgress, [0, 0.45, 1], prefersReducedMotion ? [0.5, 0.5, 0.5] : [0.2, 0.7, 0.25])

  return (
    <div ref={containerRef} className="relative h-[32rem] overflow-hidden rounded-[2.2rem] border border-white/60 bg-navy-950 p-5 shadow-panel">
      <motion.div
        aria-hidden
        className="absolute inset-x-[12%] top-[12%] h-40 rounded-full bg-[radial-gradient(circle,rgba(210,223,243,0.85),rgba(125,141,168,0)_72%)] blur-3xl"
        style={{ opacity: glowOpacity }}
      />

      <div className="relative flex h-full flex-col justify-between rounded-[1.7rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,29,55,0.96)_0%,rgba(8,17,32,0.98)_100%)] p-5">
        <div className="flex flex-wrap gap-2">
          {pills.map((pill, index) => (
            <motion.span
              key={pill}
              className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-white/70"
              style={{
                y: prefersReducedMotion ? 0 : index % 2 === 0 ? 8 : -4,
              }}
            >
              {pill}
            </motion.span>
          ))}
        </div>

        <motion.div
          className="grid gap-4 rounded-[1.6rem] border border-white/12 bg-white/6 p-4 backdrop-blur-sm"
          style={{ y: cardY, scale: cardScale }}
        >
          <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.35rem] bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-navy-900/38">Operasyon sırası</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Portföy görünümü', 'Önce hangi binada aksiyon gerektiği netleşir.'],
                  ['Daire bazlı kontrol', 'Borç ve durum alanları dağılıp kaybolmaz.'],
                  ['Tahsilat aksiyonu', 'Hızlı işlem alanı gündelik işi yavaşlatmaz.'],
                ].map(([title, description], index) => (
                  <div key={title} className="rounded-[1rem] bg-stone-50 px-4 py-3">
                    <p className="text-sm font-semibold text-navy-950">
                      {String(index + 1).padStart(2, '0')} · {title}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-navy-900/58">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] bg-[#f5efe6] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-navy-900/38">Kurumsal dil</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-navy-950">Net yüzey hiyerarşisi</p>
                  <p className="mt-1 text-xs leading-6 text-navy-900/58">
                    Kalabalık kart dizileri yerine yönlendiren ve sakin kalan bir bilgi düzeni.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-950">Yerel B2B tonu</p>
                  <p className="mt-1 text-xs leading-6 text-navy-900/58">
                    Firma sahipleri ve ekipleri için gösterişli değil güven veren bir ilk izlenim.
                  </p>
                </div>
                <div className="rounded-[1rem] bg-navy-950 px-4 py-3 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/52">Sonuç</p>
                  <p className="mt-2 text-sm leading-6 text-white/78">
                    Ürün, rapor okumaktan çok iş yaptıran bir kurumsal operasyon masasına dönüşür.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
