// Reports tab — Tier A daily-sales lens (EOD report). Polished for v0.9
// visual QA: theme-token colors only, skeleton loading, empty state when no
// sales have been recorded today, accessibility labels on every bar row, and
// a refresh affordance via Appbar.

import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useDailySales } from '@/features/reports/hooks/use-daily-sales'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
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

function formatSignedMoney(value: number) {
  if (value < 0) return `-${formatMoney(Math.abs(value))}`
  return formatMoney(value)
}

function getBarWidth(value: number, maxValue: number): `${number}%` {
  const pct = Math.max(8, (value / Math.max(1, maxValue)) * 100)
  return `${pct}%`
}

function MetricTile({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()
  return (
    <Card mode="contained" style={{ flexBasis: '30%', flexGrow: 1, minHeight: 86 }}>
      <Card.Content style={{ gap: 6 }}>
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

function MetricSkeleton() {
  const theme = useAppTheme()
  return (
    <Card mode="contained" style={{ flexBasis: '30%', flexGrow: 1, minHeight: 86 }}>
      <Card.Content style={{ gap: 8 }}>
        <View
          style={{
            height: 10,
            width: '50%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[100],
          }}
        />
        <View
          style={{
            height: 22,
            width: '70%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[200],
          }}
        />
      </Card.Content>
    </Card>
  )
}

function SectionSkeleton() {
  const theme = useAppTheme()
  return (
    <Card mode="contained">
      <Card.Content style={{ gap: 12 }}>
        <View
          style={{
            height: 16,
            width: '40%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[200],
          }}
        />
        {[0, 1, 2].map((key) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                height: 10,
                width: 48,
                borderRadius: 4,
                backgroundColor: theme.tdpos.ink[100],
              }}
            />
            <View
              style={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                backgroundColor: theme.tdpos.ink[100],
              }}
            />
            <View
              style={{
                height: 10,
                width: 64,
                borderRadius: 4,
                backgroundColor: theme.tdpos.ink[100],
              }}
            />
          </View>
        ))}
      </Card.Content>
    </Card>
  )
}

