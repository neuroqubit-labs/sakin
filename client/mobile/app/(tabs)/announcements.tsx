import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { EmptyState, SurfaceCard } from '@/components'
import { useAnnouncements, type Announcement } from '@/features/announcement/queries'
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notification/queries'
import { colors, radii, spacing, typography } from '@/theme'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function excerpt(text: string, max = 110) {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export default function AnnouncementsScreen() {
  const router = useRouter()
  const query = useAnnouncements()
  const unreadQuery = useUnreadNotificationCount()
  const notificationsQuery = useNotifications()
  const markRead = useMarkNotificationRead()
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<Announcement | null>(null)

  const announcements = query.data?.data ?? []
  const unreadCount = unreadQuery.data?.count ?? 0

  // Modal açıldığında seçili duyuruya bağlı okunmamış notification'ı okundu işaretle.
  useEffect(() => {
    if (!selected) return
    const notifications = notificationsQuery.data ?? []
    const match = notifications.find((item) => {
      if (item.readAt) return false
      if (item.templateKey !== 'announcement.published') return false
      const payload = item.payload as { announcementId?: string } | null
      return payload?.announcementId === selected.id
    })
    if (match) {
      markRead.mutate(match.id)
    }
  }, [selected, notificationsQuery.data, markRead])

  return (
    <View style={styles.screen}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnnouncementRow
            item={item}
            onPress={() => setSelected(item)}
            last={index === announcements.length - 1}
          />
        )}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Duyurular</Text>
              <Text style={styles.title}>Seni ilgilendiren notları sakin ve okunur bir akışta topla.</Text>
            </View>

            <LinearGradient
              colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>Bildirim merkezi</Text>
              <Text style={styles.heroTitle}>
                {unreadCount > 0
                  ? `${unreadCount} okunmamış bildirim dikkati bekliyor.`
                  : 'Tüm duyurularına bakmış görünüyorsun.'}
              </Text>
              <Text style={styles.heroBody}>
                Yönetimin yeni paylaşımları ve seni ilgilendiren güncellemeler burada tek standarda toplanır.
              </Text>
            </LinearGradient>

            <SurfaceCard tone="tinted" style={styles.summaryCard}>
              <View style={styles.metrics}>
                <Metric value={String(announcements.length)} label="Toplam" />
                <Metric value={String(unreadCount)} label="Okunmamış" />
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.listCard}>
              <Text style={styles.sectionTitle}>Tüm duyurular</Text>
              <Text style={styles.sectionSubtitle}>
                Açıklama satırı ve tarih bilgisiyle hangi metni açman gerektiğini hızlı anlarsın.
              </Text>

              {query.isLoading && !query.data ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={styles.centerText}>Duyurular yükleniyor...</Text>
                </View>
              ) : null}

              {query.error ? (
                <Text style={styles.errorText}>
                  {query.error instanceof Error ? query.error.message : 'Duyurular çekilemedi.'}
                </Text>
              ) : null}
            </SurfaceCard>
          </>
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 28),
            paddingBottom: insets.bottom + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching || unreadQuery.isRefetching}
            onRefresh={() => void Promise.all([query.refetch(), unreadQuery.refetch()])}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          !query.isLoading && !query.error ? (
            <SurfaceCard style={styles.emptyCard}>
              <EmptyState
                icon="mail-open-outline"
                title="Yeni duyuru yok."
                body="Yönetimin yeni paylaşımları geldiğinde burada sakin bir okunma akışı ile görünecek."
                primary={{
                  label: "Bugün'e dön",
                  onPress: () => router.replace('/(tabs)' as never),
                }}
                secondary={{
                  label: 'Ödeme geçmişini aç',
                  onPress: () => router.push('/payment-history' as never),
                }}
              />
            </SurfaceCard>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 36 }} />}
      />

      <AnnouncementModal
        item={selected}
        insetsBottom={insets.bottom}
        insetsTop={insets.top}
        onClose={() => setSelected(null)}
      />
    </View>
  )
}

function AnnouncementRow({
  item,
  onPress,
  last,
}: {
  item: Announcement
  onPress: () => void
  last: boolean
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, last && { marginBottom: 0 }]}>
      <View style={styles.rowIconWrap}>
        <Ionicons color={colors.brand} name="megaphone-outline" size={18} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowExcerpt}>{excerpt(item.content)}</Text>
        <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
    </Pressable>
  )
}

function AnnouncementModal({
  item,
  insetsBottom,
  insetsTop,
  onClose,
}: {
  item: Announcement | null
  insetsBottom: number
  insetsTop: number
  onClose: () => void
}) {
  return (
    <Modal
      visible={item !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalScreen}>
        <LinearGradient
          colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
          style={[styles.modalHero, { paddingTop: insetsTop + spacing.lg }]}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Duyuru detayı</Text>
              <Text style={styles.modalHeaderTitle}>Yönetimin notu tek odakta açılır.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {item ? (
          <ScrollView
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insetsBottom + spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <SurfaceCard>
              <Text style={styles.modalTitle}>{item.title}</Text>
              <Text style={styles.modalDate}>{formatDate(item.createdAt)}</Text>
              <View style={styles.modalDivider} />
              <Text style={styles.modalBody}>{item.content}</Text>
            </SurfaceCard>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
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
  },
  header: {
    paddingTop: 8,
    marginBottom: spacing.lg,
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
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 33,
  },
  heroBody: {
    marginTop: spacing.md,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
  },
  summaryCard: {
    marginTop: spacing.lg,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  listCard: {
    marginTop: spacing.lg,
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
  centerState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  centerText: {
    color: colors.inkSecondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  rowExcerpt: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 19,
  },
  rowDate: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  modalHero: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 30,
    maxWidth: 280,
  },
  modalClose: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 30,
  },
  modalDate: {
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: spacing.sm,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.xl,
  },
  modalBody: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 28,
  },
})
