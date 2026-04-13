'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Search, Check } from 'lucide-react'
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
    <div className="border-b border-white/60 ledger-glass px-4 py-2.5">
      {error ? (
        <div className="mb-2 rounded-md bg-[#fef2f2] px-3 py-1.5 text-xs font-medium text-[#991b1b]">
          Site verisi alınamadı: {error}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Site switcher */}
        <div className="flex items-center gap-2.5">
          <SiteSwitcher
            sites={availableSites}
            selectedSiteId={selectedSiteId}
            onSelect={setSelectedSiteId}
            disabled={!hydrated}
          />
        </div>

        {/* Right: Search + Payment + Notifications */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden md:flex h-8 w-56 items-center gap-2 rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2.5 text-[13px] text-[#9ca3af] hover:bg-white hover:border-[#d1d5db] transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">Daire veya sakin ara...</span>
            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-[#e5e7eb] bg-white px-1.5 text-[10px] font-medium text-[#9ca3af]">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onPaymentClick}
            className="h-8 px-3 text-xs font-semibold rounded-md bg-[#0c1427] text-white hover:bg-[#1a2332] transition-colors"
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
                className="h-8 w-8 grid place-items-center rounded-md border border-[#e5e7eb] hover:bg-[#f5f5f5] text-[#4b5563] relative transition-colors"
                aria-label="Bildirimler"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-bold grid place-items-center">
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#111827]">Bildirimler</p>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#0c1427]"
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
                <div key={item.id} className="rounded-md bg-[#f9fafb] p-2 animate-fade-in-up">
                  <p className="text-xs font-medium text-[#111827]">{item.templateKey ?? 'Bildirim'}</p>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">{relativeTime(item.createdAt)}</p>
                </div>
              ))}
              <Link
                href="/announcements"
                onClick={() => setNotifOpen(false)}
                className="block text-center text-xs font-medium text-[#0c1427] py-1.5 rounded-md bg-[#f3f4f6] hover:bg-[#e5e7eb] transition-colors"
              >
                Tümünü Gör
              </Link>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
