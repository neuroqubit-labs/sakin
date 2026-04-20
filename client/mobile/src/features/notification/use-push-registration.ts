import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthSession } from '@/contexts/auth-context'
import { savePushToken } from '@/lib/push-token-store'
import { useRegisterDeviceToken } from './queries'

type PushPayload = Record<string, string | undefined> & { type?: string }

function routeForPayload(payload: PushPayload): string | null {
  switch (payload.type) {
    case 'announcement.published':
      return '/(tabs)/announcements'
    case 'payment.confirmed':
      return '/payment-history'
    case 'ticket.status-changed':
    case 'ticket.comment-added':
      return payload.ticketId ? `/ticket/${payload.ticketId}` : '/(tabs)/tickets'
    default:
      return null
  }
}

/**
 * FCM/APNs push token'ını alır ve backend'e kaydeder.
 *
 * Not: expo-notifications paketi henüz package.json'da yok — Firebase bağlanana kadar
 * bu hook `require` başarısız olduğunda sessizce no-op çalışır. Provider bağlantısı
 * yapıldığında:
 *   1. `pnpm --filter=@sakin/mobile add expo-notifications`
 *   2. Firebase/APNs credential'larını Expo projesine yükle
 *   3. Kod değişikliği gerekmez — bu hook otomatik token kaydı başlatır
 */
export function usePushRegistration() {
  const { session } = useAuthSession()
  const register = useRegisterDeviceToken()
  const router = useRouter()

  useEffect(() => {
    if (!session) return
    if (Platform.OS === 'web') return

    let cancelled = false
    let tapSubscription: { remove: () => void } | null = null

    void (async () => {
      let Notifications: unknown
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Notifications = require('expo-notifications')
      } catch {
        // Paket henüz yüklü değil — FCM bağlanana kadar bekle.
        return
      }

      try {
        const mod = Notifications as {
          getPermissionsAsync: () => Promise<{ status: string }>
          requestPermissionsAsync: () => Promise<{ status: string }>
          getDevicePushTokenAsync: () => Promise<{ data: string; type: string }>
          addNotificationResponseReceivedListener: (
            listener: (event: {
              notification: { request: { content: { data?: PushPayload } } }
            }) => void,
          ) => { remove: () => void }
          getLastNotificationResponseAsync?: () => Promise<{
            notification: { request: { content: { data?: PushPayload } } }
          } | null>
        }

        const existing = await mod.getPermissionsAsync()
        let granted = existing.status === 'granted'
        if (!granted) {
          const requested = await mod.requestPermissionsAsync()
          granted = requested.status === 'granted'
        }
        if (!granted || cancelled) return

        const token = await mod.getDevicePushTokenAsync()
        if (cancelled || !token?.data) return

        const platform: 'IOS' | 'ANDROID' = Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
        await savePushToken(token.data)
        register.mutate({ token: token.data, platform })

        // Soğuk başlatma: kullanıcı bildirime tıklayarak uygulamayı açtıysa,
        // kaydedilen son response'u al ve o ekrana yönlendir.
        if (mod.getLastNotificationResponseAsync) {
          const last = await mod.getLastNotificationResponseAsync()
          const data = last?.notification.request.content.data
          if (data && !cancelled) {
            const route = routeForPayload(data)
            if (route) router.push(route as never)
          }
        }

        // Sıcak başlatma: uygulama açıkken gelen bildirime tıklandığında.
        tapSubscription = mod.addNotificationResponseReceivedListener((event) => {
          const data = event.notification.request.content.data
          if (!data) return
          const route = routeForPayload(data)
          if (route) router.push(route as never)
        })
      } catch {
        // Push kurulumu başarısız olursa akışı bozmayalım — retry bir sonraki oturumda.
      }
    })()

    return () => {
      cancelled = true
      tapSubscription?.remove()
    }
    // register/router mutation referansları her render'da yeni oluşabilir; session'a bağlı kal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])
}
