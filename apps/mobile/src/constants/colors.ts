export const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
} as const

export const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
} as const

export const ink = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
} as const

export const semantic = {
  green500: '#22c55e',
  green600: '#16a34a',
  red500: '#ef4444',
  red600: '#dc2626',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  gcash: '#0066cc',
} as const

export const categoryBg = {
  sachet: '#fef3c7',
  noodle: '#fde68a',
  biscuit: '#fed7aa',
  drink: '#ccfbf1',
  tobacco: '#e7e5e4',
  load: '#dbeafe',
  dairy: '#f0fdfa',
  bakery: '#fef9c3',
  rice: '#f5f5f4',
} as const

export type CategoryKey = keyof typeof categoryBg
