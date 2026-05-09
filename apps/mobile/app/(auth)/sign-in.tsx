import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useAuthStore } from '@/stores/auth-store'

export default function SignInScreen() {
  const theme = useAppTheme()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setDevice = useAuthStore((state) => state.setDevice)

  const continueInDemoMode = () => {
    setAuth({
      userId: 'demo-user',
      businessId: 'demo-business',
      role: 'owner',
      phone: '+639171234567',
    })
    setDevice({
      branchId: 'demo-branch',
      branchCode: 'QC01',
      branchName: 'Demo branch',
      cashierCode: 'C01',
      storeName: 'TD POS Demo Store',
      storeAddress: 'Quezon City',
    })
    router.replace('/(app)/(tabs)')
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      {__DEV__ ? (
        <Surface
          mode="flat"
          style={{
            padding: 12,
            backgroundColor: theme.tdpos.amber[100],
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text variant="labelLarge" style={{ color: theme.tdpos.ink[900] }}>
            DEMO MODE
          </Text>
          <Text variant="bodySmall" style={{ color: theme.tdpos.ink[800] }}>
            Local-only data. Do not use for real sales. Production builds replace this with phone
            OTP — see roadmap P7.1.
          </Text>
        </Surface>
      ) : null}

      <Text variant="headlineMedium">TD POS</Text>
      <Text variant="bodyLarge">Tama ang stock mo. Lagi.</Text>

      {__DEV__ ? (
        <Button mode="contained" onPress={continueInDemoMode}>
          Continue in demo mode
        </Button>
      ) : (
        <Button mode="contained" disabled>
          Sign in with phone (P7.1 — coming soon)
        </Button>
      )}
    </View>
  )
}
