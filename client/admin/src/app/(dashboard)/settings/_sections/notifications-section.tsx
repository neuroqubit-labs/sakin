'use client'

import { Bell } from 'lucide-react'
import { SectionHeader } from './shared'

function NotificationToggle({ label, description, enabled, disabled }: {
  label: string
  description: string
  enabled: boolean
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between rounded-md border border-[#e5e7eb] px-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-[#111827]">{label}</p>
        <p className="text-xs text-[#6b7280] mt-0.5">{description}</p>
      </div>
      <div className={`h-5 w-9 rounded-full relative transition-colors ${enabled ? 'bg-[#0c1427]' : 'bg-[#d1d5db]'}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  )
}

export function NotificationsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bildirim Ayarları"
        description="SMS, WhatsApp ve e-posta bildirim kanallarının yapılandırması."
      />

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">SMS Servisi</p>
        <div className="rounded-md bg-[#f9fafb] border border-dashed border-[#d1d5db] p-6 text-center">
          <Bell className="h-8 w-8 text-[#9ca3af] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#374151]">SMS entegrasyonu yakında</p>
          <p className="text-xs text-[#6b7280] mt-1 max-w-sm mx-auto">
            Aidat hatırlatma, ödeme bildirimi ve toplu mesaj gönderimi için SMS servis konfigürasyonu bu alanda yapılacak.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">WhatsApp Entegrasyonu</p>
        <div className="rounded-md bg-[#f9fafb] border border-dashed border-[#d1d5db] p-6 text-center">
          <p className="text-sm font-medium text-[#374151]">WhatsApp Business API yakında</p>
          <p className="text-xs text-[#6b7280] mt-1 max-w-sm mx-auto">
            Sakinlere WhatsApp üzerinden otomatik bildirim gönderimi için yapılandırma bu alanda olacak.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Otomatik Bildirimler</p>
        <div className="space-y-3">
          <NotificationToggle
            label="Aidat hatırlatması"
            description="Vade tarihinden 3 gün önce sakinlere otomatik hatırlatma"
            enabled={false}
            disabled
          />
          <NotificationToggle
            label="Ödeme onayı"
            description="Ödeme başarılı olduğunda sakine bildirim"
            enabled={false}
            disabled
          />
          <NotificationToggle
            label="Gecikme bildirimi"
            description="Aidat geciktiğinde sakin ve yöneticiye bildirim"
            enabled={false}
            disabled
          />
        </div>
        <p className="text-[11px] text-[#9ca3af]">
          Otomatik bildirimler SMS servisi yapılandırıldığında aktif edilebilir.
        </p>
      </div>
    </div>
  )
}
