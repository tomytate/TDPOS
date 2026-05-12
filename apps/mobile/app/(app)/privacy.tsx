// Mobile privacy notice scaffold.
// Records a local acknowledgement timestamp so the 0.9 privacy pass can prove
// the notice was surfaced before launch. This is not the final legal copy.

import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'
import { useSettingsStore } from '@/stores/settings-store'

export default function PrivacyScreen() {
  const theme = useAppTheme()
  const t = useT()
  const acceptedAt = useSettingsStore((state) => state.privacyNoticeAcceptedAt)
  const recordAccepted = useSettingsStore((state) => state.recordPrivacyNoticeAccepted)
  const [snackbarVisible, setSnackbarVisible] = useState(false)

  const formattedAcceptedAt = acceptedAt
    ? new Date(acceptedAt).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : t('privacy.notAccepted')

  const acknowledge = () => {
    recordAccepted(new Date().toISOString())
    setSnackbarVisible(true)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content title={t('privacy.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('privacy.status')}
            </Text>
            <Text variant="titleMedium">{formattedAcceptedAt}</Text>
            {acceptedAt ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('privacy.acceptedAt')}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <PrivacyCard title={t('privacy.summaryTitle')} body={t('privacy.summaryBody')} />
        <PrivacyCard title={t('privacy.piiTitle')} body={t('privacy.piiBody')} />
        <PrivacyCard title={t('privacy.supportTitle')} body={t('privacy.supportBody')} />
        <PrivacyCard title={t('privacy.modulesTitle')} body={t('privacy.modulesBody')} />

        <Button mode="contained" icon="check-circle-outline" onPress={acknowledge}>
          {t('privacy.accept')}
        </Button>
      </ScrollView>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)}>
        {t('privacy.accepted')}
      </Snackbar>
    </View>
  )
}

function PrivacyCard({ title, body }: { title: string; body: string }) {
  const theme = useAppTheme()

  return (
    <Card mode="contained">
      <Card.Content style={{ gap: 8 }}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {body}
        </Text>
      </Card.Content>
    </Card>
  )
}
