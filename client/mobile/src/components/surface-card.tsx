import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { colors, radii, spacing } from '@/theme'

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  padding?: keyof typeof spacing
  tone?: 'default' | 'tinted' | 'danger'
}

export function SurfaceCard({
  children,
  style,
  padding = 'xl',
  tone = 'default',
}: Props) {
  return (
    <View style={[styles.base, toneStyles[tone], { padding: spacing[padding] }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    borderWidth: 1,
    shadowColor: '#101814',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
})

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.line,
  },
  tinted: {
    backgroundColor: colors.surfaceTint,
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.lineStrong,
  },
})
