import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DuesStatus, TicketStatus } from '@sakin/shared'
import { MetricPill, SurfaceCard } from '@/components'
import { useResidencies } from '@/features/auth/queries'
import { useUnpaidDues } from '@/features/dues/queries'
import { useUnreadNotificationCount } from '@/features/notification/queries'
import { useMyPayments } from '@/features/payment/queries'
import { usePaymentFlow } from '@/features/payment/flow-state'
import { resolveSmartAction } from '@/features/shell/smart-action'
import { useMyTickets } from '@/features/ticket/queries'
import { colors, radii, spacing, typography } from '@/theme'

function formatCurrency(value: number) {
  return `₺${value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Bugün'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
  })
}

function buildHeroCopy({
  state,
  totalDebt,
  dueCount,
  overdueCount,
}: {
  state: ReturnType<typeof resolveSmartAction>['state']
  totalDebt: number
  dueCount: number
  overdueCount: number
}) {
  if (state === 'resume_payment') {
    return {
      eyebrow: 'Devam eden ödeme',
      title: 'Son ödemen hâlâ netleşiyor olabilir.',
      body: 'Durumu yenileyip işlemin tamamlanıp tamamlanmadığını birlikte kontrol edelim.',
    }
  }

  if (state === 'pay_overdue') {
    return {
      eyebrow: 'Öncelikli aksiyon',
      title: `${overdueCount} gecikmiş ödeme bekliyor.`,
      body: `${formatCurrency(totalDebt)} açık borç içinden önce bunları kapatmak en doğru adım.`,
    }
  }

  if (state === 'pay_due') {
    return {
      eyebrow: 'Hazır ödemeler',
      title: `${dueCount} ödeme şu anda hazır.`,
      body: `${formatCurrency(totalDebt)} açık tutarı tek akışta kontrol edip ödemeye geçebilirsin.`,
    }
  }

  return {
    eyebrow: 'Bugün sakin',
    title: 'Açık borcun yok, her şey düzende görünüyor.',
    body: 'Son ödemelerini, makbuzlarını ve diğer süreçlerini buradan takip etmeye devam edebilirsin.',
  }
}

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const duesQuery = useUnpaidDues()
  const unreadQuery = useUnreadNotificationCount()
  const residenciesQuery = useResidencies()
  const ticketsQuery = useMyTickets()
  const paymentsQuery = useMyPayments()
  const paymentFlowQuery = usePaymentFlow()

  const residencies = residenciesQuery.data?.data ?? []
  const hasNoResidency = !residenciesQuery.isLoading && residencies.length === 0
  if (hasNoResidency) {
    return <EmptyResidencyScreen insets={insets} />
  }

  const unpaid = duesQuery.data?.data ?? []
  const totalDebt = unpaid.reduce((sum, item) => sum + Number(item.amount), 0)
  const overdueCount = unpaid.filter((item) => item.status === DuesStatus.OVERDUE).length
  const action = resolveSmartAction({
    overdueCount,
    dueCount: unpaid.length,
    paymentFlow: paymentFlowQuery.data ?? null,
  })
  const heroCopy = buildHeroCopy({
    state: action.state,
    totalDebt,
    dueCount: unpaid.length,
    overdueCount,
  })

  const primaryResidency =
    residencies.find((item) => item.isPrimaryResponsible) ?? residencies[0] ?? null
  const unreadNotifications = unreadQuery.data?.count ?? 0
  const openTickets = (ticketsQuery.data?.data ?? []).filter(
    (item) =>
      item.status !== TicketStatus.RESOLVED &&
      item.status !== TicketStatus.CLOSED &&
      item.status !== TicketStatus.CANCELLED,
  )
  const lastPayment = [...(paymentsQuery.data?.data ?? [])].sort((a, b) => {
    const dateA = a.paidAt ?? a.confirmedAt ?? a.createdAt
    const dateB = b.paidAt ?? b.confirmedAt ?? b.createdAt
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })[0]

  const refreshing =
    duesQuery.isRefetching ||
    unreadQuery.isRefetching ||
    residenciesQuery.isRefetching ||
    ticketsQuery.isRefetching ||
    paymentsQuery.isRefetching

  async function onRefresh() {
    await Promise.all([
      duesQuery.refetch(),
      unreadQuery.refetch(),
      residenciesQuery.refetch(),
      ticketsQuery.refetch(),
      paymentsQuery.refetch(),
    ])
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 12, 28),
          paddingBottom: insets.bottom + 152,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.brand}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageEyebrow}>Bugün</Text>
        <Text style={styles.pageTitle}>Neyi önce halletmen gerektiğini tek bakışta gör.</Text>
        {primaryResidency ? (
          <Text style={styles.pageSub}>
            {primaryResidency.siteName} · Daire {primaryResidency.unitNumber}
            {residencies.length > 1 ? ` · +${residencies.length - 1} daha` : ''}
          </Text>
        ) : null}
      </View>

      <LinearGradient
        colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>{heroCopy.eyebrow}</Text>
        <Text style={styles.heroTitle}>{heroCopy.title}</Text>
        <Text style={styles.heroBody}>{heroCopy.body}</Text>

        <View style={styles.heroMetrics}>
          <MetricPill tone="onBrand" label="Açık ödeme" value={String(unpaid.length)} />
          <MetricPill tone="onBrand" label="Gecikmiş" value={String(overdueCount)} />
          <MetricPill tone="onBrand" label="Toplam" value={formatCurrency(totalDebt)} />
        </View>

        {action.target ? <Text style={styles.heroHelper}>{action.helper}</Text> : null}

        {unpaid.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(tabs)/pay' as never)}
            style={styles.heroAction}
          >
            <Text style={styles.heroActionText}>Odemeye git</Text>
            <Ionicons color={colors.brandDeep} name="arrow-forward" size={16} />
          </Pressable>
        ) : null}
      </LinearGradient>

      {duesQuery.isLoading && !duesQuery.data ? (
        <SurfaceCard style={styles.loadingCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>Durumun hazırlanıyor...</Text>
        </SurfaceCard>
      ) : null}

      {duesQuery.error ? (
        <SurfaceCard tone="danger">
          <Text style={styles.errorTitle}>Borçları şu an çekemedik.</Text>
          <Text style={styles.errorText}>
            {duesQuery.error instanceof Error ? duesQuery.error.message : 'Tekrar deneyin.'}
          </Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader
          title="Devam edenler"
          subtitle="Sadece ilgilenmen gereken süreçleri yüzeye çıkarıyoruz."
        />

        <ActionRow
          icon="construct-outline"
          title="Talepler"
          subtitle={
            openTickets.length > 0
              ? `${openTickets.length} aktif süreç devam ediyor`
              : 'Açık talebin yok'
          }
          value={openTickets.length > 0 ? `${openTickets.length}` : 'Temiz'}
          onPress={() => router.push('/(tabs)/tickets' as never)}
        />
        <ActionRow
          icon="newspaper-outline"
          title="Duyurular"
          subtitle={
            unreadNotifications > 0
              ? `${unreadNotifications} yeni bildirim bekliyor`
              : 'Okunmamış duyurun yok'
          }
          value={unreadNotifications > 0 ? `${unreadNotifications}` : 'Tamam'}
          onPress={() => router.push('/(tabs)/announcements' as never)}
          last
        />
      </SurfaceCard>

      <SurfaceCard tone="tinted">
        <SectionHeader
          title="Son hareket"
          subtitle={
            lastPayment
              ? `Son ödemen ${formatDate(lastPayment.paidAt ?? lastPayment.confirmedAt ?? lastPayment.createdAt)} tarihinde kayda geçti.`
              : 'Son ödeme kaydın oluştuğunda burada göreceksin.'
          }
        />

        <View style={styles.lastPaymentRow}>
          <View style={styles.lastPaymentBadge}>
            <Ionicons color={colors.brand} name="receipt-outline" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lastPaymentTitle}>
              {lastPayment
                ? formatCurrency(Number(lastPayment.amount))
                : 'Makbuzların burada toplanacak'}
            </Text>
            <Text style={styles.lastPaymentSub}>
              {lastPayment?.dues
                ? `${lastPayment.dues.periodMonth}/${lastPayment.dues.periodYear} dönemi`
                : 'Tüm işlemlerini tek yerde görmek için geçmişe git'}
            </Text>
          </View>
          <Pressable
            style={styles.inlineLink}
            onPress={() => router.push('/payment-history' as never)}
          >
            <Text style={styles.inlineLinkText}>Aç</Text>
          </Pressable>
        </View>
      </SurfaceCard>
    </ScrollView>
  )
}

function EmptyResidencyScreen({
  insets,
}: {
  insets: { top: number; bottom: number; left: number; right: number }
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 32, 48), paddingBottom: insets.bottom + 96 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.pageEyebrow}>Hoş geldiniz</Text>
        <Text style={styles.pageTitle}>Hesabınız henüz bir daireyle eşleşmedi.</Text>
        <Text style={styles.pageSub}>
          Borç bilgisi, ödeme ve talep akışı için yönetim şirketinizin sizi sisteme eklemesi
          gerekiyor. Aşağıdaki adımları takip edin.
        </Text>
      </View>

      <SurfaceCard>
        <SectionHeader
          title="1. Telefonunuz doğrulandı"
          subtitle="Giriş yaptığınız için hesabınız oluşturuldu."
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="2. Yönetim şirketinizle iletişime geçin"
          subtitle="Telefon numaranızı onlara iletin. Sizi daireye bağladıklarında bu ekran anında yenilenir."
        />
      </SurfaceCard>

      <SurfaceCard tone="tinted">
        <SectionHeader
          title="3. Otomatik olarak yüklenir"
          subtitle="Bağlantı kurulduğunda ana ekrana çıkan açık borç, ödeme ve duyuru akışına erişeceksiniz."
        />
      </SurfaceCard>
    </ScrollView>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  )
}

function ActionRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  value: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.brand} name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons color={colors.inkMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
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
    paddingBottom: 144,
    gap: spacing.lg,
  },
  header: {
    paddingTop: 8,
  },
  pageEyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pageTitle: {
    ...typography.heading,
    color: colors.ink,
    lineHeight: 30,
  },
  pageSub: {
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 8,
  },
  hero: {
    borderRadius: radii.xxl,
    padding: spacing.xxl,
    shadowColor: '#0f1d16',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 6,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
  },
  heroBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    marginTop: 12,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  heroHelper: {
    marginTop: spacing.xl,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 280,
  },
  heroAction: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  heroActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandDeep,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.inkSecondary,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.dangerInk,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorText: {
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand,
  },
  lastPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  lastPaymentBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastPaymentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  lastPaymentSub: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 4,
  },
  inlineLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand,
  },
})
