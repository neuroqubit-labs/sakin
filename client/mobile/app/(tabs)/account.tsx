import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthSession } from '@/contexts/auth-context'
import { useResidencies } from '@/features/auth/queries'
import { useUnreadNotificationCount } from '@/features/notification/queries'
import { useMyTickets } from '@/features/ticket/queries'
import { useMyPayments } from '@/features/payment/queries'
import { PrimaryButton, SurfaceCard } from '@/components'
import { colors, radii, spacing, typography } from '@/theme'
import { TicketStatus } from '@sakin/shared'

function formatCurrency(value: number) {
  return `₺${value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Henüz yok'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
  })
}

export default function AccountScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuthSession()
  const residenciesQuery = useResidencies()
  const notificationsQuery = useUnreadNotificationCount()
  const ticketsQuery = useMyTickets()
  const paymentsQuery = useMyPayments()

  const residencies = residenciesQuery.data?.data ?? []
  const primaryResidency =
    residencies.find((item) => item.isPrimaryResponsible) ?? residencies[0] ?? null
  const unreadCount = notificationsQuery.data?.count ?? 0
  const openTickets = (ticketsQuery.data?.data ?? []).filter(
    (item) =>
      item.status !== TicketStatus.RESOLVED &&
      item.status !== TicketStatus.CLOSED &&
      item.status !== TicketStatus.CANCELLED,
  )
  const payments = paymentsQuery.data?.data ?? []
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const lastPayment = [...payments].sort((a, b) => {
    const dateA = a.paidAt ?? a.confirmedAt ?? a.createdAt
    const dateB = b.paidAt ?? b.confirmedAt ?? b.createdAt
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })[0]

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 12, 28),
          paddingBottom: insets.bottom + 112,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Hesabım</Text>
        <Text style={styles.title}>Sakin ayarların ve ikinci seviye işlerin burada.</Text>
      </View>

      <SurfaceCard style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Ionicons color={colors.brand} name="person" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileTitle}>
              {primaryResidency?.siteName ?? 'Sakin hesabın'}
            </Text>
            <Text style={styles.profileSub}>
              {primaryResidency
                ? `Daire ${primaryResidency.unitNumber}${residencies.length > 1 ? ` · +${residencies.length - 1} daha` : ''}`
                : 'Bağlı daire bilgisi hazırlanıyor'}
            </Text>
          </View>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{openTickets.length}</Text>
            <Text style={styles.metricLabel}>Açık talep</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{unreadCount}</Text>
            <Text style={styles.metricLabel}>Okunmamış</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatCurrency(totalPaid)}</Text>
            <Text style={styles.metricLabel}>Toplam ödeme</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="tinted">
        <Text style={styles.sectionTitle}>Hızlı erişim</Text>
        <QuickLink
          icon="receipt-outline"
          title="Ödeme geçmişi"
          subtitle={
            lastPayment
              ? `Son işlem ${formatDate(lastPayment.paidAt ?? lastPayment.confirmedAt ?? lastPayment.createdAt)}`
              : 'Makbuzlarını ve geçmiş işlemlerini aç'
          }
          onPress={() => router.push('/payment-history' as never)}
        />
        <QuickLink
          icon="newspaper-outline"
          title="Duyurular"
          subtitle={unreadCount > 0 ? `${unreadCount} yeni bildirim seni bekliyor` : 'Tüm duyuruları tek yerde gör'}
          onPress={() => router.push('/(tabs)/announcements' as never)}
        />
        <QuickLink
          icon="construct-outline"
          title="Talepler"
          subtitle={openTickets.length > 0 ? `${openTickets.length} aktif süreç var` : 'Talep oluştur veya mevcut süreci kontrol et'}
          onPress={() => router.push('/(tabs)/tickets' as never)}
          last
        />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Oturum</Text>
        <Text style={styles.sessionText}>
          Bu alan ödeme, bildirim ve süreç akışlarını etkilemeden hesabını yönetmen için ayrıldı.
        </Text>
        <PrimaryButton
          label="Çıkış Yap"
          onPress={signOut}
          variant="secondary"
          style={styles.signOutButton}
        />
      </SurfaceCard>
    </ScrollView>
  )
}

function QuickLink({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.linkRow, !last && styles.linkBorder]}
    >
      <View style={styles.linkIcon}>
        <Ionicons color={colors.brand} name={icon} size={19} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
    </TouchableOpacity>
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
    paddingBottom: 140,
    gap: spacing.lg,
  },
  header: {
    paddingTop: 8,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    ...typography.heading,
    color: colors.ink,
    lineHeight: 30,
  },
  profileCard: {
    gap: spacing.lg,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  profileSub: {
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 4,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surfaceTint,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  linkBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 18,
  },
  sessionText: {
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 22,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
})
