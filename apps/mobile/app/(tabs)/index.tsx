import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { DuesStatus } from '@sakin/shared'

const STATUS_LABELS: Record<DuesStatus, string> = {
  [DuesStatus.PENDING]: 'Bekliyor',
  [DuesStatus.PAID]: 'Ödendi',
  [DuesStatus.OVERDUE]: 'Gecikmiş',
  [DuesStatus.PARTIALLY_PAID]: 'Kısmen Ödendi',
  [DuesStatus.WAIVED]: 'Silindi',
}

const STATUS_COLORS: Record<DuesStatus, string> = {
  [DuesStatus.PENDING]: '#f59e0b',
  [DuesStatus.PAID]: '#10b981',
  [DuesStatus.OVERDUE]: '#ef4444',
  [DuesStatus.PARTIALLY_PAID]: '#3b82f6',
  [DuesStatus.WAIVED]: '#6b7280',
}

export default function MyDuesScreen() {
  // TODO: API'den gerçek veri çek
  const mockDues = [
    { id: '1', periodMonth: 4, periodYear: 2026, amount: 500, paidAmount: 0, status: DuesStatus.PENDING },
    { id: '2', periodMonth: 3, periodYear: 2026, amount: 500, paidAmount: 0, status: DuesStatus.OVERDUE },
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aidat Durumum</Text>
      </View>

      {mockDues.map((dues) => (
        <View key={dues.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.period}>{dues.periodMonth}/{dues.periodYear}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[dues.status] + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[dues.status] }]}>
                {STATUS_LABELS[dues.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>
            ₺{dues.amount.toLocaleString('tr-TR')}
          </Text>
          {dues.paidAmount > 0 && (
            <Text style={styles.paid}>₺{dues.paidAmount.toLocaleString('tr-TR')} ödendi</Text>
          )}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  card: { margin: 12, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  period: { fontSize: 16, fontWeight: '600', color: '#374151' },
  amount: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  paid: { fontSize: 13, color: '#10b981', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
})
