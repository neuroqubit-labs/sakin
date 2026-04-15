import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PaymentMethod } from '@sakin/shared'
import { SurfaceCard } from '@/components'
import { useMyPayments, type PaymentItem } from '@/features/payment/queries'
import { colors, radii, spacing, typography } from '@/theme'

const METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.ONLINE_CARD]: 'Kredi / banka karti',
  [PaymentMethod.BANK_TRANSFER]: 'Banka transferi',
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.POS]: 'POS',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value: string | number) {
  return `₺${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
}

function buildReceiptText(item: PaymentItem): string {
  const lines = [
    'ODEME DEKONTU',
    '─────────────────────────',
    `Tutar: ${formatCurrency(item.amount)}`,
    `Yontem: ${METHOD_LABELS[item.method] ?? item.method}`,
    `Tarih: ${formatDate(item.paidAt ?? item.confirmedAt ?? item.createdAt)}`,
  ]
  if (item.receiptNumber) lines.push(`Makbuz No: ${item.receiptNumber}`)
  if (item.dues) lines.push(`Donem: ${item.dues.periodMonth}/${item.dues.periodYear}`)
  if (item.unit) lines.push(`Daire: ${item.unit.number} - ${item.unit.site.name}`)
  if (item.note) lines.push(`Not: ${item.note}`)
  lines.push('─────────────────────────')
  lines.push('Sakin - Bina Yonetim Sistemi')
  return lines.join('\n')
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const query = useMyPayments()
  const payment = (query.data?.data ?? []).find((p) => p.id === id) ?? null

  async function onShare() {
    if (!payment) return
    try {
      await Share.share({ message: buildReceiptText(payment) })
    } catch {
      // kullanıcı iptal etti
    }
  }

  if (query.isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    )
  }

  if (!payment) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons color={colors.inkMuted} name="alert-circle-outline" size={48} />
        <Text style={styles.notFoundText}>Odeme kaydi bulunamadi.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Geri don</Text>
        </Pressable>
      </View>
    )
  }

  const date = formatDate(payment.paidAt ?? payment.confirmedAt ?? payment.createdAt)
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons color={colors.ink} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Odeme Dekontu</Text>
        <View style={{ width: 24 }} />
      </View>

      <SurfaceCard style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <View style={styles.receiptBadge}>
            <Ionicons color={colors.brand} name="checkmark-circle" size={28} />
          </View>
          <Text style={styles.receiptStatus}>Onaylandi</Text>
          <Text style={styles.receiptAmount}>{formatCurrency(payment.amount)}</Text>
        </View>

        <View style={styles.divider} />

        <DetailRow label="Odeme yontemi" value={methodLabel} />
        <DetailRow label="Tarih" value={date} />
        {payment.receiptNumber ? (
          <DetailRow label="Makbuz no" value={payment.receiptNumber} />
        ) : null}
        {payment.dues ? (
          <DetailRow label="Donem" value={`${payment.dues.periodMonth}/${payment.dues.periodYear}`} />
        ) : null}
        {payment.unit ? (
          <DetailRow label="Daire" value={`${payment.unit.number} - ${payment.unit.site.name}`} />
        ) : null}
        {payment.note ? <DetailRow label="Not" value={payment.note} /> : null}

        <View style={styles.divider} />

        <Text style={styles.footerText}>Sakin - Bina Yonetim Sistemi</Text>
      </SurfaceCard>

      <View style={styles.actions}>
        <Pressable onPress={() => void onShare()} style={styles.actionButton}>
          <Ionicons color={colors.brand} name="share-outline" size={20} />
          <Text style={styles.actionText}>Paylas</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.ink,
  },
  receiptCard: {
    paddingVertical: spacing.xxl,
  },
  receiptHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  receiptBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  receiptStatus: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.inkSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    maxWidth: '60%',
    textAlign: 'right',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingVertical: spacing.lg,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.inkSecondary,
  },
  backLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand,
  },
})
