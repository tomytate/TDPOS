import { MD3DarkTheme, MD3LightTheme, configureFonts, useTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

import { amber, ink, semantic, teal } from './colors'

type BrandTokens = {
  teal: typeof teal
  amber: typeof amber
  ink: typeof ink
  semantic: typeof semantic
}

export type AppTheme = MD3Theme & {
  tdpos: BrandTokens
}

const fontConfig = {
  default: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
  titleLarge: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
  labelLarge: {
    fontFamily: 'System',
    fontWeight: '600' as const,
  },
} as const

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  version: 3,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: teal[700],
    onPrimary: '#ffffff',
    primaryContainer: teal[800],
    onPrimaryContainer: '#ffffff',
    secondary: semantic.green500,
    onSecondary: '#ffffff',
    secondaryContainer: semantic.green600,
    onSecondaryContainer: '#ffffff',
    tertiary: amber[500],
    onTertiary: ink[900],
    tertiaryContainer: amber[300],
    onTertiaryContainer: ink[900],
    error: semantic.red500,
    background: ink[50],
    surface: '#ffffff',
    surfaceVariant: ink[100],
    onSurface: ink[900],
    onSurfaceVariant: ink[500],
    outline: ink[300],
  },
  tdpos: {
    teal,
    amber,
    ink,
    semantic,
  },
}

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  version: 3,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: teal[300],
    onPrimary: teal[900],
    primaryContainer: teal[800],
    onPrimaryContainer: teal[50],
    secondary: '#86efac',
    onSecondary: ink[900],
    secondaryContainer: semantic.green600,
    onSecondaryContainer: '#ffffff',
    tertiary: amber[400],
    onTertiary: ink[900],
    tertiaryContainer: amber[600],
    onTertiaryContainer: '#ffffff',
    error: semantic.red500,
    background: ink[900],
    surface: ink[800],
    surfaceVariant: ink[700],
    onSurface: ink[100],
    onSurfaceVariant: ink[300],
    outline: ink[600],
  },
  tdpos: {
    teal,
    amber,
    ink,
    semantic,
  },
}

export const useAppTheme = () => useTheme<AppTheme>()
