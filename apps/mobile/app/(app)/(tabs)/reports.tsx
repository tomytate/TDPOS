import { router } from 'expo-router'
import { View } from 'react-native'
import { Appbar, Card, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'

const MANAGER_ROLES = new Set(['owner', 'manager'])

export default function ReportsScreen() {
  const theme = useAppTheme()
  const t = useT()
  const role = useAuthStore((state) => state.role)
  const canOpenDiagnostics = role ? MANAGER_ROLES.has(role) : false

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.tdpos.ink[800] }}>
        <Appbar.Content title={t('eod.title')} color="#ffffff" />
        {canOpenDiagnostics ? (
          <Appbar.Action
            icon="cog-outline"
            color="#ffffff"
            accessibilityLabel={t('diagnostics.title')}
            onPress={() => router.push('/(app)/diagnostics')}
          />
        ) : null}
      </Appbar.Header>
      <View style={{ gap: 16, padding: 16 }}>
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleLarge">{t('eod.grossSales')}</Text>
            <Text variant="bodyMedium">
              End-of-day totals will aggregate local immutable sales, so reports still work offline.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  )
}
