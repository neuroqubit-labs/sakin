'use client'

import { useSiteContext } from '@/providers/site-provider'
import { PageHeader } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { DuesCreatePanel } from '../finance/_components/dues-create-panel'

export default function DuesCreatePage() {
  const { selectedSiteId, hydrated } = useSiteContext()

  if (!hydrated) return null

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Aidat Planla" />
      <PageHeader
        title="Aidat Planla"
        eyebrow="Finans Operasyonu"
        subtitle="Yıllık aidat planı oluşturun veya tek seferlik ek tahakkukları dairelere dağıtın."
      />

      {selectedSiteId ? (
        <DuesCreatePanel siteId={selectedSiteId} />
      ) : (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Aidat & gider işlemleri için önce bir site seçin.</p>
        </div>
      )}
    </div>
  )
}
