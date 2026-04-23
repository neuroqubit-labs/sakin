'use client'

import React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionCard } from '@/lib/ui-contracts'

interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
  eyebrow?: string
}

export function PageHeader({ title, subtitle, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="ledger-panel motion-in motion-fade relative overflow-hidden px-5 py-5 md:px-7 md:py-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(79,125,247,0.22),transparent_52%)]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-[#4f7df7]/12 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="ledger-label mb-3 inline-flex rounded-full border border-white/80 bg-white/72 px-3 py-1">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="ledger-page-title">{title}</h1>
          <p className="ledger-page-subtitle">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  railPercent?: number
  railClassName?: string
  icon?: LucideIcon
  tone?: 'navy' | 'blue' | 'cyan' | 'amber' | 'emerald' | 'rose'
  className?: string
}

const toneMap = {
  navy: {
    wrap: 'bg-[linear-gradient(135deg,#0f1a2b,#203a63)] text-white shadow-[0_18px_34px_rgba(15,26,43,0.18)]',
    rail: 'bg-[linear-gradient(90deg,#0f1a2b,#4f7df7)]',
  },
  blue: {
    wrap: 'bg-[linear-gradient(135deg,#2563eb,#4f7df7)] text-white shadow-[0_18px_34px_rgba(79,125,247,0.24)]',
    rail: 'bg-[linear-gradient(90deg,#2563eb,#7cb2ff)]',
  },
  cyan: {
    wrap: 'bg-[linear-gradient(135deg,#0f766e,#28c4dd)] text-white shadow-[0_18px_34px_rgba(40,196,221,0.22)]',
    rail: 'bg-[linear-gradient(90deg,#0f766e,#59d7e9)]',
  },
  amber: {
    wrap: 'bg-[linear-gradient(135deg,#b45309,#f59e0b)] text-white shadow-[0_18px_34px_rgba(245,158,11,0.2)]',
    rail: 'bg-[linear-gradient(90deg,#b45309,#f7b955)]',
  },
  emerald: {
    wrap: 'bg-[linear-gradient(135deg,#0f766e,#10b981)] text-white shadow-[0_18px_34px_rgba(16,185,129,0.2)]',
    rail: 'bg-[linear-gradient(90deg,#0f766e,#36d39c)]',
  },
  rose: {
    wrap: 'bg-[linear-gradient(135deg,#be123c,#fb7185)] text-white shadow-[0_18px_34px_rgba(251,113,133,0.2)]',
    rail: 'bg-[linear-gradient(90deg,#be123c,#fb8ea0)]',
  },
} as const

export function KpiCard({
  label,
  value,
  hint,
  railPercent,
  railClassName,
  icon: Icon = Sparkles,
  tone = 'navy',
  className,
}: KpiCardProps) {
  const toneStyle = toneMap[tone]

  return (
    <div className={cn('ledger-panel motion-hover group p-5', className)}>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ledger-label">{label}</p>
          <p className="ledger-value mt-3">{value}</p>
        </div>
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', toneStyle.wrap)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint ? <p className="relative z-10 mt-3 text-xs leading-6 text-[#617287]">{hint}</p> : null}
      {typeof railPercent === 'number' ? (
        <div className="ledger-kpi-rail relative z-10">
          <span
            className={railClassName ?? toneStyle.rail}
            style={{ width: `${Math.min(Math.max(railPercent, 0), 100)}%` }}
          />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4f7df7]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  )
}

export function SectionTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="motion-fade relative z-10 flex items-center justify-between gap-3 border-b border-white/70 bg-[rgba(248,251,255,0.62)] px-5 py-4 transition-all duration-200">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0d182b]">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-6 text-[#71829a]">{subtitle}</p> : null}
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

function priorityTone(priority: ActionCard['priority']) {
  if (priority === 'high') return 'text-[#b42318] bg-[#fff0ee] border-[#ffd8d0]'
  if (priority === 'medium') return 'text-[#9a620f] bg-[#fff7e8] border-[#ffe5ba]'
  return 'text-[#0e7a52] bg-[#effbf3] border-[#cdeedb]'
}

export function ActionBanner({ card }: { card: ActionCard }) {
  const toneClass = priorityTone(card.priority)
  const Icon = card.priority === 'high' ? AlertTriangle : card.priority === 'medium' ? Sparkles : CheckCircle2
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-[0_10px_24px_rgba(8,17,31,0.05)]">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border', toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">{card.metric}</p>
          <p className="mt-1 text-sm font-medium leading-6 text-[#16263d]">{card.message}</p>
          <Link
            href={card.ctaTarget}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#dce7f6] bg-[#f8fbff] px-3 py-1.5 text-xs font-semibold text-[#17345a] transition-colors hover:bg-white"
          >
            {card.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
