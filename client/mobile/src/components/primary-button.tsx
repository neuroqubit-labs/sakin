import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native'
import { colors, radii, spacing } from '@/theme'

interface Props {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
  style?: StyleProp<ViewStyle>
}

/** Login + ödeme + talep ekranlarının ortak CTA düğmesi. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: Props) {
  const isDisabled = disabled || loading
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'secondary' && styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glassBgStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderColor: colors.glassBorder,
    paddingVertical: spacing.md,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
