import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { PaymentMethod } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface PaymentItem {
  id: string
  amount: string | number
  currency: string
  method: PaymentMethod
  status: string
  paidAt: string | null
  confirmedAt: string | null
  createdAt: string
  dues: {
    periodMonth: number
    periodYear: number
    description: string | null
  } | null
}

interface PaymentHistoryResponse {
  data: PaymentItem[]
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.ONLINE_CARD]: 'Kredi/Banka Kartı',
  [PaymentMethod.BANK_TRANSFER]: 'Banka Transferi',
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.POS]: 'POS',
}

const METHOD_ICONS: Record<string, string> = {
  [PaymentMethod.ONLINE_CARD]: '💳',
  [PaymentMethod.BANK_TRANSFER]: '🏦',
  [PaymentMethod.CASH]: '💵',
  [PaymentMethod.POS]: '🖥️',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function toNumber(v: string | number): number {
  return typeof v === 'string' ? Number(v) : v
}

// ─── Ödeme Satırı ─────────────────────────────────────────────────────────────

function PaymentRow({ item }: { item: PaymentItem }) {
  const amount = toNumber(item.amount)
  const date = formatDate(item.paidAt ?? item.confirmedAt ?? item.createdAt)
  const icon = METHOD_ICONS[item.method] ?? '💰'
  const label = METHOD_LABELS[item.method] ?? item.method

  return (
    <View style={styles.row}>
      {/* Sol: ikon */}
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>

      {/* Orta: dönem + yöntem */}
      <View style={styles.rowBody}>
        {item.dues ? (
          <Text style={styles.rowTitle}>
            {item.dues.periodMonth}/{item.dues.periodYear} Aidatı
          </Text>
        ) : (
          <Text style={styles.rowTitle}>Ödeme</Text>
        )}
        <Text style={styles.rowSub}>{label} · {date}</Text>
      </View>

      {/* Sağ: tutar */}
      <Text style={styles.rowAmount}>
        ₺{amount.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
      </Text>
    </View>
  )
}

// ─── Ana Ekran ───────────────────────────────────────────────────────────────

export default function PaymentHistoryScreen() {
  const { session } = useAuthSession()
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!session) return
    setError(null)
    try {
      const res = await apiClient<PaymentHistoryResponse>(
        '/payments/my',
        { params: { limit: 50 } },
        session.tenantId,
      )
      setPayments(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ödeme geçmişi yüklenemedi')
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

  return (
    <LinearGradient colors={['#0D4F3C', '#1A7A5E', '#2BA87E']} style={styles.gradient}>
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
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PaymentRow item={item} />}
          contentContainerStyle={
            payments.length === 0 ? styles.emptyContainer : styles.listContainer
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
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>Henüz ödeme yok</Text>
              <Text style={styles.emptySub}>
                Onaylanan ödemeleriniz burada görünecek.
              </Text>
            </View>
          }
          ListHeaderComponent={
            payments.length > 0 ? (
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>Toplam Ödenen</Text>
                <Text style={styles.summaryAmount}>
                  ₺
                  {payments
                    .reduce((sum, p) => sum + toNumber(p.amount), 0)
                    .toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                </Text>
                <Text style={styles.summaryCount}>{payments.length} işlem</Text>
              </View>
            ) : null
          }
        />
      )}
    </LinearGradient>
  )
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const GLASS_BG = 'rgba(255, 255, 255, 0.12)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.2)'

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  // Liste
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
  },

  // Özet başlık
  summary: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  // Satır
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    marginBottom: 10,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowIconText: {
    fontSize: 20,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  rowSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6ee7b7',
  },

  // Boş durum
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Hata
  errorText: {
    color: '#fca5a5',
    fontSize: 15,
    textAlign: 'center',
  },
})
