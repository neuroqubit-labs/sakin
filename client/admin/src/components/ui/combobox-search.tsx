'use client'

import * as React from 'react'
import { ChevronsUpDown } from 'lucide-react'
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
import { useDebounce } from '@/hooks/use-debounce'

interface ComboboxSearchProps<T> {
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  items: T[]
  isLoading?: boolean
  onSearch: (query: string) => void
  onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
  displayValue: (item: T | null) => string
  getItemKey: (item: T) => string
  value: T | null
  className?: string
  disabled?: boolean
  groupLabel?: string
}

function ComboboxSearchInner<T>(
  {
    placeholder = 'Seçiniz...',
    searchPlaceholder = 'Ara...',
    emptyMessage = 'Sonuç bulunamadı.',
    items,
    isLoading = false,
    onSearch,
    onSelect,
    renderItem,
    displayValue,
    getItemKey,
    value,
    className,
    disabled = false,
    groupLabel,
  }: ComboboxSearchProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const debouncedQuery = useDebounce(query, 300)

  React.useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  const handleSelect = React.useCallback(
    (item: T) => {
      onSelect(item)
      setOpen(false)
      setQuery('')
    },
    [onSelect],
  )

  const display = value ? displayValue(value) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#0c1427] hover:bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-[#0c1427] disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-[#9ca3af]',
            className,
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-[#6b7280]">Yükleniyor...</div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup heading={groupLabel}>
                  {items.map((item) => (
                    <CommandItem
                      key={getItemKey(item)}
                      value={getItemKey(item)}
                      onSelect={() => handleSelect(item)}
                    >
                      {renderItem(item)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Wrap with forwardRef while preserving generic
export const ComboboxSearch = React.forwardRef(ComboboxSearchInner) as <T>(
  props: ComboboxSearchProps<T> & { ref?: React.Ref<HTMLButtonElement> },
) => React.ReactNode

export type { ComboboxSearchProps }
