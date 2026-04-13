import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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
    } catch {
      Alert.alert('Hata', 'Yanlış kod. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#0D4F3C', '#1A7A5E', '#2BA87E']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Marka */}
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>SAKİN</Text>
          <Text style={styles.brandSub}>Bina Yönetim Uygulaması</Text>
        </View>

        {/* Glass form kartı */}
        <View style={styles.card}>
          {!confirm ? (
            <>
              <Text style={styles.cardTitle}>Giriş Yap</Text>
              <Text style={styles.cardSub}>Telefon numaranıza SMS kodu gönderilecek</Text>
              <TextInput
                style={styles.input}
                placeholder="+90 555 123 4567"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => void sendCode()}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Gönderiliyor…' : 'SMS Kodu Gönder'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Kodu Girin</Text>
              <Text style={styles.cardSub}>
                {phoneNumber} numarasına gönderilen 6 haneli kodu girin
              </Text>
              <TextInput
                style={[styles.input, styles.inputCode]}
                placeholder="— — — — — —"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => void verifyCode()}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Doğrulanıyor…' : 'Doğrula ve Giriş Yap'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => { setConfirm(null); setCode('') }}
              >
                <Text style={styles.backButtonText}>← Farklı numara kullan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Marka
  brandWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
  },
  brandSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Glass kart
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
    lineHeight: 18,
  },

  // Input
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 16,
  },
  inputCode: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 10,
  },

  // Buton
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Geri
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
})
