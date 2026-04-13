'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ArrowUpRight } from 'lucide-react'
import { navItems, siteConfig } from '@/content/site-content'
import { ButtonLink } from '@/components/marketing/button'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/50 bg-stone-50/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3.5 text-navy-950" href="/">
          <span className="flex h-12 items-center rounded-[1.05rem] bg-navy-950 px-4 shadow-panel ring-1 ring-navy-950/8">
            <Image
              alt={siteConfig.companyName}
              className="h-auto w-[7.9rem]"
              height={55}
              priority
              src={siteConfig.brand.logos.primary}
              width={138}
            />
          </span>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="text-[10px] uppercase tracking-[0.32em] text-navy-900/46">{siteConfig.companyName}</span>
            <span className="text-sm font-semibold tracking-tight">{siteConfig.productName}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <Link
              aria-current={pathname === item.href ? 'page' : undefined}
              key={item.href}
              className={cn(
                'rounded-full px-3 py-2 text-sm font-medium transition',
                pathname === item.href
                  ? 'bg-white text-navy-950 shadow-sm ring-1 ring-navy-900/8'
                  : 'text-navy-900/72 hover:text-navy-950',
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink href={siteConfig.adminUrl} variant="secondary">
            Müşteri Girişi
            <ArrowUpRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/iletisim#demo-form">Demo Talebi</ButtonLink>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex list-none cursor-pointer items-center justify-center rounded-full border border-navy-900/10 bg-white p-3 text-navy-950 shadow-sm marker:hidden">
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 mt-3 w-[18rem] rounded-[28px] border border-white/60 bg-white/95 p-4 shadow-panel backdrop-blur-xl">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  aria-current={pathname === item.href ? 'page' : undefined}
                  key={item.href}
                  className={cn(
                    'block rounded-2xl px-4 py-3 text-sm font-medium transition',
                    pathname === item.href
                      ? 'bg-[#f4efe7] text-navy-950'
                      : 'text-navy-900 hover:bg-stone-100',
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <ButtonLink href="/iletisim#demo-form" className="w-full justify-center">
                Demo Talebi
              </ButtonLink>
              <ButtonLink href={siteConfig.adminUrl} variant="secondary" className="w-full justify-center">
                Müşteri Girişi
              </ButtonLink>
            </div>
          </div>
        </details>
      </div>
    </header>
  )
}
