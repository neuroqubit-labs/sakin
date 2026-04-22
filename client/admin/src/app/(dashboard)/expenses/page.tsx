'use client'

import { useSiteContext } from '@/providers/site-provider'
import { PageHeader } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { ExpensesPanel } from '../finance/_components/expenses-panel'

export default function ExpensesPage() {
  const { selectedSiteId, hydrated } = useSiteContext()

  if (!hydrated) return null

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Giderler" />
      <PageHeader
        title="Giderler"
        eyebrow="Finans Kayıtları"
        subtitle="Gider kayıtları ve kategori dağılımı. Yeni gider girişi için Aidat Planla sayfasını kullanın."
      />

      {selectedSiteId ? (
        <ExpensesPanel siteId={selectedSiteId} />
      ) : (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Gider kayıtlarını görmek için önce bir site seçin.</p>
        </div>
      )}
    </div>
  )
}
