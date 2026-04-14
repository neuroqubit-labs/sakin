'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="ledger-label mb-2">Ayar Alanı</p>
      <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[#0d182b]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#6f8197]">{description}</p>
    </div>
  )
}

export function SectionShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ledger-panel overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function SoftPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`ledger-panel-soft p-4 md:p-5 ${className}`}>{children}</div>
}

export function SectionSkeleton() {
  return (
    <div className="ledger-panel p-5 space-y-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-40 w-full rounded-2xl" />
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
    <div className="rounded-[20px] border border-white/85 bg-white/80 px-4 py-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#72839b]">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate text-xs text-[#374151]">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-[#9ca3af] transition-colors hover:text-[#0c1427]"
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
    <div className="rounded-[22px] border border-white/85 bg-white/82 p-4 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#72839b]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#0c1427]">
        {value.toLocaleString('tr-TR')}
        {max != null ? <span className="text-sm font-normal text-[#9ca3af]"> / {max.toLocaleString('tr-TR')}</span> : null}
        {unit ? <span className="ml-1 text-sm font-normal text-[#9ca3af]">{unit}</span> : null}
      </p>
      {percent != null ? (
        <div className="mt-3 h-1.5 w-full rounded-full bg-[#e5ebf4]">
          <div
            className={`h-full rounded-full transition-all ${percent > 90 ? 'bg-[#dc2626]' : percent > 70 ? 'bg-[#f59e0b]' : 'bg-[#1d3b67]'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
