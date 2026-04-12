import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

interface NotificationItem {
  id: string
  templateKey: string | null
  payload: Record<string, unknown> | null
  status: string
  createdAt: string
}

const TEMPLATE_LABELS: Record<string, string> = {
  'payment.confirmed': 'Ödeme Onaylandı',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsScreen() {
  const { session } = useAuthSession()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!session) return
    setError(null)
    try {
      const data = await apiClient<NotificationItem[]>(
        '/notifications',
        { params: { limit: 30 } },
        session.tenantId,
      )
      setNotifications(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bildirimler yüklenemedi')
    }
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [session])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bildirimler</Text>
      </View>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      {!error && notifications.length === 0 && (
        <View style={styles.center}><Text style={styles.emptyText}>Henüz bildirim yok.</Text></View>
      )}

      {notifications.map((item) => {
        const label = item.templateKey ? (TEMPLATE_LABELS[item.templateKey] ?? item.templateKey) : 'Bildirim'
        const amount = item.payload?.['amount'] as number | undefined
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {amount !== undefined && (
              <Text style={styles.amount}>₺{Number(amount).toLocaleString('tr-TR')}</Text>
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  card: { margin: 12, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  date: { fontSize: 11, color: '#6b7280' },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#10b981', marginTop: 4 },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 14 },
  emptyText: { color: '#6b7280', fontSize: 15 },
})
