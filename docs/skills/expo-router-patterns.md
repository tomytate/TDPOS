---
name: expo-router-patterns
description: Use this skill when working on navigation, routing, screen layouts, tabs, protected routes, or deep linking. Agents commonly hallucinate React Navigation v5/v6 patterns — Expo Router uses FILE-BASED routing with completely different APIs.
version: 1.0.0
---

# Expo Router — File-Based Routing (SDK 55)

## ⚠️ COMMON HALLUCINATION WARNING

Agents trained on older data will generate `createStackNavigator()`, `NavigationContainer`, or `useNavigation().navigate()`. **NONE of these are used in Expo Router.** Routing is entirely file-based.

## Core Rules

- Every `.tsx` file in `app/` directory = a route
- `_layout.tsx` = defines navigation structure (Stack, Tabs, Drawer) for sibling routes
- `(parentheses)/` = route groups — organize without affecting URL path
- `[brackets].tsx` = dynamic routes (params)
- `+not-found.tsx` = 404 handler

## Project Route Structure

```
app/
├── _layout.tsx                # Root layout (providers: SQLiteProvider, PaperProvider, AuthProvider)
├── index.tsx                  # Entry — redirects to (auth) or (app)
├── (auth)/                    # Public auth routes
│   ├── _layout.tsx            # Stack for auth screens
│   ├── sign-in.tsx            # Phone OTP entry
│   └── verify-otp.tsx         # OTP verification
└── (app)/                     # Protected routes
    ├── _layout.tsx            # Uses Stack.Protected for auth guard
    └── (tabs)/                # Bottom tab navigation
        ├── _layout.tsx        # Tabs navigator
        ├── index.tsx          # Home / Quick Sale
        ├── products.tsx       # Product catalog
        ├── inventory.tsx      # Inventory management
        └── reports.tsx        # End-of-day reports
```

## Protected Routes Pattern (SDK 55)

`Stack.Protected` does NOT have a `fallback` prop. Instead, use dual guards — when a guard is `false`, those routes become inaccessible and the router falls back to the remaining accessible routes automatically.

```tsx
// app/_layout.tsx (root — dual guard pattern)
import { Stack } from 'expo-router'
import { useAuth } from '@/hooks/use-auth'

export default function RootLayout() {
  const { user } = useAuth()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens: visible only when NOT logged in */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* App screens: visible only when logged in */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  )
}
```

## Tab Layout Pattern

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function TabLayout() {
  const theme = useTheme()

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: theme.colors.primary,
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sale',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Stock' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  )
}
```

## Root Layout (Provider Stack)

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { PaperProvider } from 'react-native-paper'
import { QueryClientProvider } from '@tanstack/react-query'
import { theme } from '@/constants/theme'
import { queryClient } from '@/services/query-client'
import { initializeDatabase } from '@/db/provider'

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="tdpos.db" onInit={initializeDatabase}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </QueryClientProvider>
    </SQLiteProvider>
  )
}
```

## ❌ DO NOT USE (Legacy Patterns)

```tsx
// ❌ WRONG — React Navigation v5/v6 patterns
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
const Stack = createStackNavigator()
navigation.navigate('Home')

// ✅ CORRECT — Expo Router
import { Stack, Tabs, router } from 'expo-router'
router.push('/products')
router.replace('/(auth)/sign-in')
```

## Sources

- Package: `expo-router@^55.0.0` (verified against `apps/mobile/package.json`)
- Official docs: <https://docs.expo.dev/router/introduction/>
- `Stack.Protected` reference: <https://docs.expo.dev/router/reference/protected-routes/>
- Tabs reference: <https://docs.expo.dev/router/advanced/tabs/>
- Implementation: `apps/mobile/app/_layout.tsx` (root with dual `Stack.Protected`), `apps/mobile/app/(app)/(tabs)/_layout.tsx`, `apps/mobile/app/(auth)/_layout.tsx`
- Last verified: 2026-05-09
