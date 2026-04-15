import { type ComponentType } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tabs, useRouter, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUnpaidDues } from '@/features/dues/queries'
import { usePaymentFlow } from '@/features/payment/flow-state'
import { resolveSmartAction } from '@/features/shell/smart-action'
import { colors, radii } from '@/theme'

export default function TabsLayout() {
  const TabsNavigator = Tabs as unknown as ComponentType<any> & { Screen: ComponentType<any> }
  const insets = useSafeAreaInsets()
  const tabBarInset = Math.max(insets.bottom, 12)

  return (
    <>
      <TabsNavigator
        screenOptions={({ route }: { route: { name: string } }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 66 + tabBarInset,
              paddingBottom: tabBarInset,
            },
          ],
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({
            color,
            size,
            focused,
          }: {
            color: string
            size: number
            focused: boolean
          }) => (
            <Ionicons
              color={color}
              size={size}
              name={resolveTabIcon(route.name, focused)}
            />
          ),
          tabBarItemStyle: styles.tabItem,
        })}
      >
        <TabsNavigator.Screen
          name="index"
          options={{ title: 'Bugün', tabBarLabel: 'Bugün' }}
        />
        <TabsNavigator.Screen
          name="pay"
          options={{ title: 'Ödeme', tabBarLabel: 'Ödeme' }}
        />
        <TabsNavigator.Screen
          name="account"
          options={{ title: 'Hesabım', tabBarLabel: 'Hesabım' }}
        />
        <TabsNavigator.Screen
          name="tickets"
          options={{ href: null }}
        />
        <TabsNavigator.Screen
          name="announcements"
          options={{ href: null }}
        />
      </TabsNavigator>

      <SmartActionDock bottomInset={tabBarInset} />
    </>
  )
}

function SmartActionDock({ bottomInset }: { bottomInset: number }) {
  const router = useRouter()
  const segments = useSegments()
  const duesQuery = useUnpaidDues()
  const paymentFlowQuery = usePaymentFlow()

  const leafSegment = String(segments[segments.length - 1] ?? '')
  if (leafSegment !== 'index') return null

  const unpaid = duesQuery.data?.data ?? []
  const overdueCount = unpaid.filter((item) => item.status === 'OVERDUE').length
  const action = resolveSmartAction({
    overdueCount,
    dueCount: unpaid.length,
    paymentFlow: paymentFlowQuery.data ?? null,
  })

  if (!action.target) return null

  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { bottom: bottomInset + 58 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action.label}. ${action.helper}`}
        onPress={() => router.push(action.target as never)}
        style={styles.dockButton}
      >
        <View style={styles.dockIconWrap}>
          <Ionicons color="#ffffff" name={action.icon as any} size={18} />
        </View>
        <View style={styles.dockCopy}>
          <Text style={styles.dockLabel}>{action.label}</Text>
          <Text numberOfLines={1} style={styles.dockHelper}>
            {action.helper}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

function resolveTabIcon(routeName: string, focused: boolean) {
  if (routeName === 'index') return focused ? 'sparkles' : 'sparkles-outline'
  if (routeName === 'pay') return focused ? 'layers' : 'layers-outline'
  return focused ? 'person-circle' : 'person-circle-outline'
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceElevated,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 2,
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dockButton: {
    minWidth: 252,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.brand,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#102018',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  dockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCopy: {
    flex: 1,
  },
  dockLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dockHelper: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
})
