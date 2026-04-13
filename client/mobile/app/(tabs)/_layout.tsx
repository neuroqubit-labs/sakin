import { useEffect, useState, type ComponentType } from 'react'
import { Tabs } from 'expo-router'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

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
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          height: 64,
          paddingBottom: 8,
        },
        headerShown: false,
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
          title: 'Duyurular',
          tabBarLabel: 'Duyurular',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </TabsNavigator>
  )
}

