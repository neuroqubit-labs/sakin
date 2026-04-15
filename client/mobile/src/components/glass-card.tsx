import { ReactNode } from 'react'
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native'
import { colors, radii, spacing } from '@/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** `lg` default 16px padding — `xl` büyük kartlar için 24px. */
  padding?: keyof typeof spacing
}

/** Glassmorphism yüzey — liste satırı, özet kart, modal içeriği için ortak. */
export function GlassCard({ children, style, padding = 'lg' }: Props) {
  return <View style={[styles.base, { padding: spacing[padding] }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
})
