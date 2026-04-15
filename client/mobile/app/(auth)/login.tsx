import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PrimaryButton, SurfaceCard } from '@/components'
import { useAuthSession } from '@/contexts/auth-context'
import { DEV_BYPASS_ENABLED } from '@/lib/env'
import { getFirebaseAuth, isFirebaseNativeAvailable } from '@/lib/firebase-auth'
import { getDevBootstrap, setDevResidentId } from '@/lib/api'
import { colors, radii, spacing, typography } from '@/theme'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const showDevBypass = DEV_BYPASS_ENABLED
  const { setSession } = useAuthSession()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState<{ confirm: (code: string) => Promise<unknown> } | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function sendCode() {
    if (!phoneNumber.trim()) return
    const auth = getFirebaseAuth()
    if (!auth || !isFirebaseNativeAvailable()) {
      setFeedback('Expo Go ile native Firebase çalışmaz. Development build ile devam edin.')
      return
    }
    setLoading(true)
    setFeedback(null)
    try {
      const confirmation = await auth.signInWithPhoneNumber(phoneNumber)
      setConfirm(confirmation)
    } catch {
      setFeedback('SMS gönderilemedi. Telefon numarasını kontrol edip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (!confirm || !code.trim()) return
    setLoading(true)
    setFeedback(null)
    try {
      await confirm.confirm(code)
    } catch {
      setFeedback('Kod doğrulanamadı. Gelen 6 haneli kodu tekrar kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  async function signInWithDevBypass(asResident = false) {
    setLoading(true)
    setFeedback(null)
    try {
      const bootstrap = await getDevBootstrap()
      if (!bootstrap.ready || !bootstrap.tenantId) {
        setFeedback(bootstrap.message ?? 'Test tenant bulunamadı.')
        return
      }

      if (asResident) {
        if (!bootstrap.devResident) {
          setFeedback('Veritabanında aktif sakin bulunamadı. Önce seed çalıştırın.')
          return
        }
        setDevResidentId(bootstrap.devResident.residentId)
        setSession({
          userId: `dev-resident-${bootstrap.devResident.residentId}`,
          tenantId: bootstrap.tenantId,
          role: 'RESIDENT',
          residentId: bootstrap.devResident.residentId,
        })
      } else {
        setDevResidentId(null)
        setSession({
          userId: 'dev-user',
          tenantId: bootstrap.tenantId,
          role: 'TENANT_ADMIN',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dev giriş başarısız.'
      setFeedback(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 12}
        style={[
          styles.inner,
          {
            paddingTop: Math.max(insets.top + 12, spacing.xl),
            paddingBottom: Math.max(insets.bottom + 20, spacing.xxxl),
          },
        ]}
      >
        <LinearGradient
          colors={[colors.brandDeep, colors.brand, colors.brandAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>Sakin</Text>
          <Text style={styles.heroTitle}>Bina ile ilgili kritik işlerini daha sakin bir ritimle yönet.</Text>
          <Text style={styles.heroSub}>
            Giriş yaptığında borçlar, ödemeler ve süreçler seni tek karar merkezinde karşılayacak.
          </Text>
        </LinearGradient>

        <SurfaceCard style={styles.card}>
          {!confirm ? (
            <>
              <Text style={styles.cardTitle}>Giriş Yap</Text>
              <Text style={styles.cardSub}>Telefon numarana tek kullanımlık kod göndereceğiz.</Text>
              <TextInput
                style={styles.input}
                placeholder="+90 555 123 4567"
                placeholderTextColor={colors.inkMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
              <PrimaryButton
                label={loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
                onPress={() => void sendCode()}
                disabled={loading}
              />
              {showDevBypass ? (
                <>
                  <Pressable
                    style={[styles.devButton, loading && styles.buttonDisabled]}
                    onPress={() => void signInWithDevBypass(false)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.brand} />
                    ) : (
                      <Text style={styles.devButtonText}>Yonetici olarak test girisi</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.devButton, styles.devButtonResident, loading && styles.buttonDisabled]}
                    onPress={() => void signInWithDevBypass(true)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.brand} />
                    ) : (
                      <Text style={styles.devButtonText}>Sakin olarak test girisi</Text>
                    )}
                  </Pressable>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Kodu Girin</Text>
              <Text style={styles.cardSub}>
                {phoneNumber} numarasına gönderilen 6 haneli kodu yaz.
              </Text>
              <TextInput
                style={[styles.input, styles.inputCode]}
                placeholder="— — — — — —"
                placeholderTextColor={colors.inkMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
              <PrimaryButton
                label={loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
                onPress={() => void verifyCode()}
                disabled={loading}
              />
              <Pressable
                style={styles.backButton}
                onPress={() => {
                  setConfirm(null)
                  setCode('')
                }}
              >
                <Text style={styles.backButtonText}>Farklı numara kullan</Text>
              </Pressable>
            </>
          )}
        </SurfaceCard>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 30,
    shadowColor: '#0f1d16',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 6,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    marginTop: spacing.md,
  },
  card: {},
  cardTitle: {
    ...typography.heading,
    color: colors.ink,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: colors.inkSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 16,
  },
  inputCode: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 10,
  },
  feedbackText: {
    marginBottom: spacing.md,
    color: colors.dangerInk,
    fontSize: 13,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  devButton: {
    marginTop: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceTint,
  },
  devButtonResident: {
    marginTop: spacing.sm,
  },
  devButtonText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.brand,
    fontWeight: '600',
  },
})
