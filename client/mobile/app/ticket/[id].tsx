import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TicketCategory, TicketPriority, TicketStatus } from '@sakin/shared'
import { PrimaryButton, SurfaceCard } from '@/components'
import {
  useAddTicketComment,
  useTicketAttachmentPayload,
  useTicketAttachments,
  useTicketDetail,
  type TicketAttachmentMeta,
} from '@/features/ticket/queries'
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

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function priorityLabel(priority: TicketPriority) {
  if (priority === TicketPriority.LOW) return 'Düşük'
  if (priority === TicketPriority.MEDIUM) return 'Orta'
  if (priority === TicketPriority.HIGH) return 'Yüksek'
  return 'Acil'
}

export default function TicketDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const ticketId = typeof params.id === 'string' ? params.id : null
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const detail = useTicketDetail(ticketId)
  const attachments = useTicketAttachments(ticketId)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const addComment = useAddTicketComment(ticketId ?? '')

  async function submitComment() {
    const body = commentDraft.trim()
    if (!body) {
      setCommentError('Boş mesaj gönderilemez.')
      return
    }
    if (!ticketId) return
    try {
      await addComment.mutateAsync(body)
      setCommentDraft('')
      setCommentError(null)
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Yorum gönderilemedi.')
    }
  }

  if (!ticketId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Geçersiz talep bağlantısı.</Text>
      </View>
    )
  }

  if (detail.isLoading && !detail.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {detail.error instanceof Error ? detail.error.message : 'Talep bulunamadı.'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri</Text>
        </Pressable>
      </View>
    )
  }

  const ticket = detail.data
  const statusTone = STATUS_TONE[ticket.status]
  const visibleComments = (ticket.comments ?? []).filter((c) => !c.isInternal)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
      keyboardVerticalOffset={insets.top + 12}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={detail.isRefetching || attachments.isRefetching}
            onRefresh={() => {
              void detail.refetch()
              void attachments.refetch()
            }}
            tintColor={colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Ionicons color={colors.brand} name="chevron-back" size={18} />
          <Text style={styles.backText}>Tüm talepler</Text>
        </Pressable>

        <SurfaceCard>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryText}>{CATEGORY_LABELS[ticket.category]}</Text>
              <Text style={styles.title}>{ticket.title}</Text>
              <Text style={styles.meta}>
                Oluşturuldu: {formatDateTime(ticket.createdAt)}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
              <Text style={[styles.statusText, { color: statusTone.text }]}>
                {STATUS_LABELS[ticket.status]}
              </Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Ionicons color={colors.inkMuted} name="flag-outline" size={14} />
              <Text style={styles.tagText}>{priorityLabel(ticket.priority)}</Text>
            </View>
            {ticket.site?.name ? (
              <View style={styles.tag}>
                <Ionicons color={colors.inkMuted} name="business-outline" size={14} />
                <Text style={styles.tagText}>
                  {ticket.site.name}
                  {ticket.unit?.number ? ` · Daire ${ticket.unit.number}` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionLabel}>Açıklama</Text>
          <Text style={styles.descriptionText}>{ticket.description}</Text>

          {ticket.resolution ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>Çözüm</Text>
              <Text style={styles.descriptionText}>{ticket.resolution}</Text>
            </>
          ) : null}

          {ticket.resolvedAt ? (
            <Text style={styles.timelineText}>Çözüldü: {formatDateTime(ticket.resolvedAt)}</Text>
          ) : null}
          {ticket.closedAt ? (
            <Text style={styles.timelineText}>Kapatıldı: {formatDateTime(ticket.closedAt)}</Text>
          ) : null}
        </SurfaceCard>

        {(attachments.data ?? []).length > 0 ? (
          <SurfaceCard style={styles.attachmentsCard}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <View style={styles.thumbRow}>
              {(attachments.data ?? []).map((att) => (
                <AttachmentThumb key={att.id} attachment={att} />
              ))}
            </View>
            <Text style={styles.thumbHint}>
              Ek fotoğraf admin panelinden değerlendirilir.
            </Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard style={styles.commentsCard}>
          <Text style={styles.sectionTitle}>Yazışma</Text>
          {visibleComments.length === 0 ? (
            <Text style={styles.emptyText}>
              Henüz yazışma yok. Aşağıdan yönetime mesaj yazabilirsin.
            </Text>
          ) : (
            visibleComments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Ionicons color={colors.brand} name="person-outline" size={14} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>
                    {comment.author?.displayName ?? 'Kullanıcı'}
                  </Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                  <Text style={styles.commentDate}>{formatDateTime(comment.createdAt)}</Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.composerRow}>
            <TextInput
              style={styles.composer}
              placeholder="Yönetime mesaj yaz..."
              placeholderTextColor={colors.inkMuted}
              value={commentDraft}
              onChangeText={setCommentDraft}
              multiline
            />
            {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}
            <PrimaryButton
              label="Gönder"
              onPress={() => void submitComment()}
              loading={addComment.isPending}
              style={styles.sendButton}
            />
          </View>
        </SurfaceCard>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function AttachmentThumb({ attachment }: { attachment: TicketAttachmentMeta }) {
  const payload = useTicketAttachmentPayload(attachment.id)
  const uri = payload.data ? `data:${payload.data.mimeType};base64,${payload.data.data}` : null
  return (
    <View style={styles.thumb}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumbImg} />
      ) : (
        <View style={styles.thumbLoading}>
          <ActivityIndicator color={colors.brand} size="small" />
        </View>
      )}
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
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    gap: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  backText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
  },
  backButtonText: {
    color: colors.brandDeep,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  categoryText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    ...typography.heading,
    color: colors.ink,
    lineHeight: 30,
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: colors.inkSecondary,
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.canvasMuted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabelGap: {
    marginTop: spacing.xl,
  },
  descriptionText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  timelineText: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  attachmentsCard: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.canvasMuted,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbHint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.inkMuted,
  },
  commentsCard: {
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  commentBody: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  commentDate: {
    marginTop: 6,
    fontSize: 11,
    color: colors.inkMuted,
  },
  composerRow: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  composer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignSelf: 'flex-end',
  },
  errorText: {
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
  },
})
