import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { ActivityIndicator, Appbar, Button, Card, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useDiagnosticsMetadata } from '@/features/diagnostics/hooks/use-diagnostics-metadata'
import { useRecentSyncErrors } from '@/features/diagnostics/hooks/use-recent-sync-errors'
import { useSyncHealth } from '@/features/diagnostics/hooks/use-sync-health'
import { buildSupportBundle } from '@/features/diagnostics/lib/support-bundle'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'

const MANAGER_ROLES = new Set(['owner', 'manager'])

export default function DiagnosticsScreen() {
  const theme = useAppTheme()
  const t = useT()
  const [copying, setCopying] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const role = useAuthStore((state) => state.role)
  const canViewDiagnostics = role ? MANAGER_ROLES.has(role) : false
  const { data, isPending, isFetching, refetch } = useSyncHealth({ enabled: canViewDiagnostics })
  const { data: metadata, isPending: isMetadataPending } = useDiagnosticsMetadata({
    enabled: canViewDiagnostics,
  })
  const { data: recentErrors = [] } = useRecentSyncErrors({ enabled: canViewDiagnostics })

  const statusColor = !data
    ? theme.colors.onSurfaceVariant
    : data.reviewableRows > 0
      ? theme.tdpos.semantic.red600
      : data.failedRows > 0
        ? theme.tdpos.amber[600]
        : data.unsyncedRows > 0
          ? theme.colors.primary
          : theme.tdpos.semantic.green600

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content title={t('diagnostics.title')} color={theme.colors.onPrimary} />
        {canViewDiagnostics ? (
          <Appbar.Action
            icon="refresh"
            color={theme.colors.onPrimary}
            accessibilityLabel="Refresh diagnostics"
            disabled={isFetching}
            onPress={() => {
              void refetch()
            }}
          />
        ) : null}
      </Appbar.Header>

      {!canViewDiagnostics ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">{t('diagnostics.restricted')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {role ?? 'signed-in user'}
              </Text>
            </Card.Content>
          </Card>
        </View>
      ) : isPending || isMetadataPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Subscription
              </Text>
              <Text variant="bodyMedium">Tier identity, limits, and module entitlements.</Text>
              <Button
                mode="contained-tonal"
                icon="card-account-details-outline"
                onPress={() => router.push('/(app)/subscription')}
              >
                Open subscription
              </Button>
            </Card.Content>
          </Card>

          {metadata ? (
            <Card mode="contained">
              <Card.Content style={{ gap: 12 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('diagnostics.device')}
                </Text>
                <InfoRow label={t('diagnostics.appVersion')} value={metadata.appVersion} />
                <InfoRow
                  label={t('diagnostics.schemaVersion')}
                  value={metadata.schemaVersion?.toString() ?? t('diagnostics.never')}
                />
                <InfoRow label={t('diagnostics.installId')} value={metadata.installId} />
                <InfoRow
                  label={t('diagnostics.branch')}
                  value={metadata.branchCode ?? metadata.branchName ?? t('diagnostics.never')}
                />
                <InfoRow
                  label={t('diagnostics.cashier')}
                  value={metadata.cashierCode ?? t('diagnostics.never')}
                />
                <InfoRow
                  label={t('diagnostics.role')}
                  value={metadata.role ?? t('diagnostics.never')}
                />
                <InfoRow
                  label={t('diagnostics.mmkvSize')}
                  value={formatBytes(metadata.mmkvSizeBytes)}
                />
                <InfoRow
                  label={t('diagnostics.mmkvKeys')}
                  value={metadata.mmkvKeyCount.toString()}
                />
                <InfoRow
                  label={t('diagnostics.diskAvailable')}
                  value={formatOptionalBytes(metadata.availableDiskBytes, t('diagnostics.never'))}
                />
                <InfoRow
                  label={t('diagnostics.diskTotal')}
                  value={formatOptionalBytes(metadata.totalDiskBytes, t('diagnostics.never'))}
                />
                <Button
                  mode="contained-tonal"
                  icon="content-copy"
                  loading={copying}
                  disabled={copying || !data}
                  onPress={() => {
                    if (!data || !metadata) return
                    setCopying(true)
                    const bundle = buildSupportBundle({
                      metadata,
                      health: data,
                      recentErrors,
                      generatedAt: new Date(),
                    })
                    void Clipboard.setStringAsync(bundle)
                      .then((copied) => {
                        setSnackbar(
                          copied
                            ? t('diagnostics.bundleCopied')
                            : t('diagnostics.bundleCopyFailed'),
                        )
                      })
                      .catch(() => {
                        setSnackbar(t('diagnostics.bundleCopyFailed'))
                      })
                      .finally(() => {
                        setCopying(false)
                      })
                  }}
                >
                  {t('diagnostics.copyBundle')}
                </Button>
              </Card.Content>
            </Card>
          ) : null}

          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('diagnostics.queue')}
              </Text>
              <Text
                variant="headlineMedium"
                style={{ color: statusColor, fontVariant: ['tabular-nums'] }}
              >
                {data.unsyncedRows}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('diagnostics.unsynced')} / {data.totalRows}
              </Text>
            </Card.Content>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard label={t('diagnostics.pending')} value={data.pendingRows} />
            <MetricCard label={t('diagnostics.failed')} value={data.failedRows} />
            <MetricCard label={t('diagnostics.reviewable')} value={data.reviewableRows} />
            <MetricCard label={t('diagnostics.maxRetry')} value={data.maxRetryCount} />
          </View>

          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <InfoRow
                label={t('diagnostics.lastSync')}
                value={formatEpochSeconds(data.lastSuccessfulSyncAt, t('diagnostics.never'))}
              />
              <InfoRow
                label={t('diagnostics.oldestPending')}
                value={formatEpochSeconds(data.oldestPendingCreatedAt, t('diagnostics.never'))}
              />
            </Card.Content>
          </Card>

          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('diagnostics.latestError')}
              </Text>
              <Text variant="bodyMedium" selectable>
                {data.latestError ?? t('diagnostics.noError')}
              </Text>
              {data.latestErrorAt ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatEpochSeconds(data.latestErrorAt, t('diagnostics.never'))}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        </ScrollView>
      ) : null}

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  const theme = useAppTheme()

  return (
    <Card mode="contained" style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Card.Content style={{ gap: 4 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="titleLarge" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" selectable style={{ flex: 1, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  )
}

function formatEpochSeconds(value: number | null, fallback: string): string {
  if (!value) return fallback
  return new Date(value * 1000).toLocaleString()
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  const kib = value / 1024
  if (kib < 1024) return `${kib.toFixed(1)} KiB`
  return `${(kib / 1024).toFixed(1)} MiB`
}

function formatOptionalBytes(value: number | null, fallback: string): string {
  return value === null ? fallback : formatBytes(value)
}
