import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { DuesStatus } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

const STATUS_LABELS: Record<DuesStatus, string> = {
  [DuesStatus.PENDING]: 'Bekliyor',
  [DuesStatus.PAID]: 'Ödendi',
  [DuesStatus.OVERDUE]: 'Gecikmiş',
  [DuesStatus.PARTIALLY_PAID]: 'Kısmen Ödendi',
  [DuesStatus.WAIVED]: 'Silindi',
  [DuesStatus.CANCELLED]: 'İptal',
}

const STATUS_COLORS: Record<DuesStatus, string> = {
  [DuesStatus.PENDING]: '#f59e0b',
  [DuesStatus.PAID]: '#10b981',
  [DuesStatus.OVERDUE]: '#ef4444',
  [DuesStatus.PARTIALLY_PAID]: '#3b82f6',
  [DuesStatus.WAIVED]: '#6b7280',
  [DuesStatus.CANCELLED]: '#4b5563',
}

interface DuesItem {
  id: string
  periodMonth: number
  periodYear: number
  amount: string | number
  status: DuesStatus
  dueDate: string
  unit: { number: string; site: { name: string } }
}

interface DuesResponse {
  data: DuesItem[]
  meta: { total: number; page: number; limit: number }
}

function toNumber(v: string | number): number {
  return typeof v === 'string' ? Number(v) : v
}

export default function MyDuesScreen() {
  const { session } = useAuthSession()
  const [dues, setDues] = useState<DuesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadDues() {
    setError(null)
    try {
      const response = await apiClient<DuesResponse>(
        '/dues',
        { params: { limit: 50 } },
        session?.tenantId,
      )
      setDues(response.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veriler yüklenemedi')
    }
  }

  useEffect(() => {
    if (!session) return
    setLoading(true)
    void loadDues().finally(() => setLoading(false))
  }, [session])

  async function onRefresh() {
    setRefreshing(true)
    await loadDues()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Oturum açılıyor...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Aidat Durumum</Text>
        {dues.length > 0 && (
          <Text style={styles.subtitle}>{dues.length} kayıt</Text>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && dues.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aidat kaydı bulunamadı.</Text>
        </View>
      )}

      {dues.map((item) => {
        const amount = toNumber(item.amount)
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.period}>{item.periodMonth}/{item.periodYear}</Text>
                <Text style={styles.siteName}>{item.unit.site.name} · Daire {item.unit.number}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>₺{amount.toLocaleString('tr-TR')}</Text>
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
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  card: { margin: 12, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  period: { fontSize: 16, fontWeight: '600', color: '#374151' },
  siteName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 14 },
  emptyText: { color: '#6b7280', fontSize: 15 },
})
