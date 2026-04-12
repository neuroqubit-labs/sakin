import { useEffect, useState, type ComponentType } from 'react'
import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { session } = useAuthSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const TabsNavigator = Tabs as unknown as ComponentType<any> & { Screen: ComponentType<any> }

  useEffect(() => {
    if (!session) return
    const fetchUnread = async () => {
      try {
        const result = await apiClient<{ count: number }>(
          '/notifications/unread-count',
          {},
          session.tenantId,
        )
        setUnreadCount(result.count)
      } catch {
        // silently fail — badge is non-critical
      }
    }
    void fetchUnread()
    const interval = setInterval(() => void fetchUnread(), 60_000)
    return () => clearInterval(interval)
  }, [session])

  return (
    <TabsNavigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: true,
      }}
    >
      <TabsNavigator.Screen
        name="index"
        options={{ title: 'Borcum', tabBarLabel: 'Borcum' }}
      />
      <TabsNavigator.Screen
        name="pay"
        options={{ title: 'Ödeme Yap', tabBarLabel: 'Öde' }}
      />
      <TabsNavigator.Screen
        name="tickets"
        options={{ title: 'Talepler', tabBarLabel: 'Talepler' }}
      />
      <TabsNavigator.Screen
        name="announcements"
        options={{
          title: 'Bildirimler',
          tabBarLabel: 'Bildirimler',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </TabsNavigator>
  )
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
})
