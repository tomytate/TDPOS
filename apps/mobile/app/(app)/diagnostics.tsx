// Manager-facing diagnostics screen. Polished for v0.9 visual QA:
// safe-area-aware ScrollView padding, skeleton loading state, a tone-aware
// sync queue hero card, grouped metric tiles, a Quick links section pinning
// Subscription + Privacy at the top so managers reach them without scrolling
// past the queue numbers, and haptic taps on the support-bundle copy.

import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useDiagnosticsMetadata } from '@/features/diagnostics/hooks/use-diagnostics-metadata'
import { useRecentSyncErrors } from '@/features/diagnostics/hooks/use-recent-sync-errors'
import { useSyncHealth } from '@/features/diagnostics/hooks/use-sync-health'
import { buildSupportBundle } from '@/features/diagnostics/lib/support-bundle'
import { buildLocalDataExport } from '@/features/diagnostics/lib/local-data-export'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'

const MANAGER_ROLES = new Set(['owner', 'manager'])

type QueueTone = 'ok' | 'info' | 'warn' | 'danger'

function getQueueTone(data: ReturnType<typeof useSyncHealth>['data']): QueueTone {
  if (!data) return 'info'
  if (data.reviewableRows > 0) return 'danger'
  if (data.failedRows > 0) return 'warn'
  if (data.unsyncedRows > 0) return 'info'
  return 'ok'
}

export default function DiagnosticsScreen() {
  const theme = useAppTheme()
  const t = useT()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const db = useSQLiteContext()
  const [copying, setCopying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const role = useAuthStore((state) => state.role)
  const canViewDiagnostics = role ? MANAGER_ROLES.has(role) : false
  const { data, isPending, isFetching, refetch } = useSyncHealth({ enabled: canViewDiagnostics })
  const { data: metadata, isPending: isMetadataPending } = useDiagnosticsMetadata({
    enabled: canViewDiagnostics,
  })
  const { data: recentErrors = [] } = useRecentSyncErrors({ enabled: canViewDiagnostics })

  const tone = getQueueTone(data)
  const toneColor = {
    ok: theme.tdpos.semantic.green600,
    info: theme.colors.primary,
    warn: theme.tdpos.amber[600],
    danger: theme.tdpos.semantic.red600,
  }[tone]
  const toneBg = {
    ok: theme.tdpos.teal[50],
    info: theme.tdpos.teal[50],
    warn: theme.tdpos.amber[50],
    danger: theme.colors.errorContainer,
  }[tone]
  const toneLabel = {
    ok: 'All caught up',
    info: 'Syncing',
    warn: 'Retrying',
    danger: 'Needs review',
  }[tone]

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title={t('diagnostics.title')} color={theme.colors.onPrimary} />
        {canViewDiagnostics ? (
          <Appbar.Action
            icon="refresh"
            color={theme.colors.onPrimary}
            accessibilityLabel="Refresh diagnostics"
            disabled={isFetching}
            onPress={() => {
              void haptics.tapLight()
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
                Signed in as {role ?? 'signed-in user'}. Ask the business owner or manager to review
                diagnostics.
              </Text>
            </Card.Content>
          </Card>
        </View>
      ) : isPending || isMetadataPending ? (
        <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
          <DiagnosticsSkeleton />
        </ScrollView>
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 + insets.bottom }}
        >
          {/* Quick links — top of the screen so managers reach them without scrolling */}
          <Card mode="contained">
            <Card.Content style={{ gap: 10 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Quick links
              </Text>
              <Button
                mode="contained-tonal"
                icon="card-account-details-outline"
                contentStyle={{ justifyContent: 'flex-start' }}
                onPress={() => {
                  void haptics.tapLight()
                  router.push('/(app)/subscription')
                }}
                accessibilityLabel="Open subscription"
              >
                Subscription — tier, limits, modules
              </Button>
              <Button
                mode="contained-tonal"
                icon="shield-account-outline"
                contentStyle={{ justifyContent: 'flex-start' }}
                onPress={() => {
                  void haptics.tapLight()
                  router.push('/(app)/privacy')
                }}
                accessibilityLabel={t('diagnostics.privacy')}
              >
                {t('diagnostics.privacy')}
              </Button>
            </Card.Content>
          </Card>

          {/* Queue health hero */}
          <Card mode="contained" style={{ backgroundColor: toneBg }}>
            <Card.Content style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('diagnostics.queue')}
                </Text>
                <Chip
                  compact
                  mode="flat"
                  style={{ backgroundColor: theme.colors.surface }}
                  textStyle={{ color: toneColor, fontWeight: '600' }}
                >
                  {toneLabel}
                </Chip>
              </View>
              <Text
                variant="displaySmall"
                style={{ color: toneColor, fontVariant: ['tabular-nums'], fontWeight: '700' }}
              >
                {data.unsyncedRows}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('diagnostics.unsynced')} / {data.totalRows} total queued operations
              </Text>
            </Card.Content>
          </Card>

          {/* Metric tiles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard label={t('diagnostics.pending')} value={data.pendingRows} tone="info" />
            <MetricCard
              label={t('diagnostics.failed')}
              value={data.failedRows}
              tone={data.failedRows > 0 ? 'warn' : 'neutral'}
            />
            <MetricCard
              label={t('diagnostics.reviewable')}
              value={data.reviewableRows}
              tone={data.reviewableRows > 0 ? 'danger' : 'neutral'}
            />
            <MetricCard label={t('diagnostics.maxRetry')} value={data.maxRetryCount} />
          </View>

          {/* Timing facts */}
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Sync timing
              </Text>
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

          {/* Latest error — live region so VoiceOver announces changes */}
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }} accessibilityLiveRegion="polite">
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

          {/* Device + support bundle */}
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
                <InfoRow label="Tier" value={metadata.subscriptionTier ?? t('diagnostics.never')} />
                <InfoRow label="Enabled modules" value={metadata.enabledModuleCount.toString()} />
                <InfoRow
                  label="Entitlements"
                  value={metadata.entitlementsValidUntil ?? t('diagnostics.never')}
                />
                <InfoRow
                  label="Server clock"
                  value={metadata.lastServerHandshakeAt ?? t('diagnostics.never')}
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
                    void haptics.tapLight()
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
                  accessibilityLabel={t('diagnostics.copyBundle')}
                  accessibilityHint="Phone numbers and emails are stripped before copy"
                >
                  {t('diagnostics.copyBundle')}
                </Button>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Bundle strips phone numbers and emails before leaving the device.
                </Text>
                <Button
                  mode="outlined"
                  icon="database-export-outline"
                  loading={exporting}
                  disabled={exporting || !metadata}
                  onPress={() => {
                    if (!metadata) return
                    void haptics.tapLight()
                    setExporting(true)
                    void buildLocalDataExport({
                      db,
                      metadata,
                      generatedAt: new Date(),
                    })
                      .then((exportText) => Clipboard.setStringAsync(exportText))
                      .then((copied) => {
                        setSnackbar(
                          copied
                            ? t('diagnostics.localExportCopied')
                            : t('diagnostics.localExportCopyFailed'),
                        )
                      })
                      .catch(() => {
                        setSnackbar(t('diagnostics.localExportCopyFailed'))
                      })
                      .finally(() => {
                        setExporting(false)
                      })
                  }}
                  accessibilityLabel={t('diagnostics.copyLocalExport')}
                  accessibilityHint="Copies products, sales, sale lines, and sync queue rows for support recovery"
                >
                  {t('diagnostics.copyLocalExport')}
                </Button>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('diagnostics.localExportHint')}
                </Text>
              </Card.Content>
            </Card>
          ) : null}
        </ScrollView>
      ) : null}

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  )
}

