import 'react-native-gesture-handler'
import 'react-native-reanimated'

import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PaperProvider } from 'react-native-paper'

import { darkTheme, lightTheme } from '@/constants/theme'
import { initializeDatabase } from '@/db/init'
import { queryClient } from '@/services/query-client'
import { useAuthStateListener } from '@/services/auth-listener'
import { ModulePrivacyCleanupEffect } from '@/services/module-privacy-effect'
import { recordAppRootMounted } from '@/services/performance-metrics'
import { useBackgroundSyncRegistration } from '@/services/register-sync'
import { storage } from '@/services/storage'
import { SyncTriggerEffect } from '@/services/sync-trigger'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const isSignedIn = useAuthStore((state) => !!state.userId)
  const themeMode = useSettingsStore((state) => state.themeMode)
  useAuthStateListener()
  useBackgroundSyncRegistration()

  useEffect(() => {
    recordAppRootMounted(storage)
  }, [])

  const useDarkTheme = themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark')
  const paperTheme = useDarkTheme ? darkTheme : lightTheme

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="tdpos.db" onInit={initializeDatabase}>
        <QueryClientProvider client={queryClient}>
          <SyncTriggerEffect />
          <ModulePrivacyCleanupEffect />
          <PaperProvider theme={paperTheme}>
            <StatusBar style={useDarkTheme ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={isSignedIn}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
            </Stack>
          </PaperProvider>
        </QueryClientProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  )
}
