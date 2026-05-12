import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkout" options={{ presentation: 'card' }} />
      <Stack.Screen name="receipt" options={{ presentation: 'card' }} />
      <Stack.Screen name="scanner" options={{ presentation: 'modal' }} />
      <Stack.Screen name="diagnostics" options={{ presentation: 'card' }} />
      <Stack.Screen name="privacy" options={{ presentation: 'card' }} />
      <Stack.Screen name="subscription" options={{ presentation: 'card' }} />
      <Stack.Screen name="upgrade" options={{ presentation: 'card' }} />
      <Stack.Screen name="surfaces/[surface]" options={{ presentation: 'card' }} />
    </Stack>
  )
}
