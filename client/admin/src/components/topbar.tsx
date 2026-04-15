'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Search, Check, Plus } from 'lucide-react'
import { useSiteContext } from '@/providers/site-provider'
import { useCommandPalette } from '@/components/command-palette'
import { SiteSwitcher } from '@/components/site-switcher'
import { apiClient } from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TopbarNotification {
  id: string
  templateKey: string | null
  status: string
  channel: string
  createdAt: string
  payload: unknown
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Az önce'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(new Date(dateStr))
}

interface TopbarProps {
  onPaymentClick?: () => void
}

export function Topbar({ onPaymentClick }: TopbarProps) {
  const { selectedSiteId, setSelectedSiteId, availableSites, hydrated, error } = useSiteContext()
  const { open: openCommandPalette } = useCommandPalette()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notifications, setNotifications] = useState<TopbarNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationError, setNotificationError] = useState<string | null>(null)

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
      setNotificationError(err instanceof Error ? err.message : 'Bildirimler yüklenemedi')
    } finally {
      setNotificationLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const markAllRead = async () => {
    try {
      await apiClient('/notifications/mark-all-read', { method: 'PATCH' })
      setUnreadCount(0)
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="px-3 pb-1 pt-4 lg:px-6 xl:px-8">
      {error ? (
        <div className="mb-3 rounded-2xl border border-[#ffd8d0] bg-[#fff4f1] px-4 py-2 text-xs font-medium text-[#991b1b] shadow-[0_10px_26px_rgba(153,27,27,0.08)]">
          Site verisi alınamadı: {error}
        </div>
      ) : null}
      <div className="ledger-shell-topbar flex flex-col gap-3 rounded-[26px] px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        {/* Left: Site switcher */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f1a2b,#31538c)] text-white shadow-[0_16px_30px_rgba(15,26,43,0.2)] md:flex">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">OS</span>
          </div>
          <SiteSwitcher
            sites={availableSites}
            selectedSiteId={selectedSiteId}
            onSelect={setSelectedSiteId}
            disabled={!hydrated}
          />
        </div>

        {/* Right: Search + Payment + Notifications */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden h-11 w-64 items-center gap-3 rounded-2xl border border-white/85 bg-white/82 px-3.5 text-[13px] text-[#7e90a8] shadow-[0_12px_28px_rgba(8,17,31,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white md:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Daire veya sakin ara...</span>
            <kbd className="hidden h-6 items-center gap-1 rounded-full border border-[#dfe7f2] bg-[#f7faff] px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9bb0] lg:inline-flex">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onPaymentClick}
            className="inline-flex h-11 rounded-2xl border border-[#17345a]/12 bg-[linear-gradient(135deg,#12203a_0%,#1d3b67_46%,#4f7df7_100%)] px-3.5 text-[12px] font-semibold text-white shadow-[0_18px_34px_rgba(79,125,247,0.26)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(79,125,247,0.32)] sm:px-4 sm:text-[13px]"
          >
            Ödeme Al
          </button>

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={(open) => {
            setNotifOpen(open)
            if (open) void loadNotifications()
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/85 bg-white/82 text-[#45566d] shadow-[0_12px_28px_rgba(8,17,31,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
                aria-label="Bildirimler"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(220,38,38,0.28)]">
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] rounded-[24px] border-white/80 bg-white/92 p-3 shadow-[0_24px_54px_rgba(8,17,31,0.14)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#63758d]">Bildirimler</p>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 rounded-full bg-[#f4f8fc] px-2.5 py-1 text-xs text-[#5d6f86] transition-colors hover:bg-[#ecf2f9] hover:text-[#0c1427]"
                >
                  <Check className="h-3 w-3" /> Okundu
                </button>
              </div>
              {notificationLoading && <p className="text-xs text-[#6b7280]">Yükleniyor...</p>}
              {notificationError && <p className="text-xs text-red-600">{notificationError}</p>}
              {!notificationLoading && !notificationError && notifications.length === 0 && (
                <p className="text-xs text-[#6b7280] py-2">Bildirim yok.</p>
              )}
              {!notificationLoading && notifications.map((item) => (
                <div key={item.id} className="animate-fade-in-up rounded-2xl border border-white/70 bg-[#f8fbff] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <p className="text-xs font-medium text-[#111827]">{item.templateKey ?? 'Bildirim'}</p>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">{relativeTime(item.createdAt)}</p>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <Link
                  href="/announcements"
                  onClick={() => setNotifOpen(false)}
                  className="flex-1 block rounded-2xl border border-white/80 bg-[#f3f7fb] py-2 text-center text-xs font-medium text-[#0c1427] transition-colors hover:bg-[#edf3fa]"
                >
                  Tümünü Gör
                </Link>
                <Link
                  href="/announcements?new=1"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-2xl border border-[#17345a]/12 bg-[linear-gradient(135deg,#12203a_0%,#1d3b67_46%,#4f7df7_100%)] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(79,125,247,0.2)] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Plus className="h-3 w-3" />
                  Yeni Duyuru
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
