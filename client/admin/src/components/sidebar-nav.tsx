'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AdminNavItem } from '@/lib/access-policy'

interface SidebarNavProps {
  title: string
  items: AdminNavItem[]
}

export function SidebarNav({ title, items }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-72 ledger-sidebar flex-col">
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg ledger-gradient text-white text-sm font-bold grid place-items-center">SY</div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#0c1427] leading-tight">Sakin Yönetim</h1>
            <p className="text-[11px] text-[#6e7882] mt-1 font-medium">{title}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ledger-nav-item ${active ? 'ledger-nav-item-active' : ''}`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs font-bold">
                {item.icon ?? '--'}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 pb-4">
        <div className="ledger-gradient-soft rounded-lg p-3 text-white shadow-[0_10px_22px_rgba(12,20,39,0.18)]">
          <p className="text-[10px] uppercase tracking-[0.15em] opacity-75">Çalışma Modu</p>
          <p className="text-xs font-semibold mt-1">Hızlı Tahsilat ve Operasyon</p>
          <p className="text-[11px] opacity-80 mt-2">Yoğun finans takibi için optimize edildi.</p>
        </div>
      </div>
    </aside>
  )
}
