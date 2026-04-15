import { ReactNode } from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '@/theme'

interface Props {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Tüm ana ekranların ortak marka gradyanı. Renkleri buradan yönet. */
export function GradientBg({ children, style }: Props) {
  return (
    <LinearGradient colors={colors.brandGradient} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  )
}
