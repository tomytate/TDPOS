---
name: react-native-paper-theming
description: Use this skill when working on UI components, theming, colors, typography, or design system. Agents commonly hallucinate React Native Paper v4 (MD2) patterns. TD POS uses v5 with Material Design 3 tokens.
version: 1.0.0
---

# React Native Paper 5 — MD3 Theming

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate `DefaultTheme`, `Colors`, or `Theme` from Paper v4 (MD2). Paper v5 uses **Material Design 3** with entirely different color tokens and typography variants.

## TD POS Custom Theme

```typescript
// src/constants/theme.ts
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

const fontConfig = {
  default: {
    fontFamily: 'Inter-Regular',
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700' as const,
  },
  titleLarge: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600' as const,
  },
  labelLarge: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500' as const,
  },
} as const

// TD POS brand colors using MD3 token structure
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  version: 3,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0f766e', // Teal — Suki POS primary
    onPrimary: '#FFFFFF',
    primaryContainer: '#115e59',
    onPrimaryContainer: '#FFFFFF',
    secondary: '#22c55e', // Green — success/cash
    onSecondary: '#FFFFFF',
    secondaryContainer: '#16a34a',
    onSecondaryContainer: '#FFFFFF',
    tertiary: '#f59e0b', // Amber — primary sale action
    onTertiary: '#1c1917',
    tertiaryContainer: '#fcd34d',
    onTertiaryContainer: '#1c1917',
    error: '#ef4444',
    background: '#fafaf9',
    surface: '#FFFFFF',
    surfaceVariant: '#f5f5f4',
    onSurface: '#1c1917',
    onSurfaceVariant: '#78716c',
    outline: '#d6d3d1',
  },
}

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  version: 3,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#5eead4',
    onPrimary: '#134e4a',
    primaryContainer: '#115e59',
    onPrimaryContainer: '#f0fdfa',
    secondary: '#86efac',
    onSecondary: '#1c1917',
    tertiary: '#fbbf24',
    onTertiary: '#1c1917',
    background: '#1c1917',
    surface: '#292524',
    onSurface: '#f5f5f4',
  },
}

// Type-safe theme hook
import { useTheme } from 'react-native-paper'
export type AppTheme = typeof lightTheme
export const useAppTheme = () => useTheme<AppTheme>()
```

## Provider Setup

```tsx
// In _layout.tsx
import { PaperProvider } from 'react-native-paper'
import { lightTheme } from '@/constants/theme'
;<PaperProvider theme={lightTheme}>{children}</PaperProvider>
```

## MD3 Color Tokens (What Changed)

| MD2 (v4) ❌          | MD3 (v5) ✅                                   |
| -------------------- | --------------------------------------------- |
| `colors.accent`      | `colors.secondary` or `colors.tertiary`       |
| `colors.surface`     | `colors.surface` (same name, different token) |
| `colors.text`        | `colors.onSurface`                            |
| `colors.disabled`    | `colors.surfaceDisabled`                      |
| `colors.placeholder` | `colors.onSurfaceVariant`                     |
| `colors.backdrop`    | `colors.backdrop`                             |

## MD3 Typography Variants

| Variant                      | Use for                    |
| ---------------------------- | -------------------------- |
| `displayLarge/Medium/Small`  | Hero numbers (₱ totals)    |
| `headlineLarge/Medium/Small` | Screen titles              |
| `titleLarge/Medium/Small`    | Section headers            |
| `bodyLarge/Medium/Small`     | Content text               |
| `labelLarge/Medium/Small`    | Button labels, form labels |

## ❌ DO NOT USE

```tsx
// ❌ Paper v4 (MD2) patterns
import { DefaultTheme, DarkTheme } from 'react-native-paper'
theme.colors.accent
theme.fonts.regular

// ❌ NativeBase, Gluestack, Tamagui
import { NativeBaseProvider } from 'native-base'

// ✅ Paper v5 (MD3)
import { MD3LightTheme, PaperProvider, configureFonts } from 'react-native-paper'
theme.colors.secondary
theme.colors.tertiary
theme.fonts.bodyMedium
```

## Sources

- Package: `react-native-paper@^5.15.1` (verified against `apps/mobile/package.json`)
- Official docs: <https://callstack.github.io/react-native-paper/>
- MD3 theme reference: <https://callstack.github.io/react-native-paper/docs/guides/theming>
- Material Design 3 spec: <https://m3.material.io/styles/color/system/overview>
- Migration v4 → v5: <https://callstack.github.io/react-native-paper/docs/guides/migration-from-v4>
- Implementation: `apps/mobile/src/constants/colors.ts`, `apps/mobile/src/constants/theme.ts` (`lightTheme`, `darkTheme`, `useAppTheme`)
- Last verified: 2026-05-09
