'use client'

import { useCallback, useMemo, useState } from 'react'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface SiteOption {
  id: string
  name: string
  city: string
}

interface SiteSwitcherProps {
  sites: SiteOption[]
  selectedSiteId: string | null
  onSelect: (siteId: string) => void
  disabled?: boolean
}

export function SiteSwitcher({ sites, selectedSiteId, onSelect, disabled = false }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false)

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId],
  )

  // Group sites by city
  const groupedSites = useMemo(() => {
    const groups = new Map<string, SiteOption[]>()
    for (const site of sites) {
      const cityGroup = groups.get(site.city) ?? []
      cityGroup.push(site)
      groups.set(site.city, cityGroup)
    }
    return groups
  }, [sites])

  const handleSelect = useCallback(
    (siteId: string) => {
      onSelect(siteId)
      setOpen(false)
    },
    [onSelect],
  )

  if (sites.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="flex h-11 items-center gap-2 rounded-2xl border border-white/85 bg-white/78 px-3.5 text-[13px] text-[#8a9bb0] shadow-[0_10px_24px_rgba(8,17,31,0.05)]"
      >
        <Building2 className="h-3.5 w-3.5" />
        <span>Bina bulunamadı</span>
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-11 min-w-[15rem] items-center gap-2 rounded-2xl border border-white/85 bg-white/82 px-3.5 text-[13px] font-medium text-[#0d182b] shadow-[0_12px_28px_rgba(8,17,31,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#6d8ef8]/12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#31538c]">
            <Building2 className="h-4 w-4 shrink-0" />
          </span>
          <span className="flex-1 text-left truncate">
            {selectedSite ? `${selectedSite.name}` : 'Bina seçiniz'}
          </span>
          {selectedSite && (
            <span className="shrink-0 rounded-full border border-[#dde8fb] bg-[#f3f7ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6080b2]">
              {selectedSite.city}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#8fa0b5]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-[24px] border-white/80 bg-white/90 p-1 shadow-[0_22px_50px_rgba(8,17,31,0.12)] backdrop-blur-2xl" align="start">
        <Command>
          <CommandInput placeholder="Site ara..." />
          <CommandList>
            <CommandEmpty>Site bulunamadı.</CommandEmpty>
            {Array.from(groupedSites.entries()).map(([city, citySites]) => (
              <CommandGroup key={city} heading={city}>
                {citySites.map((site) => (
                  <CommandItem
                    key={site.id}
                    value={`${site.name} ${site.city}`}
                    onSelect={() => handleSelect(site.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        selectedSiteId === site.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="font-medium">{site.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
