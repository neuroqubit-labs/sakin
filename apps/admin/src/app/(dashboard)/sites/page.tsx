'use client'

import { StaffPageHeader } from '@/components/staff-surface'

export default function SitesPage() {
  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Siteler"
        subtitle="Portföydeki bina/site kayıtları ve operasyon durumları."
        actions={<button className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">Yeni Site Ekle</button>}
      />

      <div className="ledger-panel p-6">
        <p className="text-sm text-[#6b7280]">Site yönetim modülü yeni staff yüzeyine uyarlanıyor. Temel CRUD akışları bu panelde devam edecek.</p>
      </div>
    </div>
  )
}
