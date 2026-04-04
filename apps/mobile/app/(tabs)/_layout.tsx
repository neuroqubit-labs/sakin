import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Borcum', tabBarLabel: 'Borcum' }}
      />
      <Tabs.Screen
        name="pay"
        options={{ title: 'Ödeme Yap', tabBarLabel: 'Öde' }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: 'Talepler', tabBarLabel: 'Talepler' }}
      />
      <Tabs.Screen
        name="announcements"
        options={{ title: 'Duyurular', tabBarLabel: 'Duyurular' }}
      />
    </Tabs>
  )
}
