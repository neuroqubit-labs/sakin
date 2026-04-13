'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SplitButtonOption {
  label: string
  action: () => void
}

interface SplitButtonProps {
  primaryLabel: string
  primaryAction: () => void
  secondaryOptions: SplitButtonOption[]
  disabled?: boolean
  isPending?: boolean
  pendingLabel?: string
}

export function SplitButton({
  primaryLabel,
  primaryAction,
  secondaryOptions,
  disabled = false,
  isPending = false,
  pendingLabel = 'Kaydediliyor...',
}: SplitButtonProps) {
  return (
    <div className="inline-flex rounded-lg shadow-sm">
      <Button
        type="button"
        onClick={primaryAction}
        disabled={disabled || isPending}
        className="rounded-r-none"
      >
        {isPending ? pendingLabel : primaryLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            disabled={disabled || isPending}
            className="rounded-l-none border-l border-white/20 px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {secondaryOptions.map((option) => (
            <DropdownMenuItem key={option.label} onClick={option.action}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
