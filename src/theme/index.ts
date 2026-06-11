export const colors = {
  // Backgrounds
  background: '#FDFAF3',
  surface: '#F5EDD8',
  surfaceElevated: '#EFE3C8',

  // Primary — terracotta (흙길·노을)
  primary: '#C4714A',
  primaryLight: '#D4896A',
  primaryDark: '#A05A38',

  // Secondary — deep green (숲길·이끼)
  secondary: '#3D5A4C',
  secondaryLight: '#4E7262',
  secondaryDark: '#2A3F35',

  // Accent — warm ochre (노란 노을빛)
  accent: '#B5976A',
  accentLight: '#D4BA8A',

  // Text
  textPrimary: '#2C1A0E',
  textSecondary: '#6B4C35',
  textDisabled: '#A89580',
  textInverse: '#FDFAF3',

  // Borders
  border: '#D9C9B0',
  borderLight: '#ECE0CC',

  // Status
  success: '#5B8A6F',
  error: '#A0503A',
  warning: '#B88A40',

  // Tab bar
  tabBarBackground: '#F0E8D6',
  tabBarActiveTint: '#C4714A',
  tabBarInactiveTint: '#A89580',
} as const;

// 부모 세대(50~70대) 기준 — 일반 앱보다 한 단계 큰 폰트
// 일반: 12/14/16/18 → 우리: 14/16/18/20
export const typography = {
  size: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },
  lineHeight: {
    tight: 1.3,
    normal: 1.55,
    relaxed: 1.8,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 터치 타겟 최소 48px (CLAUDE.md 요구사항)
export const touchTarget = {
  min: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#2C1A0E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#2C1A0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;
