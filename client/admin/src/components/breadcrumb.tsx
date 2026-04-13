'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3 w-3 text-[#9ca3af]" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-[#6b7280] hover:text-[#0c1427] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#0c1427]">{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
