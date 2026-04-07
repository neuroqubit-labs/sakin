'use client'

import Link from 'next/link'
import { StaffPageHeader } from '@/components/staff-surface'

export default function ResidentsPage() {
  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Sakinler"
        subtitle="Tenant çapında sakin kayıtları ve ilişkilendirildiği daire bilgileri."
        actions={<button className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">Yeni Sakin Ekle</button>}
      />

      <div className="ledger-panel p-6 space-y-3">
        <p className="text-sm text-[#6b7280]">
          Operasyonel sakin listesi staff workspace altında <Link href="/work/units" className="font-semibold text-[#0c1427] underline">Daireler</Link> ekranında aktif olarak kullanılmaktadır.
        </p>
        <p className="text-sm text-[#6b7280]">Bu sayfa tenant-admin için toplu yönetim ve import/export fonksiyonlarına genişletilecektir.</p>
      </div>
    </div>
  )
}
