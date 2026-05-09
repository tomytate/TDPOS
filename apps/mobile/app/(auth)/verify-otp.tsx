import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'

export default function VerifyOtpScreen() {
  const theme = useAppTheme()

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
      <Text variant="headlineMedium">Verify OTP</Text>
      <Text variant="bodyLarge">Enter the 6-digit code sent to your phone.</Text>
      <Button mode="contained-tonal" onPress={() => router.back()}>
        Back
      </Button>
    </View>
  )
}
