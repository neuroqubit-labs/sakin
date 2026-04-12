'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { PaymentCollectModal } from '@/components/payment-collect-modal'
import { apiClient } from '@/lib/api'

interface TopbarNotification {
  id: string
  templateKey: string | null
  status: string
  channel: string
  createdAt: string
  payload: unknown
}

export function WorkTopbar() {
  const { selectedSiteId, setSelectedSiteId, availableSites, hydrated, error } = useSiteContext()
  const { signOut, role, tenantId } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openHelp, setOpenHelp] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notifications, setNotifications] = useState<TopbarNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const today = useMemo(
    () => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(new Date()),
    [],
  )

  const selectedSiteName = useMemo(
    () => availableSites.find((site) => site.id === selectedSiteId)?.name ?? 'Bina seçiniz',
    [availableSites, selectedSiteId],
  )

  const loadNotifications = async () => {
    setNotificationLoading(true)
    setNotificationError(null)
    try {
      const [list, unread] = await Promise.all([
        apiClient<TopbarNotification[]>('/notifications', { params: { limit: 8 } }),
        apiClient<{ count: number }>('/notifications/unread-count'),
      ])
      setNotifications(list)
      setUnreadCount(unread.count)
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Bildirimler yuklenemedi')
    } finally {
      setNotificationLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleNotifications = () => {
    setOpenNotifications((prev) => !prev)
    setOpenHelp(false)
    setOpenProfile(false)
    if (!openNotifications) {
      void loadNotifications()
    }
  }

  const toggleHelp = () => {
    setOpenHelp((prev) => !prev)
    setOpenNotifications(false)
    setOpenProfile(false)
  }

  const toggleProfile = () => {
    setOpenProfile((prev) => !prev)
    setOpenNotifications(false)
    setOpenHelp(false)
  }

  return (
    <div className="sticky top-0 z-20 mb-6 ledger-glass border-b border-[#c5c6cd]/20 px-4 py-3">
      {error ? (
        <div className="mb-3 rounded-md bg-[#ffdad6] px-3 py-2 text-xs font-medium text-[#93000a]">
          Site context hatası: {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#e6e8ea]">
            <span className="text-[10px] font-bold text-[#0c1427]">BLD</span>
            <label htmlFor="site-switcher" className="text-xs font-semibold text-[#4a5563]">
              Aktif Bina
            </label>
          </div>
          <select
            id="site-switcher"
            value={selectedSiteId ?? ''}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            disabled={!hydrated || availableSites.length === 0}
            className="ledger-input min-w-60 bg-white"
          >
            {availableSites.length === 0 ? (
              <option value="">Bina bulunamadı</option>
            ) : (
              availableSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.city})
                </option>
              ))
            )}
          </select>
          <span className="text-xs text-[#5f6a75] hidden md:inline font-medium">{selectedSiteName}</span>
          <span className="text-xs text-[#6b7280] hidden lg:inline">{today}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Daire veya sakin ara..."
              className="ledger-input w-64 bg-white pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const q = search.trim()
                router.push(q ? `/work/units?q=${encodeURIComponent(q)}` : '/work/units')
              }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#607084]">SRC</span>
          </div>

          <button
            type="button"
            onClick={() => setOpenPaymentModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-md ledger-gradient text-white"
          >
            Ödeme Al
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md bg-white relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="h-7 w-7 grid place-items-center rounded-md bg-[#eef1f4] text-[10px] text-[#445266] relative"
            >
              NT
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold grid place-items-center">
                  {Math.min(unreadCount, 99)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={toggleHelp}
              className="h-7 w-7 grid place-items-center rounded-md bg-[#eef1f4] text-[10px] text-[#445266]"
            >
              HP
            </button>
            <button
              type="button"
              onClick={toggleProfile}
              className="h-7 w-7 rounded-full ledger-gradient text-white text-[11px] font-bold grid place-items-center"
            >
              OP
            </button>

            {openNotifications && (
              <div className="absolute top-12 right-0 w-[320px] rounded-md bg-white border border-[#e5e7eb] shadow-lg p-3 z-30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Bildirim Merkezi</p>
                  <button
                    type="button"
                    onClick={() => void loadNotifications()}
                    className="text-xs text-[#5f6a75]"
                  >
                    Yenile
                  </button>
                </div>
                {notificationLoading && <p className="text-xs text-[#6b7280]">Yukleniyor...</p>}
                {notificationError && <p className="text-xs text-red-600">{notificationError}</p>}
                {!notificationLoading && !notificationError && notifications.length === 0 && (
                  <p className="text-xs text-[#6b7280]">Bildirim yok.</p>
                )}
                {!notificationLoading && notifications.map((item) => (
                  <div key={item.id} className="rounded-md bg-[#f8f9fb] p-2">
                    <p className="text-xs font-semibold text-[#0c1427]">{item.templateKey ?? 'notification'}</p>
                    <p className="text-[11px] text-[#6b7280] mt-1">
                      {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}
                    </p>
                  </div>
                ))}
                <Link href="/work/communications" className="block text-center text-xs font-semibold text-[#0c1427] py-1 rounded bg-[#e6e8ea]">
                  Iletisim Gecmisi
                </Link>
              </div>
            )}

            {openHelp && (
              <div className="absolute top-12 right-0 w-[320px] rounded-md bg-white border border-[#e5e7eb] shadow-lg p-3 z-30 space-y-2">
                <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yardim Paneli</p>
                <p className="text-xs text-[#445266]">Hizli gecisler ve operasyon notlari.</p>
                <Link href="/work/dues" className="block text-xs rounded bg-[#f8f9fb] px-2 py-2 text-[#0c1427]">Aidat/Tahakkuk yonetimi</Link>
                <Link href="/work/collections" className="block text-xs rounded bg-[#f8f9fb] px-2 py-2 text-[#0c1427]">Tahsilat operasyonu</Link>
                <Link href="/work/residents" className="block text-xs rounded bg-[#f8f9fb] px-2 py-2 text-[#0c1427]">Sakin operasyonu</Link>
                <p className="text-[11px] text-[#6b7280]">Kisayol: arama kutusunda Enter ile daire/sakin arayabilirsiniz.</p>
              </div>
            )}

            {openProfile && (
              <div className="absolute top-12 right-0 w-[260px] rounded-md bg-white border border-[#e5e7eb] shadow-lg p-3 z-30 space-y-2">
                <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Profil Menusu</p>
                <p className="text-xs text-[#445266]">Rol: {role ?? '-'}</p>
                <p className="text-[11px] text-[#6b7280] break-all">Tenant: {tenantId ?? '-'}</p>
                <Link href="/settings" className="block text-xs rounded bg-[#f8f9fb] px-2 py-2 text-[#0c1427]">Ayarlar</Link>
                <Link href="/dashboard" className="block text-xs rounded bg-[#f8f9fb] px-2 py-2 text-[#0c1427]">Dashboard</Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full text-left text-xs rounded bg-[#ffe7e7] px-2 py-2 text-[#ba1a1a]"
                >
                  Cikis Yap
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[#e6e8ea] text-[#0c1427]"
          >
            Çıkış
          </button>
        </div>
      </div>

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        context={{ siteName: selectedSiteId ? selectedSiteName : undefined }}
      />
    </div>
  )
}
