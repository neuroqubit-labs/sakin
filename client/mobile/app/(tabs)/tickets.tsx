import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TicketCategory, TicketPriority, TicketStatus } from '@sakin/shared'
import { PrimaryButton, SurfaceCard } from '@/components'
import { useCreateTicket, useMyTickets, type TicketItem } from '@/features/ticket/queries'
import { colors, radii, spacing, typography } from '@/theme'

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.ELEVATOR]: 'Asansör',
  [TicketCategory.PLUMBING]: 'Tesisat',
  [TicketCategory.ELECTRICAL]: 'Elektrik',
  [TicketCategory.CLEANING]: 'Temizlik',
  [TicketCategory.HEATING]: 'Isıtma',
  [TicketCategory.SECURITY]: 'Güvenlik',
  [TicketCategory.PARKING]: 'Otopark',
  [TicketCategory.GARDEN]: 'Bahçe',
  [TicketCategory.COMMON_AREA]: 'Ortak Alan',
  [TicketCategory.NOISE]: 'Gürültü',
  [TicketCategory.PEST]: 'Haşere',
  [TicketCategory.OTHER]: 'Diğer',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Açık',
  [TicketStatus.ASSIGNED]: 'Atandı',
  [TicketStatus.IN_PROGRESS]: 'İşlemde',
  [TicketStatus.WAITING]: 'Beklemede',
  [TicketStatus.RESOLVED]: 'Çözüldü',
  [TicketStatus.CLOSED]: 'Kapatıldı',
  [TicketStatus.CANCELLED]: 'İptal',
}

const STATUS_TONE: Record<TicketStatus, { bg: string; text: string }> = {
  [TicketStatus.OPEN]: { bg: colors.warningSoft, text: colors.warning },
  [TicketStatus.ASSIGNED]: { bg: colors.surfaceTintStrong, text: colors.brand },
  [TicketStatus.IN_PROGRESS]: { bg: colors.surfaceTintStrong, text: colors.brand },
  [TicketStatus.WAITING]: { bg: '#EEE7FA', text: '#6D58A6' },
  [TicketStatus.RESOLVED]: { bg: colors.brandSoft, text: colors.brandDeep },
  [TicketStatus.CLOSED]: { bg: colors.canvasMuted, text: colors.inkMuted },
  [TicketStatus.CANCELLED]: { bg: colors.dangerSoft, text: colors.dangerInk },
}

const CATEGORY_OPTIONS: TicketCategory[] = [
  TicketCategory.ELEVATOR,
  TicketCategory.PLUMBING,
  TicketCategory.ELECTRICAL,
  TicketCategory.HEATING,
  TicketCategory.CLEANING,
  TicketCategory.SECURITY,
  TicketCategory.COMMON_AREA,
  TicketCategory.NOISE,
  TicketCategory.OTHER,
]

const PRIORITY_OPTIONS: TicketPriority[] = [
  TicketPriority.LOW,
  TicketPriority.MEDIUM,
  TicketPriority.HIGH,
  TicketPriority.URGENT,
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function priorityLabel(priority: TicketPriority) {
  if (priority === TicketPriority.LOW) return 'Düşük'
  if (priority === TicketPriority.MEDIUM) return 'Orta'
  if (priority === TicketPriority.HIGH) return 'Yüksek'
  return 'Acil'
}

export default function TicketsScreen() {
  const query = useMyTickets()
  const insets = useSafeAreaInsets()
  const [modalVisible, setModalVisible] = useState(false)

  const tickets = query.data?.data ?? []
  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status !== TicketStatus.RESOLVED &&
      ticket.status !== TicketStatus.CLOSED &&
      ticket.status !== TicketStatus.CANCELLED,
  )

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 28),
            paddingBottom: insets.bottom + 48,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Talepler</Text>
          <Text style={styles.title}>Arıza ve süreç takibini daha sakin, daha net bir yüzeyden yönet.</Text>
        </View>

        <LinearGradient
          colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>Süreç merkezi</Text>
          <Text style={styles.heroTitle}>
            {openTickets.length > 0
              ? `${openTickets.length} aktif talep yönetimden cevap bekliyor.`
              : 'Şu an açık talebin yok.'}
          </Text>
          <Text style={styles.heroBody}>
            Yeni bir sorun bildirmek istersen kategori seçimiyle hızlı başlayıp detayı tek akışta tamamlayabilirsin.
          </Text>
          <Pressable onPress={() => setModalVisible(true)} style={styles.heroButton}>
            <Ionicons color={colors.brand} name="add-circle" size={18} />
            <Text style={styles.heroButtonText}>Yeni Talep</Text>
          </Pressable>
        </LinearGradient>

        <SurfaceCard tone="tinted">
          <View style={styles.metrics}>
            <Metric value={String(tickets.length)} label="Toplam süreç" />
            <Metric value={String(openTickets.length)} label="Aktif" />
            <Metric
              value={String(
                tickets.filter((ticket) => ticket.status === TicketStatus.RESOLVED).length,
              )}
              label="Çözüldü"
            />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tüm talepler</Text>
            <Text style={styles.sectionSubtitle}>
              En yeni süreçler en üstte görünür. Her kart tek bakışta durum verir.
            </Text>
          </View>

          {query.isLoading && !query.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.centerText}>Süreçler hazırlanıyor...</Text>
            </View>
          ) : null}

          {query.error ? (
            <Text style={styles.errorText}>
              {query.error instanceof Error ? query.error.message : 'Talepler açılamadı.'}
            </Text>
          ) : null}

          {!query.isLoading && !query.error && tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.brand} name="construct-outline" size={28} />
              <Text style={styles.emptyTitle}>Henüz talep açmadın.</Text>
              <Text style={styles.emptySub}>
                Asansör, temizlik, güvenlik veya ortak alan gibi konuları buradan iletebilirsin.
              </Text>
            </View>
          ) : null}

          {tickets.map((item, index) => (
            <TicketRow key={item.id} item={item} last={index === tickets.length - 1} />
          ))}
        </SurfaceCard>
      </ScrollView>

      <NewTicketModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
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

