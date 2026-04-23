'use client'

import { useSiteContext } from '@/providers/site-provider'
import { PageHeader } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { PaymentsPanel } from '../finance/_components/payments-panel'
import { ViewStatePanel } from '@/components/view-state-panel'
import { UI_COPY } from '@/lib/ui-copy'

export default function PaymentsPage() {
  const { selectedSiteId, hydrated } = useSiteContext()

  if (!hydrated) return null

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Ödemeler" />
      <PageHeader
        title={UI_COPY.payments.title}
        eyebrow={UI_COPY.payments.eyebrow}
        subtitle={UI_COPY.payments.subtitle}
      />

      {selectedSiteId ? (
        <PaymentsPanel siteId={selectedSiteId} />
      ) : (
        <ViewStatePanel
          state="empty"
          title={UI_COPY.payments.siteRequiredTitle}
          description={UI_COPY.payments.siteRequiredDescription}
        />
      )}
    </div>
  )
}
