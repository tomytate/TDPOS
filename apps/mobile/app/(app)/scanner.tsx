import { router } from 'expo-router'
import { View } from 'react-native'
import { Appbar, Card, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'

export default function ScannerScreen() {
  const theme = useAppTheme()

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Scanner" />
      </Appbar.Header>
      <View style={{ padding: 16 }}>
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleLarge">Scanner unavailable</Text>
            <Text variant="bodyMedium">Use product search from Sale for this session.</Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  )
}
