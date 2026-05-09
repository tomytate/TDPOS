import { router } from 'expo-router'
import { ScrollView, StyleSheet, View, type DimensionValue } from 'react-native'
import { ActivityIndicator, Appbar, Card, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useDailySales } from '@/features/reports/hooks/use-daily-sales'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import { formatMoney } from '@tdpos/shared'

const MANAGER_ROLES = new Set(['owner', 'manager'])

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHour(hour: string) {
  const parsed = Number.parseInt(hour, 10)
  if (Number.isNaN(parsed)) return hour
  const suffix = parsed >= 12 ? 'PM' : 'AM'
  const displayHour = parsed % 12 === 0 ? 12 : parsed % 12
  return `${displayHour} ${suffix}`
}

function formatPaymentMethod(method: string, isUtang: number) {
  if (isUtang === 1) return 'Utang'
  if (method.toLowerCase() === 'gcash') return 'GCash'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

function getBarWidth(value: number, maxValue: number): DimensionValue {
  return `${Math.max(8, (value / Math.max(1, maxValue)) * 100)}%` as DimensionValue
}

export default function ReportsScreen() {
  const theme = useAppTheme()
  const t = useT()
  const role = useAuthStore((state) => state.role)
  const canOpenDiagnostics = role ? MANAGER_ROLES.has(role) : false
  const today = getLocalDateString()
  const { data, isPending } = useDailySales(today)
  const maxHourlyTotal = Math.max(1, ...(data?.hourlyData.map((row) => row.gross_total) ?? [0]))
  const maxPaymentTotal = Math.max(1, ...(data?.paymentMix.map((row) => row.gross_total) ?? [0]))

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

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.kpiGrid}>
            <MetricCard label={t('eod.grossSales')} value={formatMoney(data?.grossTotal ?? 0)} />
            <MetricCard label={t('eod.sales')} value={String(data?.saleCount ?? 0)} />
            <MetricCard label={t('eod.pieces')} value={String(data?.itemCount ?? 0)} />
          </View>

          <Card mode="contained">
            <Card.Content style={styles.section}>
              <Text variant="titleMedium">{t('eod.hourly')}</Text>
              {(data?.hourlyData.length ?? 0) === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('eod.noSales')}
                </Text>
              ) : (
                data?.hourlyData.map((row) => {
                  const width = getBarWidth(row.gross_total, maxHourlyTotal)

                  return (
                    <View key={row.hour} style={styles.barRow}>
                      <Text variant="labelMedium" style={styles.barLabel}>
                        {formatHour(row.hour)}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width, backgroundColor: theme.tdpos.teal[500] },
                          ]}
                        />
                      </View>
                      <Text variant="labelMedium" style={styles.barValue}>
                        {formatMoney(row.gross_total)}
                      </Text>
                    </View>
                  )
                })
              )}
            </Card.Content>
          </Card>

          <Card mode="contained">
            <Card.Content style={styles.section}>
              <Text variant="titleMedium">{t('eod.paymentMix')}</Text>
              {(data?.paymentMix.length ?? 0) === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('eod.noSales')}
                </Text>
              ) : (
                data?.paymentMix.map((row) => {
                  const width = getBarWidth(row.gross_total, maxPaymentTotal)

                  return (
                    <View key={`${row.payment_method}-${row.is_utang}`} style={styles.mixRow}>
                      <View style={styles.mixHeader}>
                        <Text variant="labelLarge">
                          {formatPaymentMethod(row.payment_method, row.is_utang)}
                        </Text>
                        <Text variant="labelMedium" style={{ fontVariant: ['tabular-nums'] }}>
                          {row.sale_count} {t('eod.sales')}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width, backgroundColor: theme.tdpos.amber[500] },
                          ]}
                        />
                      </View>
                      <Text variant="bodySmall" style={{ fontVariant: ['tabular-nums'] }}>
                        {formatMoney(row.gross_total)}
                      </Text>
                    </View>
                  )
                })
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card mode="contained" style={styles.metricCard}>
      <Card.Content style={styles.metricContent}>
        <Text variant="labelMedium">{label}</Text>
        <Text variant="titleLarge" style={styles.metricValue}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  barFill: {
    borderRadius: 999,
    height: 10,
  },
  barLabel: {
    width: 48,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  barTrack: {
    backgroundColor: 'rgba(120, 113, 108, 0.18)',
    borderRadius: 999,
    flex: 1,
    height: 10,
    overflow: 'hidden',
  },
  barValue: {
    minWidth: 84,
    textAlign: 'right',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 86,
  },
  metricContent: {
    gap: 6,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  mixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mixRow: {
    gap: 6,
  },
  section: {
    gap: 14,
  },
})
