'use client'

import Link from 'next/link'
import { StaffPageHeader } from '@/components/staff-surface'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Ödemeler"
        subtitle="Tahsilat hareketleri, ödeme yöntemleri ve mutabakat akışları."
        actions={(
          <Link href="/work/collections" className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
            Tahsilat Yönetimi
          </Link>
        )}
      />

      <div className="ledger-panel p-6">
        <p className="text-sm text-[#6b7280]">Operasyonel tahsilat yönetimi `work/collections` ekranında aktif. Bu alan tenant-admin için rapor ve denetim odaklı genişletilecektir.</p>
      </div>
    </div>
  )
}
