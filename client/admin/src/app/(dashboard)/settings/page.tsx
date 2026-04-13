'use client'

import { useState } from 'react'
import { Building, CreditCard, Bell, BarChart3, Shield } from 'lucide-react'
import { PageHeader } from '@/components/surface'
import { ProfileSection } from './_sections/profile-section'
import { PaymentSection } from './_sections/payment-section'
import { NotificationsSection } from './_sections/notifications-section'
import { PlanSection } from './_sections/plan-section'
import { SecuritySection } from './_sections/security-section'

type SettingsSection = 'profile' | 'payment' | 'notifications' | 'plan' | 'security'

const SETTINGS_NAV: Array<{ key: SettingsSection; label: string; icon: typeof Building }> = [
  { key: 'profile', label: 'Şirket Profili', icon: Building },
  { key: 'payment', label: 'Ödeme Entegrasyonu', icon: CreditCard },
  { key: 'notifications', label: 'Bildirim Ayarları', icon: Bell },
  { key: 'plan', label: 'Plan & Abonelik', icon: BarChart3 },
  { key: 'security', label: 'Güvenlik', icon: Shield },
]

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        subtitle="Şirket yapılandırması, entegrasyonlar ve abonelik yönetimi."
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0">
          <div className="space-y-0.5">
            {SETTINGS_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors text-left ${
                  section === key
                    ? 'bg-[#0c1427] text-white'
                    : 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#0c1427]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {section === 'profile' && <ProfileSection />}
          {section === 'payment' && <PaymentSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'plan' && <PlanSection />}
          {section === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  )
}
