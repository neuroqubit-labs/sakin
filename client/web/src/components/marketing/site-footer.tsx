import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { navItems, siteConfig } from '@/content/site-content'

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-navy-900/8 bg-[#f4efe7]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[-8rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(31,51,85,0.12),rgba(31,51,85,0))]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-3rem] right-[8%] opacity-[0.08] mix-blend-multiply">
        <Image
          alt=""
          className="h-auto w-[12rem]"
          height={220}
          src={siteConfig.brand.logos.mark}
          width={220}
        />
      </div>
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_0.8fr_0.8fr] lg:px-8">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-[1.1rem] bg-navy-950 px-4 py-3 shadow-panel">
            <Image
              alt={siteConfig.companyName}
              className="h-auto w-[8.8rem]"
              height={60}
              src={siteConfig.brand.logos.primary}
              width={154}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-navy-900/46">{siteConfig.relationshipLabel}</p>
            <p className="text-sm leading-7 text-navy-900/64">{siteConfig.ownerStatement}</p>
          </div>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-navy-950">
            Bina yönetim firmaları için daha düzenli, daha görünür ve daha kurumsal bir çalışma yüzeyi.
          </h2>
          <p className="max-w-xl text-sm leading-7 text-navy-900/66">{siteConfig.description}</p>
          <a
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900/72 transition hover:text-navy-950"
            href={siteConfig.operatorUrl}
            rel="noreferrer"
            target="_blank"
          >
            wafrasoftware.com.tr
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-navy-950">Sayfalar</p>
          <div className="grid gap-3 text-sm text-navy-900/68">
            {navItems.map((item) => (
              <Link key={item.href} className="transition hover:text-navy-950" href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-navy-950">İletişim</p>
          <div className="grid gap-3 text-sm text-navy-900/68">
            <a className="transition hover:text-navy-950" href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`}>
              {siteConfig.phone}
            </a>
            <a className="transition hover:text-navy-950" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
            <a className="inline-flex items-center gap-2 transition hover:text-navy-950" href={siteConfig.adminUrl}>
              Müşteri Girişi
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
