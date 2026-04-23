'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CreditCard,
  Lock,
  Megaphone,
  TrendingDown,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useDebounce } from '@/hooks/use-debounce'
import { useApiQuery } from '@/hooks/use-api'
import { getNavItemsForRole, hasRouteAccess, getRouteFallbackMessage } from '@/lib/access-policy'
import { formatTry } from '@/lib/formatters'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

/* ------------------------------------------------------------------ */
/*  Context for controlling the palette from anywhere                  */
/* ------------------------------------------------------------------ */

interface CommandPaletteContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UnitSearchItem {
  id: string
  number: string
  site: { name: string }
  residents: Array<{ firstName: string; lastName: string }>
  financial: { openDebt: number; status: string }
}

interface UnitSearchResponse {
  data: UnitSearchItem[]
  meta: { total: number }
}

interface ResidentSearchItem {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  occupancies: Array<{ unit: { number: string; site: { name: string } } }>
}

interface ResidentSearchResponse {
  data: ResidentSearchItem[]
  meta: { total: number }
}

/* ------------------------------------------------------------------ */
/*  Provider + Palette Component                                       */
/* ------------------------------------------------------------------ */

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <CommandPaletteContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CommandPaletteDialog open={isOpen} onClose={close} />
    </CommandPaletteContext.Provider>
  )
}

function CommandPaletteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { role } = useAuth()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Unit search
  const { data: unitSearchData, isLoading: unitSearchLoading } = useApiQuery<UnitSearchResponse>(
    ['command-unit-search', debouncedQuery],
    '/units',
    { search: debouncedQuery, limit: 6, page: 1, isActive: true },
    { enabled: open && debouncedQuery.length >= 2 },
  )

  const unitResults = unitSearchData?.data ?? []

  const { data: residentSearchData, isLoading: residentSearchLoading } = useApiQuery<ResidentSearchResponse>(
    ['command-resident-search', debouncedQuery],
    '/residents',
    { search: debouncedQuery, limit: 6, page: 1 },
    { enabled: open && debouncedQuery.length >= 2 },
  )

  const residentResults = residentSearchData?.data ?? []

  // Filter nav items by role
  const navItems = getNavItemsForRole(role)

  const navigate = (href: string) => {
    router.push(href)
    onClose()
  }

  return (
    <CommandDialog open={open} onClose={onClose}>
      <CommandInput
        placeholder="Sayfa, daire veya sakin ara..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {debouncedQuery.length < 2
            ? 'Aramak için en az 2 karakter yazın...'
            : 'Sonuç bulunamadı.'}
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Hızlı İşlemler">
          {role && !hasRouteAccess('/finance', role) ? (
            <CommandItem disabled className="opacity-80">
              <Lock className="h-4 w-4 text-[#8f8f8f]" />
              <span>Tahsilat Merkezi</span>
              <span className="ml-auto text-[11px] text-[#8a8f99]">
                {getRouteFallbackMessage('/finance') ?? 'Yönetici yetkisi gerekir'}
              </span>
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => navigate('/finance')}>
              <CreditCard className="h-4 w-4 text-[#0f766e]" />
              <span>Tahsilat Merkezi</span>
              <ArrowRight className="ml-auto h-3 w-3 text-[#9ca3af]" />
            </CommandItem>
          )}
          <CommandItem onSelect={() => navigate('/payments')}>
            <CreditCard className="h-4 w-4 text-[#006e2d]" />
            <span>Ödeme Al</span>
            <ArrowRight className="ml-auto h-3 w-3 text-[#9ca3af]" />
          </CommandItem>
          <CommandItem onSelect={() => navigate('/expenses')}>
            <TrendingDown className="h-4 w-4 text-[#ba1a1a]" />
            <span>Gider Ekle</span>
            <ArrowRight className="ml-auto h-3 w-3 text-[#9ca3af]" />
          </CommandItem>
          <CommandItem onSelect={() => navigate('/announcements')}>
            <Megaphone className="h-4 w-4 text-[#8a4b00]" />
            <span>Duyuru Oluştur</span>
            <ArrowRight className="ml-auto h-3 w-3 text-[#9ca3af]" />
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Pages */}
        <CommandGroup heading="Sayfalar">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.href}
                value={`page-${item.label}`}
                onSelect={() => navigate(item.href)}
              >
                <Icon className="h-4 w-4 text-[#6b7280]" />
                <span>{item.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-[#9ca3af]" />
              </CommandItem>
            )
          })}
        </CommandGroup>

        {/* Unit Search Results */}
        {(unitSearchLoading || unitResults.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Daireler">
              {unitSearchLoading ? (
                <div className="py-3 text-center text-xs text-[#6b7280]">Aranıyor...</div>
              ) : (
                unitResults.map((unit) => {
                  const resident = unit.residents[0]
                  const residentName = resident
                    ? `${resident.firstName} ${resident.lastName}`
                    : 'Sakin atanmamış'
                  return (
                    <CommandItem
                      key={unit.id}
                      value={`unit-${unit.number}-${residentName}`}
                      onSelect={() => navigate(`/units/${unit.id}`)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f2f4f6] text-[10px] font-bold text-[#0c1427]">
                        {unit.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0c1427] truncate">
                          {unit.site.name} — Daire {unit.number}
                        </p>
                        <p className="text-xs text-[#6b7280] truncate">{residentName}</p>
                      </div>
                      {unit.financial.openDebt > 0 && (
                        <span className="text-xs font-bold text-[#ba1a1a] tabular-nums">
                          {formatTry(unit.financial.openDebt)}
                        </span>
                      )}
                    </CommandItem>
                  )
                })
              )}
            </CommandGroup>
          </>
        )}

        {(residentSearchLoading || residentResults.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sakinler">
              {residentSearchLoading ? (
                <div className="py-3 text-center text-xs text-[#6b7280]">Aranıyor...</div>
              ) : (
                residentResults.map((resident) => {
                  const occupancy = resident.occupancies[0]
                  const subtitle = occupancy
                    ? `${occupancy.unit.site.name} / Daire ${occupancy.unit.number}`
                    : 'Daire bilgisi yok'
                  return (
                    <CommandItem
                      key={resident.id}
                      value={`resident-${resident.firstName}-${resident.lastName}-${resident.phoneNumber}`}
                      onSelect={() => navigate(`/residents/${resident.id}`)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f2f4f6] text-[10px] font-bold text-[#0c1427]">
                        {resident.firstName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#0c1427]">
                          {resident.firstName} {resident.lastName}
                        </p>
                        <p className="truncate text-xs text-[#6b7280]">{subtitle}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-[#9ca3af]" />
                    </CommandItem>
                  )
                })
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