export default function ReportsScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const role = useAuthStore((state) => state.role)
  const setLastSaleResult = useCartStore((state) => state.setLastSaleResult)
  const canOpenDiagnostics = role ? MANAGER_ROLES.has(role) : false
  const today = getLocalDateString()
  const { data, isPending, isFetching, refetch } = useDailySales(today)
  const maxHourlyTotal = Math.max(1, ...(data?.hourlyData.map((row) => row.gross_total) ?? [0]))
  const maxPaymentTotal = Math.max(1, ...(data?.paymentMix.map((row) => row.gross_total) ?? [0]))
  const hasSales = (data?.saleCount ?? 0) + (data?.voidCount ?? 0) > 0
  const trackColor = theme.tdpos.ink[200]

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.tdpos.ink[800] }}>
        <Appbar.Content title={t('eod.title')} color={theme.tdpos.ink[50]} />
        <Appbar.Action
          icon="refresh"
          color={theme.tdpos.ink[50]}
          accessibilityLabel="Refresh report"
          disabled={isFetching}
          onPress={() => {
            void haptics.tapLight()
            void refetch()
          }}
        />
        {canOpenDiagnostics ? (
          <Appbar.Action
            icon="cog-outline"
            color={theme.tdpos.ink[50]}
            accessibilityLabel={t('diagnostics.title')}
            onPress={() => {
              void haptics.tapLight()
              router.push('/(app)/diagnostics')
            }}
          />
        ) : null}
      </Appbar.Header>

      {isPending ? (
        <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </View>
          <SectionSkeleton />
          <SectionSkeleton />
        </ScrollView>
      ) : !hasSales ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleMedium">{t('eod.noSales')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No sales recorded yet today. The EOD report will fill in as the day progresses.
              </Text>
              <Button
                mode="outlined"
                icon="refresh"
                loading={isFetching}
                disabled={isFetching}
                onPress={() => {
                  void haptics.tapLight()
                  void refetch()
                }}
              >
                Refresh
              </Button>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricTile label={t('eod.grossSales')} value={formatMoney(data?.grossTotal ?? 0)} />
            <MetricTile label={t('eod.sales')} value={String(data?.saleCount ?? 0)} />
            <MetricTile label={t('eod.voids')} value={String(data?.voidCount ?? 0)} />
            <MetricTile label={t('eod.pieces')} value={String(data?.itemCount ?? 0)} />
          </View>

          <Card mode="contained">
            <Card.Content style={{ gap: 14 }}>
              <Text variant="titleMedium">{t('eod.hourly')}</Text>
              {data?.hourlyData.map((row) => {
                const width = getBarWidth(row.gross_total, maxHourlyTotal)
                const hourLabel = formatHour(row.hour)
                return (
                  <View
                    key={row.hour}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    accessibilityLabel={`${hourLabel}, ${formatMoney(row.gross_total)} gross sales`}
                  >
                    <Text variant="labelMedium" style={{ width: 48 }}>
                      {hourLabel}
                    </Text>
                    <View
                      style={{
                        backgroundColor: trackColor,
                        borderRadius: 999,
                        flex: 1,
                        height: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          borderRadius: 999,
                          height: 10,
                          width,
                          backgroundColor: theme.tdpos.teal[500],
                        }}
                      />
                    </View>
                    <Text
                      variant="labelMedium"
                      style={{
                        fontVariant: ['tabular-nums'],
                        minWidth: 84,
                        textAlign: 'right',
                      }}
                    >
                      {formatMoney(row.gross_total)}
                    </Text>
                  </View>
                )
              })}
            </Card.Content>
          </Card>

          <Card mode="contained">
            <Card.Content style={{ gap: 14 }}>
              <Text variant="titleMedium">{t('eod.paymentMix')}</Text>
              {data?.paymentMix.map((row) => {
                const width = getBarWidth(row.gross_total, maxPaymentTotal)
                const methodLabel = formatPaymentMethod(row.payment_method, row.is_utang)
                return (
                  <View
                    key={`${row.payment_method}-${row.is_utang}`}
                    style={{ gap: 6 }}
                    accessibilityLabel={`${methodLabel}, ${row.sale_count} sales, ${formatMoney(row.gross_total)} gross`}
                  >
                    <View
                      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
                    >
                      <Text variant="labelLarge">{methodLabel}</Text>
                      <Text variant="labelMedium" style={{ fontVariant: ['tabular-nums'] }}>
                        {row.sale_count} {t('eod.sales')}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: trackColor,
                        borderRadius: 999,
                        flex: 1,
                        height: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          borderRadius: 999,
                          height: 10,
                          width,
                          backgroundColor: theme.tdpos.amber[500],
                        }}
                      />
                    </View>
                    <Text variant="bodySmall" style={{ fontVariant: ['tabular-nums'] }}>
                      {formatMoney(row.gross_total)}
                    </Text>
                  </View>
                )
              })}
            </Card.Content>
          </Card>

          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleMedium">{t('eod.receipts')}</Text>
              {data?.recentReceipts.map((receipt) => {
                const isVoid = receipt.status === 'voided'
                return (
                  <View
                    key={receipt.saleId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="labelLarge" numberOfLines={1}>
                        #{receipt.receiptNumber}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {new Date(receipt.createdAt * 1000).toLocaleTimeString('en-PH', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {isVoid && receipt.originalReceiptNumber
                          ? ` · ${t('eod.voidOf')} ${receipt.originalReceiptNumber}`
                          : ''}
                      </Text>
                    </View>
                    <Text
                      variant="labelLarge"
                      style={{ fontVariant: ['tabular-nums'], minWidth: 84, textAlign: 'right' }}
                    >
                      {formatSignedMoney(receipt.total)}
                    </Text>
                    <Button
                      mode="text"
                      compact
                      onPress={() => {
                        void haptics.tapLight()
                        setLastSaleResult({
                          saleId: receipt.saleId,
                          receiptNumber: receipt.receiptNumber,
                          status: isVoid ? 'voided' : 'completed',
                          voidedOriginalReceiptNumber: receipt.originalReceiptNumber,
                          total: receipt.total,
                          tendered: Math.max(0, receipt.total),
                          change: 0,
                          paymentMethod: receipt.paymentMethod,
                          isUtang: receipt.isUtang,
                          items: receipt.items,
                          createdAt: receipt.createdAt * 1000,
                        })
                        router.push('/(app)/receipt')
                      }}
                      accessibilityLabel={`Open receipt ${receipt.receiptNumber}`}
                    >
                      {t('eod.openReceipt')}
                    </Button>
                  </View>
                )
              })}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  )
}
