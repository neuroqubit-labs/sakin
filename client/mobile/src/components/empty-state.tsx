import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { PrimaryButton } from './primary-button'
import { colors, spacing } from '@/theme'

interface CtaConfig {
  label: string
  onPress: () => void
}

interface Props {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body?: string
  primary?: CtaConfig
  secondary?: CtaConfig
  style?: StyleProp<ViewStyle>
}

export function EmptyState({ icon, title, body, primary, secondary, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons color={colors.brand} name={icon} size={28} />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {primary ? (
        <PrimaryButton label={primary.label} onPress={primary.onPress} style={styles.primary} />
      ) : null}
      {secondary ? (
        <Pressable onPress={secondary.onPress} style={styles.secondary}>
          <Text style={styles.secondaryText}>{secondary.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  body: {
    fontSize: 13,
    color: colors.inkSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  primary: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  secondary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
})
