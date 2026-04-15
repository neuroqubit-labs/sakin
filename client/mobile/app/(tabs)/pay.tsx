import { useState } from 'react'
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
import { useUnpaidDues, type DuesItem } from '@/features/dues/queries'
import { useStartPayment } from '@/features/payment/queries'
import { parseCallbackStatus } from '@/features/payment/callback'

const CALLBACK_BASE = 'sakin://payment'

function toNumber(v: string | number): number {
  return typeof v === 'string' ? Number(v) : v
}

export default function PayScreen() {
  const duesQuery = useUnpaidDues()
  const startPayment = useStartPayment()

  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null)
  const [webviewVisible, setWebviewVisible] = useState(false)
  const [callbackHandled, setCallbackHandled] = useState(false)

  const loading = duesQuery.isLoading
  const error = duesQuery.error ? (duesQuery.error as Error).message : null
  const dues: DuesItem[] = (duesQuery.data?.data ?? []).filter(
    (d) =>
      d.status !== DuesStatus.PAID &&
      d.status !== DuesStatus.CANCELLED &&
      d.status !== DuesStatus.WAIVED,
  )

  async function onStart(duesId: string) {
    setCallbackHandled(false)
    try {
      const checkout = await startPayment.mutateAsync({
        duesId,
        callbackUrl: `${CALLBACK_BASE}/callback`,
      })
      setCheckoutHtml(checkout.checkoutFormContent)
      setWebviewVisible(true)
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Ödeme başlatılamadı')
    }
  }

  function handleWebviewNavigation(event: WebViewNavigation) {
    const { url } = event
    if (!url.startsWith(CALLBACK_BASE)) return
    if (callbackHandled) return
    setCallbackHandled(true)
    setWebviewVisible(false)
    setCheckoutHtml(null)

    const status = parseCallbackStatus(url)
    if (status === 'success') {
      Alert.alert('Ödeme Alındı', 'Ödemeniz işleme alındı. Onay için kısa süre bekleyiniz.')
      void duesQuery.refetch()
    } else if (status === 'failure') {
      Alert.alert('Ödeme Başarısız', 'İşlem tamamlanamadı. Tekrar deneyin.')
    } else {
      Alert.alert(
        'Ödeme Durumu Belirsiz',
        'İşleminizin sonucu doğrulanıyor. Borç listeniz birazdan güncellenir.',
      )
      void duesQuery.refetch()
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
                  <Text style={styles.period}>
                    {item.periodMonth}/{item.periodYear}
                  </Text>
                  <Text style={styles.siteName}>
                    {item.unit.site.name} · Daire {item.unit.number}
                  </Text>
                </View>
                <Text style={[styles.amount, isOverdue && styles.amountOverdue]}>
                  ₺{amount.toLocaleString('tr-TR')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payButton, startPayment.isPending && styles.payButtonDisabled]}
                onPress={() => void onStart(item.id)}
                disabled={startPayment.isPending}
              >
                {startPayment.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payButtonText}>Kartla Öde</Text>
                )}
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>

      <Modal
        visible={webviewVisible}
        animationType="slide"
        onRequestClose={() => setWebviewVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.webviewHeader}>
            <Text style={styles.webviewTitle}>Güvenli Ödeme</Text>
            <TouchableOpacity
              onPress={() => {
                setWebviewVisible(false)
                setCheckoutHtml(null)
              }}
            >
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
  card: {
    margin: 12,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
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
  webviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  webviewTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  webviewClose: { fontSize: 15, color: '#2563eb' },
})
