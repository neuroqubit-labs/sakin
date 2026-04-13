'use client'

import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="ledger-page-title">{title}</h1>
        <p className="ledger-page-subtitle mt-1">{subtitle}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  railPercent?: number
  railClassName?: string
}

export function KpiCard({ label, value, hint, railPercent, railClassName }: KpiCardProps) {
  return (
    <div className="ledger-panel p-4">
      <p className="ledger-label">{label}</p>
      <p className="ledger-value mt-2">{value}</p>
      {hint ? <p className="text-[11px] text-[#5f6a75] mt-2">{hint}</p> : null}
      {typeof railPercent === 'number' ? (
        <div className="ledger-kpi-rail">
          <span className={railClassName ?? 'bg-[#0c1427]'} style={{ width: `${Math.min(Math.max(railPercent, 0), 100)}%` }} />
        </div>
      ) : null}
    </div>
  )
}

export function SectionTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between bg-[#f2f4f6]">
      <div>
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">{title}</h2>
        {subtitle ? <p className="text-xs text-[#6b7280] mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatusPill({ label, tone }: { label: string; tone: 'danger' | 'success' | 'warning' | 'neutral' }) {
  const className =
    tone === 'danger'
      ? 'ledger-chip ledger-chip-danger'
      : tone === 'success'
        ? 'ledger-chip ledger-chip-success'
        : tone === 'warning'
          ? 'ledger-chip ledger-chip-warning'
          : 'ledger-chip ledger-chip-neutral'
  return <span className={className}>{label}</span>
}
