/**
 * Sakin mobil tasarım token'ları.
 * Ekranlar bu sabitleri doğrudan import eder — magic string tekrarına son.
 */

export const colors = {
  // Marka gradyanı (açıktan koyuya)
  brandGradient: ['#0D4F3C', '#1A7A5E', '#2BA87E'] as const,

  // Glass yüzeyler
  glassBg: 'rgba(255, 255, 255, 0.12)',
  glassBgStrong: 'rgba(255, 255, 255, 0.18)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.35)',

  // Metin
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.55)',
  textFaint: 'rgba(255, 255, 255, 0.4)',

  // Anlamsal
  success: '#6ee7b7',
  danger: '#fca5a5',
  accent: '#6ee7b7',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const

export const typography = {
  display: { fontSize: 40, fontWeight: '800' as const },
  title: { fontSize: 28, fontWeight: '800' as const },
  heading: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
} as const
