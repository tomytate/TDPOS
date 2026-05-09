import { View } from 'react-native'
import { Appbar, Card, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'

export default function InventoryScreen() {
  const theme = useAppTheme()
  const t = useT()

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title={t('inventory.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>
      <View style={{ gap: 16, padding: 16 }}>
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleLarge">{t('inventory.stockValue')}</Text>
            <Text variant="bodyMedium">
              Inventory UI will read local SQLite products and display stock via canonical pieces.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  )
}
