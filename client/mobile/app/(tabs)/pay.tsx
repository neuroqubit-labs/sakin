import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DuesStatus } from '@sakin/shared'
import { PrimaryButton, SurfaceCard } from '@/components'
import { useUnpaidDues, type DuesItem } from '@/features/dues/queries'
import { clearPaymentFlow, savePaymentFlow, usePaymentFlow } from '@/features/payment/flow-state'
import { parseCallbackStatus } from '@/features/payment/callback'
import { useMyPayments, useStartPayment, type PaymentItem } from '@/features/payment/queries'
import { resolveSmartAction } from '@/features/shell/smart-action'
import { colors, radii, spacing, typography } from '@/theme'

const CALLBACK_BASE = 'sakin://payment'

type PaymentResultKind = 'success' | 'failure' | 'unknown' | null

function formatCurrency(value: number) {
  return `₺${value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Tarih bekleniyor'
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
  })
}

function toNumber(value: string | number) {
  return typeof value === 'string' ? Number(value) : value
}

export default function PayScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const duesQuery = useUnpaidDues()
  const paymentsQuery = useMyPayments()
  const startPayment = useStartPayment()
  const paymentFlowQuery = usePaymentFlow()

  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null)
  const [webviewVisible, setWebviewVisible] = useState(false)
  const [callbackHandled, setCallbackHandled] = useState(false)
  const [resultKind, setResultKind] = useState<PaymentResultKind>(null)
  const [checkingFlow, setCheckingFlow] = useState(false)

  const unpaid: DuesItem[] = (duesQuery.data?.data ?? []).filter(
    (item) =>
      item.status !== DuesStatus.PAID &&
      item.status !== DuesStatus.CANCELLED &&
      item.status !== DuesStatus.WAIVED,
  )
  const totalDebt = unpaid.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const overdueCount = unpaid.filter((item) => item.status === DuesStatus.OVERDUE).length
  const recentPayments = useMemo(
    () =>
      [...(paymentsQuery.data?.data ?? [])]
        .sort((a, b) => {
          const dateA = a.paidAt ?? a.confirmedAt ?? a.createdAt
          const dateB = b.paidAt ?? b.confirmedAt ?? b.createdAt
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        })
        .slice(0, 3),
    [paymentsQuery.data],
  )
  const paymentFlow = paymentFlowQuery.data ?? null
  const action = resolveSmartAction({
    overdueCount,
    dueCount: unpaid.length,
    paymentFlow,
  })

  useEffect(() => {
    if (!paymentFlow) return
    const matchedPayment = (paymentsQuery.data?.data ?? []).some(
      (item) => item.id === paymentFlow.paymentId,
    )
    if (matchedPayment) {
      void clearPaymentFlow()
    }
  }, [paymentFlow, paymentsQuery.data])

  async function onStart(duesId: string) {
    setCallbackHandled(false)
    try {
      const checkout = await startPayment.mutateAsync({
        duesId,
        callbackUrl: `${CALLBACK_BASE}/callback`,
      })
      await savePaymentFlow({
        status: 'active',
        duesId,
        paymentId: checkout.paymentId,
        amount: checkout.amount,
        updatedAt: new Date().toISOString(),
      })
      setCheckoutHtml(checkout.checkoutFormContent)
      setWebviewVisible(true)
    } catch (error) {
      setResultKind('failure')
      console.warn(error)
    }
  }

  async function refreshAndResolveFlow() {
    if (!paymentFlow) {
      await Promise.all([duesQuery.refetch(), paymentsQuery.refetch()])
      return
    }

    setCheckingFlow(true)
    try {
      const [duesResult, paymentsResult] = await Promise.all([
        duesQuery.refetch(),
        paymentsQuery.refetch(),
      ])
      const updatedDues = duesResult.data?.data ?? []
      const updatedPayments = paymentsResult.data?.data ?? []
      const matchedPayment = updatedPayments.some((item) => item.id === paymentFlow.paymentId)
      const targetStillDue = updatedDues.some((item) => item.id === paymentFlow.duesId)

      if (matchedPayment || !targetStillDue) {
        await clearPaymentFlow()
        setResultKind('success')
        return
      }

      await savePaymentFlow({
        ...paymentFlow,
        status: 'unknown',
        updatedAt: new Date().toISOString(),
      })
      setResultKind('unknown')
    } finally {
      setCheckingFlow(false)
    }
  }

  async function closeWebview() {
    if (!callbackHandled && paymentFlow) {
      await savePaymentFlow({
        ...paymentFlow,
        status: 'active',
        updatedAt: new Date().toISOString(),
      })
    }
    setWebviewVisible(false)
    setCheckoutHtml(null)
  }

  function handleWebviewNavigation(event: WebViewNavigation) {
    const { url } = event
    if (!url.startsWith(CALLBACK_BASE) || callbackHandled) return

    setCallbackHandled(true)
    setWebviewVisible(false)
    setCheckoutHtml(null)

    const status = parseCallbackStatus(url)
    if (status === 'success') {
      void clearPaymentFlow()
      void Promise.all([duesQuery.refetch(), paymentsQuery.refetch()])
      setResultKind('success')
      return
    }

    if (status === 'failure') {
      void clearPaymentFlow()
      setResultKind('failure')
      return
    }

    if (paymentFlow) {
      void savePaymentFlow({
        ...paymentFlow,
        status: 'unknown',
        updatedAt: new Date().toISOString(),
      })
    }
    void Promise.all([duesQuery.refetch(), paymentsQuery.refetch()])
    setResultKind('unknown')
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 28),
            paddingBottom: insets.bottom + 112,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={duesQuery.isRefetching || paymentsQuery.isRefetching || checkingFlow}
            onRefresh={() => void Promise.all([duesQuery.refetch(), paymentsQuery.refetch()])}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.pageEyebrow}>Ödeme</Text>
          <Text style={styles.pageTitle}>Ödeme kararlarını, geçmişi ve devam eden akışı tek yerde topla.</Text>
        </View>

        <SurfaceCard tone="tinted" style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {action.state === 'resume_payment'
              ? 'Son ödemen tekrar kontrol bekliyor.'
              : action.state === 'pay_overdue'
                ? `${overdueCount} gecikmiş ödeme seni bekliyor.`
                : action.state === 'pay_due'
                  ? `${unpaid.length} açık ödemen hazır.`
                  : 'Ödeme tarafında her şey düzende görünüyor.'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {action.state === 'resume_payment'
              ? 'Sürecin tamamlanıp tamamlanmadığını yenileyip netleştirelim.'
              : `${formatCurrency(totalDebt)} toplam açık tutar. Ödeme ekranı önce kararı, sonra detayları gösterir.`}
          </Text>
          <Text style={styles.heroHelper}>{action.helper}</Text>

          <View style={styles.heroStats}>
            <MiniStat label="Açık" value={String(unpaid.length)} />
            <MiniStat label="Gecikmiş" value={String(overdueCount)} />
            <MiniStat label="Geçmiş" value={String(paymentsQuery.data?.data?.length ?? 0)} />
          </View>
        </SurfaceCard>

        {paymentFlow ? (
          <SurfaceCard tone="danger">
            <View style={styles.resumeHeader}>
              <View style={styles.resumeIcon}>
                <Ionicons color={colors.dangerInk} name="refresh-circle" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeTitle}>Ödeme akışı tekrar kontrol bekliyor.</Text>
                <Text style={styles.resumeSubtitle}>
                  Son hareket {formatDate(paymentFlow.updatedAt)} · {formatCurrency(paymentFlow.amount)}
                </Text>
              </View>
            </View>
            <PrimaryButton
              label={checkingFlow ? 'Kontrol Ediliyor...' : 'Durumu Yenile'}
              loading={checkingFlow}
              onPress={() => void refreshAndResolveFlow()}
              style={styles.resumeButton}
            />
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <SectionHeader
            title="Açık ödemeler"
            subtitle="Listeyi değil, önce önceliği görmen için kurgulandı."
          />

          {duesQuery.isLoading && !duesQuery.data ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.loadingText}>Açık ödemeler hazırlanıyor...</Text>
            </View>
          ) : null}

          {duesQuery.error ? (
            <Text style={styles.errorText}>
              {duesQuery.error instanceof Error ? duesQuery.error.message : 'Ödemeler çekilemedi.'}
            </Text>
          ) : null}

          {unpaid.length === 0 && !duesQuery.error ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.brand} name="checkmark-circle" size={28} />
              <Text style={styles.emptyTitle}>Şu an açık ödemen yok.</Text>
              <Text style={styles.emptySub}>
                Geçmişi kontrol etmek veya makbuzlarına dönmek için aşağıdan devam edebilirsin.
              </Text>
            </View>
          ) : null}

          {unpaid.map((item, index) => (
            <DueRow
              key={item.id}
              item={item}
              onPay={() => void onStart(item.id)}
              disabled={startPayment.isPending}
              last={index === unpaid.length - 1}
            />
          ))}
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            title="Son hareketler"
            subtitle="Makbuzlara giden yol artık ayrı bir ekran aratmasın."
          />

          {recentPayments.length === 0 ? (
            <Text style={styles.secondaryEmpty}>Henüz onaylanmış ödemen yok.</Text>
          ) : (
            recentPayments.map((item, index) => (
              <PaymentPreviewRow key={item.id} item={item} last={index === recentPayments.length - 1} />
            ))
          )}

          <Pressable
            onPress={() => router.push('/payment-history' as never)}
            style={styles.historyLink}
          >
            <Text style={styles.historyLinkText}>Tüm ödeme geçmişini aç</Text>
            <Ionicons color={colors.brand} name="arrow-forward" size={16} />
          </Pressable>
        </SurfaceCard>
      </ScrollView>

      <Modal
        visible={webviewVisible}
        animationType="slide"
        onRequestClose={() => {
          void closeWebview()
        }}
      >
        <View style={styles.webviewScreen}>
          <View style={[styles.webviewHeader, { paddingTop: insets.top + spacing.md }]}>
            <View>
              <Text style={styles.webviewEyebrow}>Güvenli ödeme</Text>
              <Text style={styles.webviewTitle}>Kart bilgileri iyzico üzerinden işleniyor.</Text>
            </View>
            <Pressable onPress={() => void closeWebview()} style={styles.closeAction}>
              <Text style={styles.closeActionText}>Kapat</Text>
            </Pressable>
          </View>
          {checkoutHtml ? (
            <WebView
              source={{ html: checkoutHtml }}
              onNavigationStateChange={handleWebviewNavigation}
              javaScriptEnabled
              domStorageEnabled
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </Modal>

      <PaymentResultSheet
        kind={resultKind}
        onClose={() => setResultKind(null)}
        onPrimary={() => {
          if (resultKind === 'success') {
            setResultKind(null)
            router.push('/payment-history' as never)
            return
          }
          if (resultKind === 'unknown') {
            setResultKind(null)
            void refreshAndResolveFlow()
            return
          }
          setResultKind(null)
        }}
        onSecondary={() => {
          if (resultKind === 'success') {
            setResultKind(null)
            router.replace('/(tabs)' as never)
            return
          }
          if (resultKind === 'unknown') {
            setResultKind(null)
            router.push('/payment-history' as never)
            return
          }
          setResultKind(null)
        }}
      />
    </>
  )
}

function DueRow({
  item,
  onPay,
  disabled,
  last,
}: {
  item: DuesItem
  onPay: () => void
  disabled: boolean
  last: boolean
}) {
  const isOverdue = item.status === DuesStatus.OVERDUE
  return (
    <View style={[styles.dueRow, !last && styles.rowBorder]}>
      <View style={styles.dueHead}>
        <View style={styles.dueBadge}>
          <Text style={styles.dueBadgeText}>
            {isOverdue ? 'Gecikmiş' : 'Açık'}
          </Text>
        </View>
        <Text style={[styles.dueAmount, isOverdue && styles.dueAmountOverdue]}>
          {formatCurrency(toNumber(item.amount))}
        </Text>
      </View>
      <Text style={styles.dueTitle}>
        {item.periodMonth}/{item.periodYear} dönemi · {item.unit.site.name}
      </Text>
      <Text style={styles.dueSub}>
        Daire {item.unit.number} · Son tarih {formatDate(item.dueDate)}
      </Text>
      <PrimaryButton
        label={isOverdue ? 'Gecikmiş ödemeyi kapat' : 'Ödeme akışını başlat'}
        onPress={onPay}
        disabled={disabled}
        style={styles.dueButton}
      />
    </View>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
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

function PaymentPreviewRow({ item, last }: { item: PaymentItem; last: boolean }) {
  const when = item.paidAt ?? item.confirmedAt ?? item.createdAt
  return (
    <View style={[styles.previewRow, !last && styles.rowBorder]}>
      <View style={styles.previewIcon}>
        <Ionicons color={colors.brand} name="receipt-outline" size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.previewTitle}>
          {item.dues
            ? `${item.dues.periodMonth}/${item.dues.periodYear} ödemesi`
            : 'Ödeme kaydı'}
        </Text>
        <Text style={styles.previewSub}>{formatDate(when)}</Text>
      </View>
      <Text style={styles.previewAmount}>{formatCurrency(toNumber(item.amount))}</Text>
    </View>
  )
}

function PaymentResultSheet({
  kind,
  onClose,
  onPrimary,
  onSecondary,
}: {
  kind: PaymentResultKind
  onClose: () => void
  onPrimary: () => void
  onSecondary: () => void
}) {
  if (!kind) return null

  const config =
    kind === 'success'
      ? {
          icon: 'checkmark-circle' as const,
          title: 'Tamamlandı',
          body: 'Ödemen alındı. Borç durumu yenileniyor ve makbuzun geçmişte hazır olacak.',
          primary: 'Makbuzu Gör',
          secondary: 'Bugüne Dön',
          colors: [colors.brandDeep, colors.brand, colors.brandAccent] as const,
        }
      : kind === 'failure'
        ? {
            icon: 'close-circle' as const,
            title: 'Ödeme tamamlanamadı',
            body: 'Kart veya bağlantı nedeniyle işlem kesildi. Hazır olduğunda tekrar deneyebilirsin.',
            primary: 'Tekrar Dene',
            secondary: 'Kapat',
            colors: ['#7B2E29', '#A54B42', '#C86A59'] as const,
          }
        : {
            icon: 'help-circle' as const,
            title: 'Durum henüz net değil',
            body: 'Ödemenin sonucunu tekrar kontrol ederek borç ve geçmiş kayıtlarıyla eşleştireceğiz.',
            primary: 'Durumu Yenile',
            secondary: 'Geçmişe Git',
            colors: ['#5A4B13', '#8A7420', '#AE9B3D'] as const,
          }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.resultBackdrop}>
        <LinearGradient colors={config.colors} style={styles.resultCard}>
          <View style={styles.resultIconWrap}>
            <Ionicons color="#ffffff" name={config.icon} size={36} />
          </View>
          <Text style={styles.resultTitle}>{config.title}</Text>
          <Text style={styles.resultBody}>{config.body}</Text>
          <PrimaryButton
            label={config.primary}
            onPress={onPrimary}
            variant="secondary"
            style={styles.resultPrimary}
          />
          <Pressable onPress={onSecondary} style={styles.resultSecondary}>
            <Text style={styles.resultSecondaryText}>{config.secondary}</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
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
  heroCard: {
    gap: spacing.lg,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 31,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 22,
  },
  heroHelper: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resumeIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dangerInk,
  },
  resumeSubtitle: {
    fontSize: 12,
    color: colors.dangerInk,
    marginTop: 4,
  },
  resumeButton: {
    marginTop: spacing.lg,
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
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.inkSecondary,
  },
  errorText: {
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  emptySub: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 20,
    maxWidth: 280,
  },
  dueRow: {
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dueHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dueBadge: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  dueAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  dueAmountOverdue: {
    color: colors.dangerInk,
  },
  dueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  dueSub: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  dueButton: {
    marginTop: spacing.lg,
  },
  secondaryEmpty: {
    fontSize: 13,
    color: colors.inkSecondary,
    paddingBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  previewSub: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 4,
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand,
  },
  historyLink: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceTint,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand,
  },
  webviewScreen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  webviewHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  webviewEyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    maxWidth: 260,
  },
  closeAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand,
  },
  resultBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 18, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  resultCard: {
    width: '100%',
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 30,
  },
  resultIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
  },
  resultBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    marginTop: spacing.md,
  },
  resultPrimary: {
    marginTop: spacing.xl,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  resultSecondary: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resultSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
})
