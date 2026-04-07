import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { DuesStatus } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useAuthSession } from '@/contexts/auth-context'

interface UnpaidDues {
  id: string
  periodMonth: number
  periodYear: number
  amount: string | number
  status: DuesStatus
  unit: { number: string; site: { name: string } }
}

interface DuesResponse {
  data: UnpaidDues[]
  meta: { total: number }
}

interface CheckoutResponse {
  paymentId: string
  attemptId: string
  token: string
  checkoutFormContent: string
  amount: number
  currency: string
}

const CALLBACK_BASE = 'sakin://payment'

function toNumber(v: string | number): number {
  return typeof v === 'string' ? Number(v) : v
}

export default function PayScreen() {
  const { session } = useAuthSession()
  const [dues, setDues] = useState<UnpaidDues[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [webviewVisible, setWebviewVisible] = useState(false)

  useEffect(() => {
    if (!session) return
    void loadUnpaidDues()
  }, [session])

  async function loadUnpaidDues() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient<DuesResponse>(
        '/dues',
        {
          params: {
            limit: 50,
            status: [DuesStatus.PENDING, DuesStatus.OVERDUE, DuesStatus.PARTIALLY_PAID].join(','),
          },
        },
        session?.tenantId,
      )
      const unpaid = response.data.filter((d) => d.status !== DuesStatus.PAID && d.status !== DuesStatus.CANCELLED && d.status !== DuesStatus.WAIVED)
      setDues(unpaid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function startPayment(duesId: string) {
    setCheckoutLoading(true)
    try {
      const checkout = await apiClient<CheckoutResponse>(
        '/payments/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            duesId,
            callbackUrl: `${CALLBACK_BASE}/callback`,
          }),
        },
        session?.tenantId,
      )
      setCheckoutHtml(checkout.checkoutFormContent)
      setWebviewVisible(true)
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Ödeme başlatılamadı')
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleWebviewNavigation(event: WebViewNavigation) {
    const { url } = event
    if (url.startsWith(CALLBACK_BASE)) {
      setWebviewVisible(false)
      setCheckoutHtml(null)
      const success = url.includes('status=success') || !url.includes('status=failure')
      if (success) {
        Alert.alert('Ödeme Alındı', 'Ödemeniz işleme alındı. Onay için kısa süre bekleyiniz.')
        void loadUnpaidDues()
      } else {
        Alert.alert('Ödeme Başarısız', 'İşlem tamamlanamadı. Tekrar deneyin.')
      }
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ödeme Yap</Text>
          <Text style={styles.subtitle}>Bekleyen aidatlarınızı seçin</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {dues.length === 0 && !error && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Bekleyen ödemeniz yok.</Text>
          </View>
        )}

        {dues.map((item) => {
          const amount = toNumber(item.amount)
          const isOverdue = item.status === DuesStatus.OVERDUE
          return (
            <View key={item.id} style={[styles.card, isOverdue && styles.cardOverdue]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.period}>{item.periodMonth}/{item.periodYear}</Text>
                  <Text style={styles.siteName}>{item.unit.site.name} · Daire {item.unit.number}</Text>
                </View>
                <Text style={[styles.amount, isOverdue && styles.amountOverdue]}>
                  ₺{amount.toLocaleString('tr-TR')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payButton, checkoutLoading && styles.payButtonDisabled]}
                onPress={() => void startPayment(item.id)}
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.payButtonText}>Kartla Öde</Text>
                }
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>

      {/* iyzico checkout WebView */}
      <Modal visible={webviewVisible} animationType="slide" onRequestClose={() => setWebviewVisible(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.webviewHeader}>
            <Text style={styles.webviewTitle}>Güvenli Ödeme</Text>
            <TouchableOpacity onPress={() => { setWebviewVisible(false); setCheckoutHtml(null) }}>
              <Text style={styles.webviewClose}>Kapat</Text>
            </TouchableOpacity>
          </View>
          {checkoutHtml && (
            <WebView
              source={{ html: checkoutHtml }}
              onNavigationStateChange={handleWebviewNavigation}
              javaScriptEnabled
              domStorageEnabled
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  card: { margin: 12, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardOverdue: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  period: { fontSize: 16, fontWeight: '600', color: '#374151' },
  siteName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  amountOverdue: { color: '#ef4444' },
  payButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 14 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 15 },
  webviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  webviewTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  webviewClose: { fontSize: 15, color: '#2563eb' },
})
