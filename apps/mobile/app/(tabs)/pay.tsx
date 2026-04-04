import { View, Text, StyleSheet } from 'react-native'

export default function PayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ödeme Yap</Text>
      <Text style={styles.subtitle}>iyzico ödeme entegrasyonu yakında</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },
})
