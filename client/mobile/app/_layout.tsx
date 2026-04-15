import { useCallback, useEffect, useState, useRef, type ComponentType } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, type AuthSession } from '@/contexts/auth-context'
import { registerUser, setUnauthorizedHandler, setDevResidentId } from '@/lib/api'
import { getFirebaseAuth, isFirebaseNativeAvailable } from '@/lib/firebase-auth'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@/components/error-boundary'
import { clearSession, loadSession, saveSession } from '@/lib/session-store'
import { colors } from '@/theme'

type FirebaseUser = { uid: string } | null

function useAuth() {
  const [user, setUser] = useState<FirebaseUser>(null)
  const [session, setSessionState] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const registeredUid = useRef<string | null>(null)

  const setSession = useCallback((next: AuthSession | null) => {
    setSessionState(next)
    // Dev RESIDENT bypass: residentId'yi api modülüne ilet
    setDevResidentId(next?.residentId ?? null)
    if (next) {
      void saveSession(next)
    } else {
      void clearSession()
    }
  }, [])

  const signOut = useCallback(() => {
    registeredUid.current = null
    setSession(null)
    queryClient.clear()
    const auth = getFirebaseAuth()
    // Firebase signOut yalnız native modülde — yoksa sessiz.
    const fbSignOut = (auth as unknown as { signOut?: () => Promise<void> } | null)?.signOut
    if (typeof fbSignOut === 'function') {
      void fbSignOut()
    }
  }, [setSession])

  // Cold start: SecureStore'dan session hydrate et
  useEffect(() => {
    let cancelled = false
    void loadSession().then((persisted) => {
      if (cancelled) return
      if (persisted) {
        setSessionState(persisted)
        setDevResidentId(persisted.residentId ?? null)
      }
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

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth || !isFirebaseNativeAvailable()) {
      setLoading(false)
      return
    }

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u)

      if (u && u.uid !== registeredUid.current) {
        try {
          const result = await registerUser()
          if (result) {
            registeredUid.current = u.uid
            setSession({ userId: result.userId, tenantId: result.tenantId, role: result.role })
          }
        } catch {
          // kayıt başarısız — API çağrıları gracefully hata döner
        }
      } else if (!u) {
        registeredUid.current = null
        setSession(null)
      }

      setLoading(false)
    })
    return unsubscribe
  }, [setSession])

  return { user, session, setSession, signOut, loading }
}

export default function RootLayout() {
  const { user, session, setSession, signOut, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const StackNavigator = Stack as unknown as ComponentType<any> & { Screen: ComponentType<any> }

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const isAuthenticated = Boolean(user) || Boolean(session)

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, session, loading, segments, router])

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
          <AuthProvider session={session} setSession={setSession} signOut={signOut}>
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
            </StackNavigator>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}
