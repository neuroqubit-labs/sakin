'use client'

import { Breadcrumb } from '@/components/breadcrumb'
import { useSiteContext } from '@/providers/site-provider'

interface ScopedBreadcrumbProps {
  module: string
  portfolioScope?: boolean
}

export function ScopedBreadcrumb({ module, portfolioScope = false }: ScopedBreadcrumbProps) {
  const { selectedSiteId, availableSites } = useSiteContext()
  const site = availableSites.find((s) => s.id === selectedSiteId)

  const items = portfolioScope || !site
    ? [{ label: 'Portföy', href: '/sites' }, { label: module }]
    : [{ label: 'Portföy', href: '/sites' }, { label: site.name, href: `/sites/${site.id}` }, { label: module }]

  return (
    <div className="px-1">
      <Breadcrumb items={items} />
    </div>
  )
}
