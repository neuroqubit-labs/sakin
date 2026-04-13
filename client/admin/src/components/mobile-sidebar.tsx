'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { AdminNavGroup, AdminNavItem } from '@/lib/access-policy'
import { useAuth } from '@/providers/auth-provider'

interface MobileSidebarProps {
  title: string
  mainGroups: AdminNavGroup[]
  bottomItems: AdminNavItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebar({ title, mainGroups, bottomItems, open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#0c1427] text-white text-xs font-bold grid place-items-center">
              S
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold text-[#0c1427]">
                Sakin
              </SheetTitle>
              <p className="text-[11px] text-[#6b7280] leading-tight">{title}</p>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {mainGroups.map((group) => (
            <div key={group.label ?? '_root'} className="mb-1">
              {group.label && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? 'bg-[#0c1427] text-white'
                          : 'text-[#4b5563] hover:bg-[#f0f0f0] hover:text-[#0c1427]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#e5e7eb] px-3 py-3 space-y-0.5">
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0c1427] text-white'
                    : 'text-[#4b5563] hover:bg-[#f0f0f0] hover:text-[#0c1427]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-[#4b5563] hover:bg-[#fee2e2] hover:text-[#ba1a1a] transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
