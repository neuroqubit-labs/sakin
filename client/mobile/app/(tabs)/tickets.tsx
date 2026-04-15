import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { TicketCategory, TicketPriority, TicketStatus } from '@sakin/shared'
import { GradientBg, GlassCard, PrimaryButton } from '@/components'
import { colors, radii, spacing } from '@/theme'
import { useCreateTicket, useMyTickets, type TicketItem } from '@/features/ticket/queries'

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

const STATUS_TINT: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: '#fbbf24',
  [TicketStatus.ASSIGNED]: '#60a5fa',
  [TicketStatus.IN_PROGRESS]: '#60a5fa',
  [TicketStatus.WAITING]: '#a78bfa',
  [TicketStatus.RESOLVED]: colors.success,
  [TicketStatus.CLOSED]: 'rgba(255,255,255,0.45)',
  [TicketStatus.CANCELLED]: colors.danger,
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Satır ───────────────────────────────────────────────────────────────────

function TicketRow({ item }: { item: TicketItem }) {
  return (
    <GlassCard style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.statusPill, { borderColor: STATUS_TINT[item.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_TINT[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.rowMeta}>
        {CATEGORY_LABELS[item.category]} · {formatDate(item.createdAt)}
      </Text>
      {item.description ? (
        <Text style={styles.rowDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </GlassCard>
  )
}

// ─── Oluşturma Modalı ────────────────────────────────────────────────────────

function NewTicketModal({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const createTicket = useCreateTicket()
  const [category, setCategory] = useState<TicketCategory>(TicketCategory.OTHER)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)

  function reset() {
    setCategory(TicketCategory.OTHER)
    setTitle('')
    setDescription('')
    setPriority(TicketPriority.MEDIUM)
  }

  async function submit() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve açıklama zorunludur.')
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
      Alert.alert('Teşekkürler', 'Talebiniz iletildi. Yönetim en kısa sürede dönüş yapacak.')
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Talep oluşturulamadı.')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GradientBg>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Yeni Talep</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Kategori</Text>
            <View style={styles.chipRow}>
              {CATEGORY_OPTIONS.map((c) => {
                const active = c === category
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {CATEGORY_LABELS[c]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.label}>Öncelik</Text>
            <View style={styles.chipRow}>
              {[
                TicketPriority.LOW,
                TicketPriority.MEDIUM,
                TicketPriority.HIGH,
                TicketPriority.URGENT,
              ].map((p) => {
                const active = p === priority
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {p === TicketPriority.LOW
                        ? 'Düşük'
                        : p === TicketPriority.MEDIUM
                          ? 'Orta'
                          : p === TicketPriority.HIGH
                            ? 'Yüksek'
                            : 'Acil'}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.label}>Başlık</Text>
            <TextInput
              style={styles.input}
              placeholder="Kısa başlık"
              placeholderTextColor={colors.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Sorunu detaylandırın"
              placeholderTextColor={colors.textFaint}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <PrimaryButton
              label="Talebi Gönder"
              onPress={() => void submit()}
              loading={createTicket.isPending}
              style={styles.submit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </GradientBg>
    </Modal>
  )
}

// ─── Ana Ekran ───────────────────────────────────────────────────────────────

export default function TicketsScreen() {
  const query = useMyTickets()
  const [modalVisible, setModalVisible] = useState(false)

  const tickets: TicketItem[] = query.data?.data ?? []
  const error = query.error ? (query.error as Error).message : null

  return (
    <GradientBg>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Taleplerim</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TicketRow item={item} />}
          contentContainerStyle={
            tickets.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor="rgba(255,255,255,0.8)"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🛠️</Text>
              <Text style={styles.emptyTitle}>Talebiniz yok</Text>
              <Text style={styles.emptySub}>
                Arıza veya talep bildirimi için yukarıdaki “+ Yeni” düğmesine dokunun.
              </Text>
            </View>
          }
        />
      )}

      <NewTicketModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </GradientBg>
  )
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  addButton: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },

  listContainer: { padding: spacing.lg, paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  // Satır
  rowCard: { marginBottom: spacing.sm + 2 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginRight: spacing.sm },
  statusPill: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  rowDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  modalClose: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  modalCloseText: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  modalContent: { padding: spacing.xl, paddingBottom: 48 },

  label: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
    borderRadius: radii.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.glassBgStrong,
    borderColor: colors.glassBorderStrong,
  },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.textPrimary },

  input: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  textarea: { minHeight: 120 },
  submit: { marginTop: spacing.xl },

  // Boş durum
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },

  // Hata
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center' },
})
