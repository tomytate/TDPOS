// Mobile privacy notice. Polished for v0.9 visual QA: safe-area-aware
// docked Acknowledge CTA so it never sits behind the home indicator, a
// status hero card that turns teal when the device has been acknowledged,
// haptic-tap on accept, and a more legible retention table with chip
// labels for Module vs Core scope.
//
// Records a local acknowledgement timestamp so the 0.9 privacy pass can
// prove the notice was surfaced before launch. Not the final legal copy.

import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Snackbar, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useSettingsStore } from '@/stores/settings-store'
import { DATA_RETENTION_POLICIES, type DataRetentionPolicy } from '@tdpos/shared'

export default function PrivacyScreen() {
  const theme = useAppTheme()
  const t = useT()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const acceptedAt = useSettingsStore((state) => state.privacyNoticeAcceptedAt)
  const language = useSettingsStore((state) => state.language)
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
    void haptics.success()
    recordAccepted(new Date().toISOString())
    setSnackbarVisible(true)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title={t('privacy.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          gap: 12,
          padding: 16,
          paddingBottom: 112 + insets.bottom,
        }}
      >
        {/* Status hero — teal when acknowledged, neutral when pending */}
        <Card
          mode="contained"
          style={{
            backgroundColor: acceptedAt ? theme.tdpos.teal[50] : theme.colors.surfaceVariant,
          }}
        >
          <Card.Content style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('privacy.status')}
              </Text>
              <Chip
                compact
                mode="flat"
                style={{
                  backgroundColor: acceptedAt ? theme.tdpos.teal[100] : theme.tdpos.amber[100],
                }}
                textStyle={{
                  color: acceptedAt ? theme.tdpos.teal[800] : theme.tdpos.amber[700],
                  fontWeight: '600',
                }}
              >
                {acceptedAt ? 'Acknowledged' : 'Pending'}
              </Chip>
            </View>
            <Text variant="titleMedium">{formattedAcceptedAt}</Text>
            {acceptedAt ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('privacy.acceptedAt')}
              </Text>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tap “{t('privacy.accept')}” after reading the cards below.
              </Text>
            )}
          </Card.Content>
        </Card>

        <PrivacyCard title={t('privacy.summaryTitle')} body={t('privacy.summaryBody')} />
        <PrivacyCard title={t('privacy.piiTitle')} body={t('privacy.piiBody')} />
        <PrivacyCard title={t('privacy.supportTitle')} body={t('privacy.supportBody')} />
        <PrivacyCard title={t('privacy.modulesTitle')} body={t('privacy.modulesBody')} />

        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <View style={{ gap: 4 }}>
              <Text variant="titleMedium">{t('privacy.retentionTitle')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('privacy.retentionBody')}
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {DATA_RETENTION_POLICIES.map((policy) => (
                <RetentionPolicyRow key={policy.id} policy={policy} language={language} />
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Surface
        mode="elevated"
        elevation={4}
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          mode="contained"
          icon={acceptedAt ? 'refresh' : 'check-circle-outline'}
          buttonColor={theme.colors.primary}
          onPress={acknowledge}
          accessibilityLabel={t('privacy.accept')}
          accessibilityHint="Stores a local timestamp on this device only"
        >
          {acceptedAt ? 'Re-acknowledge notice' : t('privacy.accept')}
        </Button>
      </Surface>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {t('privacy.accepted')}
      </Snackbar>
    </View>
  )
}

function RetentionPolicyRow({
  policy,
  language,
}: {
  policy: DataRetentionPolicy
  language: 'en' | 'tl'
}) {
  const theme = useAppTheme()
  const t = useT()
  const isTagalog = language === 'tl'
  const isModule = policy.module !== undefined

  return (
    <View
      style={{
        borderColor: theme.colors.outline,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        <Text variant="labelLarge" style={{ flex: 1 }}>
          {isTagalog ? policy.piiSurfaceTl : policy.piiSurface}
        </Text>
        <Chip
          compact
          mode="flat"
          style={{
            backgroundColor: isModule ? theme.tdpos.amber[50] : theme.tdpos.teal[50],
          }}
          textStyle={{
            color: isModule ? theme.tdpos.amber[700] : theme.tdpos.teal[800],
            fontWeight: '600',
            textTransform: 'uppercase',
          }}
        >
          {policy.module ?? t('privacy.retentionCore')}
        </Chip>
      </View>
      <RetentionLine
        label={t('privacy.retentionLocal')}
        value={isTagalog ? policy.localRetentionTl : policy.localRetention}
      />
      <RetentionLine
        label={t('privacy.retentionServer')}
        value={isTagalog ? policy.serverRetentionTl : policy.serverRetention}
      />
      <RetentionLine
        label={t('privacy.retentionCleanup')}
        value={isTagalog ? policy.disabledModuleCleanupTl : policy.disabledModuleCleanup}
      />
    </View>
  )
}

function RetentionLine({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()

  return (
    <View style={{ gap: 2 }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {value}
      </Text>
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
