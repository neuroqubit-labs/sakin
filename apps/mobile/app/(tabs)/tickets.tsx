import { View, Text, StyleSheet } from 'react-native'

export default function TicketsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Talepler</Text>
      <Text style={styles.subtitle}>Talep yönetimi Faz 2'de eklenecek</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },
})
