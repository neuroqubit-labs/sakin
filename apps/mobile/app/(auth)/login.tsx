import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendCode() {
    if (!phoneNumber.trim()) return
    setLoading(true)
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber)
      setConfirm(confirmation)
    } catch {
      Alert.alert('Hata', 'SMS gönderilemedi. Numarayı kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (!confirm || !code.trim()) return
    setLoading(true)
    try {
      await confirm.confirm(code)
      // Başarıyla giriş — _layout.tsx auth state değişimini yakalar
    } catch {
      Alert.alert('Hata', 'Yanlış kod. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sakin</Text>
      <Text style={styles.subtitle}>Bina Yönetim Uygulaması</Text>

      {!confirm ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="+90 555 123 4567"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.info}>SMS kodu giriniz</Text>
          <TextInput
            style={styles.input}
            placeholder="6 haneli kod"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Doğrulanıyor...' : 'Doğrula'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 40 },
  info: { fontSize: 16, color: '#374151', marginBottom: 16 },
  input: { width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  button: { width: '100%', backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
