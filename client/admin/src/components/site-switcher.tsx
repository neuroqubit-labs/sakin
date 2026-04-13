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
        className="flex h-8 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-2.5 text-[13px] text-[#9ca3af]"
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
          className="flex h-8 min-w-52 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-2.5 text-[13px] font-medium text-[#0c1427] hover:bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-[#0c1427] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
          <span className="flex-1 text-left truncate">
            {selectedSite ? `${selectedSite.name}` : 'Bina seçiniz'}
          </span>
          {selectedSite && (
            <span className="text-[11px] text-[#9ca3af] shrink-0">{selectedSite.city}</span>
          )}
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-[#9ca3af]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
