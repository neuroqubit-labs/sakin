import { type ComponentType } from 'react'
import { Tabs } from 'expo-router'
import { useUnreadNotificationCount } from '@/features/notification/queries'

export default function TabsLayout() {
  const { data } = useUnreadNotificationCount()
  const unreadCount = data?.count ?? 0
  const TabsNavigator = Tabs as unknown as ComponentType<any> & { Screen: ComponentType<any> }

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

