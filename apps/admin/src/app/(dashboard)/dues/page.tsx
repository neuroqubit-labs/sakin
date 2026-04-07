'use client'

import Link from 'next/link'
import { StaffPageHeader } from '@/components/staff-surface'

export default function DuesPage() {
  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Aidatlar"
        subtitle="Tenant-admin seviyesinde dönemsel tahakkuk yönetimi."
        actions={(
          <Link href="/work/dues" className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
            Work Tahakkuk Ekranı
          </Link>
        )}
      />

      <div className="ledger-panel p-6">
        <p className="text-sm text-[#6b7280]">Aidat operasyonunun aktif yönetim akışı staff workspace’e taşınmıştır. Bu sayfada tenant-admin raporlama ve politika ayarları devam edecektir.</p>
      </div>
    </div>
  )
}
