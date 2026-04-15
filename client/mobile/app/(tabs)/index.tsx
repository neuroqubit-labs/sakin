import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { DuesStatus } from '@sakin/shared'
import { useUnpaidDues } from '@/features/dues/queries'
import { useUnreadNotificationCount } from '@/features/notification/queries'
import { useResidencies } from '@/features/auth/queries'

function GlassCard({
  onPress,
  children,
  style,
}: {
  onPress?: () => void
  children: React.ReactNode
  style?: object
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.glassCard, style]}
    >
      {children}
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const duesQuery = useUnpaidDues()
  const unreadQuery = useUnreadNotificationCount()
  const residenciesQuery = useResidencies()

  const loading = duesQuery.isLoading
  const refreshing = duesQuery.isRefetching || unreadQuery.isRefetching || residenciesQuery.isRefetching
  const error = duesQuery.error ? (duesQuery.error as Error).message : null

  const unpaid = duesQuery.data?.data ?? []
  const totalDebt = unpaid.reduce((sum, d) => sum + Number(d.amount), 0)
  const overdueCount = unpaid.filter((d) => d.status === DuesStatus.OVERDUE).length

  // Residency'yi dues'tan değil kendi endpoint'inden türet — borç yokken de daire göster.
  const residencies = residenciesQuery.data?.data ?? []
  const primary = residencies.find((r) => r.isPrimaryResponsible) ?? residencies[0]
  const fallbackUnit = unpaid[0]?.unit
  const siteName = primary?.siteName ?? fallbackUnit?.site.name ?? ''
  const unitNumber = primary?.unitNumber ?? fallbackUnit?.number ?? ''
  const extraUnitCount = Math.max(0, residencies.length - 1)
  const unreadNotifications = unreadQuery.data?.count ?? 0

  async function onRefresh() {
    await Promise.all([duesQuery.refetch(), unreadQuery.refetch(), residenciesQuery.refetch()])
  }

  return (
    <LinearGradient colors={['#0D4F3C', '#1A7A5E', '#2BA87E']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="rgba(255,255,255,0.8)"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.brand}>SAKİN</Text>
          {siteName ? (
            <View style={styles.unitInfo}>
              <Text style={styles.siteName}>{siteName}</Text>
              <Text style={styles.unitNumber}>
                Daire {unitNumber}
                {extraUnitCount > 0 ? ` · +${extraUnitCount} daha` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <GlassCard style={styles.debtCard}>
          {loading ? (
            <ActivityIndicator color="rgba(255,255,255,0.9)" style={{ paddingVertical: 24 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.debtLabel}>Toplam Açık Borç</Text>
              <Text style={styles.debtAmount}>₺{totalDebt.toLocaleString('tr-TR')}</Text>
              {unpaid.length > 0 ? (
                <View style={styles.debtMeta}>
                  <View style={styles.debtMetaItem}>
                    <Text style={styles.debtMetaValue}>{unpaid.length}</Text>
                    <Text style={styles.debtMetaLabel}>bekleyen</Text>
                  </View>
                  {overdueCount > 0 && (
                    <View style={[styles.debtMetaItem, styles.overdueItem]}>
                      <Text style={[styles.debtMetaValue, styles.overdueValue]}>{overdueCount}</Text>
                      <Text style={[styles.debtMetaLabel, styles.overdueValue]}>gecikmiş</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.allClearText}>Tüm aidatlar ödendi</Text>
              )}
              <TouchableOpacity
                onPress={() => router.push('/payment-history' as never)}
                style={styles.historyLink}
              >
                <Text style={styles.historyLinkText}>Geçmiş ödemeler →</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>

        <View style={styles.actions}>
          <GlassCard onPress={() => router.push('/(tabs)/pay')} style={styles.actionCard}>
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>💳</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Ödeme Yap</Text>
              <Text style={styles.actionSub}>
                {unpaid.length > 0
                  ? `₺${totalDebt.toLocaleString('tr-TR')} · ${unpaid.length} aidat`
                  : 'Bekleyen ödeme yok'}
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </GlassCard>

          <GlassCard onPress={() => router.push('/(tabs)/tickets')} style={styles.actionCard}>
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>🔧</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Arıza Bildir</Text>
              <Text style={styles.actionSub}>Talep oluştur</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </GlassCard>

          <GlassCard onPress={() => router.push('/(tabs)/announcements')} style={styles.actionCard}>
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>📢</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Duyurular</Text>
              <Text style={styles.actionSub}>
                {unreadNotifications > 0 ? `${unreadNotifications} okunmamış` : 'Tümü okundu'}
              </Text>
            </View>
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
            <Text style={styles.actionChevron}>›</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const GLASS_BG = 'rgba(255, 255, 255, 0.12)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.25)'

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 28 },
  brand: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: 4 },
  unitInfo: { marginTop: 4 },
  siteName: { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  unitNumber: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  glassCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  debtCard: { padding: 28, marginBottom: 20, alignItems: 'center' },
  debtLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  debtAmount: { fontSize: 48, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  debtMeta: { flexDirection: 'row', gap: 20, marginTop: 12 },
  debtMetaItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  overdueItem: { backgroundColor: 'rgba(239, 68, 68, 0.25)' },
  debtMetaValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  debtMetaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  overdueValue: { color: '#fca5a5' },
  allClearText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  historyLink: { marginTop: 16, paddingVertical: 6 },
  historyLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.3 },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  actions: { gap: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionIcon: { fontSize: 22 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  actionSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  actionChevron: { fontSize: 22, color: 'rgba(255,255,255,0.4)', marginLeft: 8 },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