function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'info' | 'warn' | 'danger'
}) {
  const theme = useAppTheme()
  const color = {
    neutral: theme.colors.onSurface,
    info: theme.colors.primary,
    warn: theme.tdpos.amber[700],
    danger: theme.tdpos.semantic.red600,
  }[tone]

  return (
    <Card mode="contained" style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Card.Content style={{ gap: 4 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="titleLarge" style={{ color, fontVariant: ['tabular-nums'] }}>
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

function DiagnosticsSkeleton() {
  const theme = useAppTheme()
  const swatch = theme.tdpos.ink[100]
  const bar = theme.tdpos.ink[200]
  return (
    <>
      <Card mode="contained">
        <Card.Content style={{ gap: 12 }}>
          <View style={{ height: 12, width: '30%', borderRadius: 4, backgroundColor: bar }} />
          <View style={{ height: 36, borderRadius: 8, backgroundColor: swatch }} />
          <View style={{ height: 36, borderRadius: 8, backgroundColor: swatch }} />
        </Card.Content>
      </Card>
      <Card mode="contained">
        <Card.Content style={{ gap: 8 }}>
          <View style={{ height: 12, width: '40%', borderRadius: 4, backgroundColor: bar }} />
          <View style={{ height: 40, width: '40%', borderRadius: 6, backgroundColor: swatch }} />
          <View style={{ height: 10, width: '60%', borderRadius: 4, backgroundColor: swatch }} />
        </Card.Content>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[0, 1, 2, 3].map((key) => (
          <Card key={key} mode="contained" style={{ flexBasis: '47%', flexGrow: 1 }}>
            <Card.Content style={{ gap: 6 }}>
              <View
                style={{ height: 10, width: '60%', borderRadius: 4, backgroundColor: swatch }}
              />
              <View style={{ height: 18, width: '40%', borderRadius: 4, backgroundColor: bar }} />
            </Card.Content>
          </Card>
        ))}
      </View>
    </>
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
