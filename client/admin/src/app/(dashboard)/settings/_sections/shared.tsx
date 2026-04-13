'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// --- Types ---

export interface TenantMeResponse {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  contactPhone: string | null
  city: string | null
  address: string | null
  createdAt: string
  plan: {
    planType: string
    smsCredits: number
    maxUnits: number
    expiresAt: string | null
  } | null
  _count: {
    sites: number
    residents: number
    units: number
  }
}

// --- Shared Components ---

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <p className="text-sm text-[#6b7280] mt-0.5">{description}</p>
    </div>
  )
}

export function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="text-xs font-medium text-[#6b7280] mb-1">{label}</p>
      <div className="flex items-center gap-2 rounded-md bg-[#f9fafb] border border-[#e5e7eb] px-3 py-2">
        <code className="text-xs text-[#374151] flex-1 truncate">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-[#9ca3af] hover:text-[#0c1427] transition-colors"
          aria-label="Kopyala"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

export function StatCard({ label, value, max, unit }: { label: string; value: number; max?: number; unit?: string }) {
  const percent = max ? Math.min(Math.round((value / max) * 100), 100) : null
  return (
    <div className="rounded-lg border border-[#e5e7eb] p-4">
      <p className="text-xs font-medium text-[#6b7280]">{label}</p>
      <p className="text-2xl font-bold text-[#0c1427] mt-1">
        {value.toLocaleString('tr-TR')}
        {max != null && <span className="text-sm font-normal text-[#9ca3af]"> / {max.toLocaleString('tr-TR')}</span>}
        {unit && <span className="text-sm font-normal text-[#9ca3af] ml-1">{unit}</span>}
      </p>
      {percent != null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#e5e7eb]">
          <div
            className={`h-full rounded-full transition-all ${percent > 90 ? 'bg-[#dc2626]' : percent > 70 ? 'bg-[#f59e0b]' : 'bg-[#0c1427]'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
