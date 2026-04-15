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
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAnnouncements, type Announcement } from '@/features/announcement/queries'

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function excerpt(text: string, max = 90): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

// ─── Duyuru Satırı ───────────────────────────────────────────────────────────

function AnnouncementRow({
  item,
  onPress,
}: {
  item: Announcement
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowIconWrap}>
        <Text style={styles.rowIcon}>📢</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowExcerpt}>{excerpt(item.content)}</Text>
        <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Detay Modal ─────────────────────────────────────────────────────────────

function AnnouncementModal({
  item,
  onClose,
}: {
  item: Announcement | null
  onClose: () => void
}) {
  return (
    <Modal
      visible={item !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient colors={['#0D4F3C', '#1A7A5E', '#2BA87E']} style={{ flex: 1 }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Duyuru</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Kapat</Text>
          </TouchableOpacity>
        </View>
        {item && (
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{item.title}</Text>
            <Text style={styles.modalDate}>{formatDate(item.createdAt)}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalBody}>{item.content}</Text>
          </ScrollView>
        )}
      </LinearGradient>
    </Modal>
  )
}

// ─── Ana Ekran ───────────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const query = useAnnouncements()
  const [selected, setSelected] = useState<Announcement | null>(null)

  const loading = query.isLoading
  const refreshing = query.isRefetching
  const error = query.error ? (query.error as Error).message : null
  const announcements: Announcement[] = query.data?.data ?? []

  async function onRefresh() {
    await query.refetch()
  }

  return (
    <LinearGradient colors={['#0D4F3C', '#1A7A5E', '#2BA87E']} style={styles.gradient}>
      {/* Sayfa başlığı */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Duyurular</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnnouncementRow item={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={
            announcements.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor="rgba(255,255,255,0.8)"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Duyuru yok</Text>
              <Text style={styles.emptySub}>Yeni duyurular burada görünecek.</Text>
            </View>
          }
        />
      )}

      <AnnouncementModal item={selected} onClose={() => setSelected(null)} />
    </LinearGradient>
  )
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const GLASS_BG = 'rgba(255, 255, 255, 0.12)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.2)'

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  pageHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  listContainer: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  // Satır
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginBottom: 10,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  rowIcon: { fontSize: 18 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  rowExcerpt: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  rowDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 },
  rowChevron: { fontSize: 22, color: 'rgba(255,255,255,0.3)', marginLeft: 8, marginTop: 4 },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  modalClose: { paddingVertical: 4, paddingHorizontal: 8 },
  modalCloseText: { fontSize: 16, color: '#6ee7b7', fontWeight: '600' },
  modalContent: { padding: 20, paddingBottom: 48 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', lineHeight: 32 },
  modalDate: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 20,
  },
  modalBody: { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 26 },

  // Boş durum
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  // Hata
  errorText: { color: '#fca5a5', fontSize: 15, textAlign: 'center' },
})
