'use client'

import { useState } from 'react'
import { Building, CreditCard, Bell, BarChart3, Shield, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/surface'
import { ProfileSection } from './_sections/profile-section'
import { PaymentSection } from './_sections/payment-section'
import { NotificationsSection } from './_sections/notifications-section'
import { PlanSection } from './_sections/plan-section'
import { SecuritySection } from './_sections/security-section'
import { UsersSection } from './_sections/users-section'

type SettingsSection = 'profile' | 'payment' | 'notifications' | 'plan' | 'security' | 'users'

const SETTINGS_NAV: Array<{ key: SettingsSection; label: string; icon: typeof Building }> = [
  { key: 'profile', label: 'Şirket Profili', icon: Building },
  { key: 'payment', label: 'Ödeme Entegrasyonu', icon: CreditCard },
  { key: 'notifications', label: 'Bildirim Ayarları', icon: Bell },
  { key: 'plan', label: 'Plan & Abonelik', icon: BarChart3 },
  { key: 'security', label: 'Güvenlik', icon: Shield },
  { key: 'users', label: 'Kullanıcılar', icon: UserCog },
]

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile')

  return (
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Ayarlar"
        eyebrow="Yönetim Konfigürasyonu"
        subtitle="Şirket yapılandırması, entegrasyonlar ve abonelik yönetimi."
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-72 shrink-0">
          <div className="ledger-panel p-4">
            <p className="ledger-label mb-3">Ayar Grupları</p>
            <div className="space-y-1.5">
            {SETTINGS_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`w-full flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-[13px] font-medium transition-all text-left ${
                  section === key
                    ? 'bg-[linear-gradient(135deg,#11203a_0%,#1d3b67_48%,#4f7df7_100%)] text-white shadow-[0_18px_34px_rgba(79,125,247,0.22)]'
                    : 'text-[#4b5563] hover:bg-white hover:text-[#0c1427]'
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
                  section === key ? 'bg-white/16' : 'bg-[#edf4ff] text-[#31568f]'
                }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span>{label}</span>
              </button>
            ))}
            </div>
            <div className="mt-4 rounded-[20px] border border-white/85 bg-white/72 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#72839b]">Kontrol Notu</p>
              <p className="mt-2 text-sm leading-6 text-[#5e7188]">
                Bu alan şirket profilini, ödeme altyapısını ve güvenlik yaklaşımını tek yerde toplar.
              </p>
            </div>
          </div>
        </nav>

        <div className="flex-1 min-w-0 space-y-4">
          {section === 'profile' && <ProfileSection />}
          {section === 'payment' && <PaymentSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'plan' && <PlanSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'users' && <UsersSection />}
        </div>
      </div>
    </div>
  )
}
