import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '@/theme'

type MetricTone = 'default' | 'onBrand'

interface Props {
  label: string
  value: string
  tone?: MetricTone
}

export function MetricPill({ label, value, tone = 'default' }: Props) {
  const container = tone === 'onBrand' ? styles.containerOnBrand : styles.container
  const valueStyle = tone === 'onBrand' ? styles.valueOnBrand : styles.value
  const labelStyle = tone === 'onBrand' ? styles.labelOnBrand : styles.label
  return (
    <View style={[styles.base, container]}>
      <Text style={valueStyle}>{value}</Text>
      <Text style={labelStyle}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  container: {
    backgroundColor: colors.surfaceElevated,
  },
  containerOnBrand: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  valueOnBrand: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelOnBrand: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
})
