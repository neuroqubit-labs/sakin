import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaymentMethod } from '@sakin/shared'
import { EmptyState, SurfaceCard } from '@/components'
import { useMyPayments, type PaymentItem } from '@/features/payment/queries'
import { colors, radii, spacing, typography } from '@/theme'

const METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.ONLINE_CARD]: 'Kredi veya banka karti',
  [PaymentMethod.BANK_TRANSFER]: 'Banka transferi',
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.POS]: 'POS',
}

function formatDate(value: string | null) {
  if (!value) return 'Tarih bekleniyor'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value: string | number) {
  return `₺${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
}

export default function PaymentHistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const query = useMyPayments()
  const payments: PaymentItem[] = [...(query.data?.data ?? [])].sort((a, b) => {
    const dateA = a.paidAt ?? a.confirmedAt ?? a.createdAt
    const dateB = b.paidAt ?? b.confirmedAt ?? b.createdAt
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

  return (
    <View style={styles.screen}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PaymentRow
            item={item}
            last={index === payments.length - 1}
            onPress={() => router.push(`/receipt/${item.id}` as never)}
          />
        )}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <SurfaceCard tone="tinted" style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Ödeme geçmişi</Text>
            <Text style={styles.summaryTitle}>Tüm makbuzların ve geçmiş işlemlerin tek yerde.</Text>
            <View style={styles.summaryStats}>
              <HistoryMetric
                label="Toplam"
                value={formatCurrency(
                  payments.reduce((sum, item) => sum + Number(item.amount), 0),
                )}
              />
              <HistoryMetric label="İşlem" value={String(payments.length)} />
            </View>
          </SurfaceCard>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <SurfaceCard style={styles.centerCard}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.centerText}>Ödeme kayıtları yükleniyor...</Text>
            </SurfaceCard>
          ) : query.error ? (
            <SurfaceCard tone="danger" style={styles.centerCard}>
              <Text style={styles.errorTitle}>Geçmiş şimdilik açılamadı.</Text>
              <Text style={styles.errorText}>
                {query.error instanceof Error ? query.error.message : 'Tekrar deneyin.'}
              </Text>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.centerCard}>
              <EmptyState
                icon="receipt-outline"
                title="Henüz ödeme geçmişin yok."
                body="Onaylanan ödemeler burada zaman sırası ile görünecek."
                primary={{
                  label: 'Açık ödemeleri gör',
                  onPress: () => router.push('/(tabs)/pay' as never),
                }}
                secondary={{
                  label: "Bugün'e dön",
                  onPress: () => router.replace('/(tabs)' as never),
                }}
              />
            </SurfaceCard>
          )
        }
      />
    </View>
  )
}

function PaymentRow({ item, last, onPress }: { item: PaymentItem; last: boolean; onPress: () => void }) {
  const date = formatDate(item.paidAt ?? item.confirmedAt ?? item.createdAt)
  const label = METHOD_LABELS[item.method] ?? item.method

  return (
    <Pressable onPress={onPress}>
      <SurfaceCard style={styles.rowCard} padding="lg">
        <View style={[styles.row, !last && styles.rowWithGap]}>
          <View style={styles.rowIcon}>
            <Ionicons color={colors.brand} name="card-outline" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {item.dues
                ? `${item.dues.periodMonth}/${item.dues.periodYear} ödemesi`
                : 'Ödeme işlemi'}
            </Text>
            <Text style={styles.rowSub}>{label} · {date}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
            <Ionicons color={colors.inkMuted} name="chevron-forward" size={14} />
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  )
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 28,
    paddingBottom: 48,
    gap: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryTitle: {
    ...typography.heading,
    color: colors.ink,
    lineHeight: 30,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowCard: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowWithGap: {},
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSub: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 4,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand,
  },
  centerCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  centerText: {
    fontSize: 14,
    color: colors.inkSecondary,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dangerInk,
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerInk,
    lineHeight: 20,
    textAlign: 'center',
  },
})
