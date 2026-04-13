import { useEffect, useState, useRef, type ComponentType } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, type AuthSession } from '@/contexts/auth-context'
import { registerUser } from '@/lib/api'
import { getFirebaseAuth, isFirebaseNativeAvailable } from '@/lib/firebase-auth'

type FirebaseUser = { uid: string } | null

function useAuth() {
  const [user, setUser] = useState<FirebaseUser>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  // Track last registered uid to avoid re-registering on token refresh
  const registeredUid = useRef<string | null>(null)

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
          // Registration failed — user can still browse, API calls will fail gracefully
        }
      } else if (!u) {
        registeredUid.current = null
        setSession(null)
      }

      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, session, setSession, loading }
}

export default function RootLayout() {
  const { user, session, setSession, loading } = useAuth()
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <AuthProvider session={session} setSession={setSession}>
      <StackNavigator screenOptions={{ headerShown: false }}>
        <StackNavigator.Screen name="(auth)/login" />
        <StackNavigator.Screen name="(tabs)" />
        <StackNavigator.Screen
          name="payment-history"
          options={{
            headerShown: true,
            title: 'Ödeme Geçmişi',
            headerStyle: { backgroundColor: '#0D4F3C' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </StackNavigator>
    </AuthProvider>
  )
}
