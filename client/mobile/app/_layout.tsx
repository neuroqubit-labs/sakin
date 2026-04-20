import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, type AuthSession } from '@/contexts/auth-context'
import {
  refreshAccessToken,
  setAccessToken,
  setDevResidentId,
  setTokenRefresher,
  setUnauthorizedHandler,
} from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@/components/error-boundary'
import { clearSession, loadSession, saveSession } from '@/lib/session-store'
import { clearPushToken, loadPushToken } from '@/lib/push-token-store'
import { unregisterDeviceTokenDirect } from '@/features/notification/queries'
import { colors } from '@/theme'
import { usePushRegistration } from '@/features/notification/use-push-registration'

function useAuth() {
  const [session, setSessionState] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTokenRef = useRef<string | null>(null)
  const sessionRef = useRef<AuthSession | null>(null)

  const setSession = useCallback((next: AuthSession | null) => {
    setSessionState(next)
    sessionRef.current = next
    setAccessToken(next?.accessToken ?? null)
    refreshTokenRef.current = next?.refreshToken ?? null
    setDevResidentId(next?.residentId ?? null)
    if (next) {
      void saveSession(next)
    } else {
      void clearSession()
    }
  }, [])

  const signOut = useCallback(() => {
    // Push token'ı önce backend'den sil — access token hâlâ geçerli.
    const current = sessionRef.current
    if (current?.accessToken) {
      void (async () => {
        const pushToken = await loadPushToken()
        if (pushToken) {
          await unregisterDeviceTokenDirect(pushToken, current.tenantId)
        }
        await clearPushToken()
      })()
    } else {
      void clearPushToken()
    }
    setSession(null)
    queryClient.clear()
  }, [setSession])

  // Cold start: SecureStore'dan session hydrate et
  useEffect(() => {
    let cancelled = false
    void loadSession().then((persisted) => {
      if (cancelled) return
      if (persisted) {
        setSessionState(persisted)
        sessionRef.current = persisted
        setAccessToken(persisted.accessToken ?? null)
        refreshTokenRef.current = persisted.refreshToken ?? null
        setDevResidentId(persisted.residentId ?? null)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 401 tepkisi: global logout
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Token refresh: 401'de api.ts bunu çağırır. Yeni token SecureStore'a da yazılır.
  useEffect(() => {
    setTokenRefresher(async () => {
      const refreshToken = refreshTokenRef.current
      if (!refreshToken) return null
      try {
        const result = await refreshAccessToken(refreshToken)
        refreshTokenRef.current = result.refreshToken
        setSessionState((prev) => {
          if (!prev) return prev
          const next: AuthSession = {
            ...prev,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          }
          sessionRef.current = next
          void saveSession(next)
          return next
        })
        return result.accessToken
      } catch {
        return null
      }
    })
    return () => setTokenRefresher(null)
  }, [])

  return { session, setSession, signOut, loading }
}

function PushBootstrap() {
  usePushRegistration()
  return null
}

export default function RootLayout() {
  const { session, setSession, signOut, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const StackNavigator = Stack as unknown as ComponentType<any> & { Screen: ComponentType<any> }

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const isAuthenticated = Boolean(session)

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments, router])

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider session={session} signIn={setSession} signOut={signOut}>
            <PushBootstrap />
            <StackNavigator screenOptions={{ headerShown: false }}>
              <StackNavigator.Screen name="(auth)/login" />
              <StackNavigator.Screen name="(tabs)" />
              <StackNavigator.Screen
                name="payment-history"
                options={{
                  headerShown: true,
                  title: 'Ödeme Geçmişi',
                  headerStyle: { backgroundColor: colors.surfaceElevated },
                  headerShadowVisible: false,
                  headerTintColor: colors.ink,
                  headerTitleStyle: { fontWeight: '700' },
                }}
              />
              <StackNavigator.Screen
                name="receipt/[id]"
                options={{ headerShown: false }}
              />
              <StackNavigator.Screen
                name="ticket/[id]"
                options={{ headerShown: false }}
              />
            </StackNavigator>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}