function TicketRow({ item, last }: { item: TicketItem; last: boolean }) {
  const statusTone = STATUS_TONE[item.status]
  return (
    <View style={[styles.ticketRow, !last && styles.rowBorder]}>
      <View style={styles.ticketTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticketTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.ticketMeta}>
            {CATEGORY_LABELS[item.category]} · {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
          <Text style={[styles.statusText, { color: statusTone.text }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.ticketDesc} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.ticketBottom}>
        <View style={styles.ticketTag}>
          <Ionicons color={colors.inkMuted} name="flag-outline" size={14} />
          <Text style={styles.ticketTagText}>{priorityLabel(item.priority)}</Text>
        </View>
        {item.site?.name || item.unit?.number ? (
          <View style={styles.ticketTag}>
            <Ionicons color={colors.inkMuted} name="business-outline" size={14} />
            <Text style={styles.ticketTagText}>
              {item.site?.name ?? 'Site'}{item.unit?.number ? ` · Daire ${item.unit.number}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function NewTicketModal({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const createTicket = useCreateTicket()
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.OTHER)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [feedback, setFeedback] = useState<string | null>(null)

  function reset() {
    setCategory(TicketCategory.OTHER)
    setTitle('')
    setDescription('')
    setPriority(TicketPriority.MEDIUM)
    setFeedback(null)
  }

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setFeedback('Başlık ve açıklama birlikte gerekli.')
      return
    }

    try {
      await createTicket.mutateAsync({
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
      })
      reset()
      onClose()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Talep oluşturulamadı.')
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        reset()
        onClose()
      }}
    >
      <View style={styles.modalScreen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
            style={[styles.modalHero, { paddingTop: insets.top + spacing.lg }]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Yeni talep</Text>
                <Text style={styles.modalTitle}>Sorunu önce doğru kategoriye yerleştir, sonra netleştir.</Text>
              </View>
              <Pressable
                onPress={() => {
                  reset()
                  onClose()
                }}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>Kapat</Text>
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SurfaceCard>
              <Text style={styles.formLabel}>Kategori</Text>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((item) => {
                  const active = item === category
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setCategory(item)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {CATEGORY_LABELS[item]}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={styles.formLabel}>Öncelik</Text>
              <View style={styles.chipRow}>
                {PRIORITY_OPTIONS.map((item) => {
                  const active = item === priority
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setPriority(item)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {priorityLabel(item)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </SurfaceCard>

            <SurfaceCard>
              <Text style={styles.formLabel}>Başlık</Text>
              <TextInput
                style={styles.input}
                placeholder="Örneğin: Asansör 3. katta duruyor"
                placeholderTextColor={colors.inkMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />

              <Text style={[styles.formLabel, styles.formLabelGap]}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Ne zaman fark ettin, ne kadar acil, nasıl bir sorun var?"
                placeholderTextColor={colors.inkMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />

              {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

              <PrimaryButton
                label="Talebi Gönder"
                onPress={() => void submit()}
                loading={createTicket.isPending}
                style={styles.submit}
              />
            </SurfaceCard>
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: 48,
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
  heroButton: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  heroButtonText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '800',
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
  centerState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  centerText: {
    color: colors.inkSecondary,
    fontSize: 14,
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
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  ticketRow: {
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 22,
  },
  ticketMeta: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 6,
  },
  statusPill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  ticketDesc: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 20,
  },
  ticketBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ticketTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.canvasMuted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ticketTagText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
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
  modalTitle: {
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
    gap: spacing.lg,
  },
  formLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  formLabelGap: {
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.canvasMuted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandAccent,
  },
  chipText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.brandDeep,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontSize: 15,
  },
  textarea: {
    minHeight: 132,
  },
  feedbackText: {
    marginTop: spacing.md,
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
  },
  submit: {
    marginTop: spacing.xl,
  },
})
