import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Button, Card, Chip, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useCategories } from '@/features/products/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import { ShiftSurfaceControls } from '@/features/shifts/shift-surface-controls'
import type { MobileTierSurface } from '@/features/tier-surfaces/surface-scaffolds'
import { getSyncHealth, type SyncHealth } from '@/features/diagnostics/lib/sync-health'
import { useHaptics } from '@/hooks/use-haptics'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { DbProduct } from '@tdpos/db'
import { formatMoney } from '@tdpos/shared'

const ALL_CATEGORY = 'all'

interface LaneRow {
  id: string
  cashier_code: string
  opened_at: number
  opening_cash: number
  sale_count: number | null
  gross_sales: number | null
  cash_sales: number | null
}

function numberOrZero(value: number | null | undefined) {
  return Number(value ?? 0)
}

function secondsToTime(value: number | null | undefined): string {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function InfoTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  const theme = useAppTheme()
  const color =
    tone === 'good'
      ? theme.tdpos.semantic.green600
      : tone === 'warn'
        ? theme.tdpos.amber[700]
        : tone === 'danger'
          ? theme.colors.error
          : theme.colors.onSurface

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        minWidth: 112,
        padding: 10,
      }}
    >
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color, marginTop: 4 }}>
        {value}
      </Text>
    </View>
  )
}

function TabletProductTile({ product }: { product: DbProduct }) {
  const theme = useAppTheme()
  const haptics = useHaptics()
  const addItem = useCartStore((state) => state.addItem)
  const lowStock =
    product.reorder_point_pieces !== null && product.stock_pieces <= product.reorder_point_pieces

  const add = (soldAs: 'piece' | 'pack') => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price_per_piece: product.price_per_piece,
        price_per_pack: product.price_per_pack,
        pieces_per_pack: product.pieces_per_pack,
        category_id: product.category_id,
      },
      soldAs,
      1,
    )
    void haptics.tapLight()
  }

  return (
    <Card mode="contained" style={{ flex: 1, minWidth: 148 }}>
      <Card.Content style={{ gap: 8 }}>
        <Text variant="titleSmall" numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
          {formatMoney(product.price_per_piece)}
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: lowStock ? theme.tdpos.semantic.red500 : theme.colors.onSurfaceVariant,
            fontVariant: ['tabular-nums'],
          }}
        >
          {product.stock_pieces} pcs{lowStock ? ' · low' : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="contained-tonal" compact onPress={() => add('piece')}>
            Piece
          </Button>
          {product.price_per_pack !== null ? (
            <Button mode="outlined" compact onPress={() => add('pack')}>
              Pack
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  )
}

function TabletPosControls() {
  const theme = useAppTheme()
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const { data: categories = [] } = useCategories()
  const { data: products = [], isPending } = useProducts(
    activeCategory === ALL_CATEGORY ? undefined : activeCategory,
  )
  const items = useCartStore((state) => state.items)
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const visibleProducts = products.slice(0, 8)

  return (
    <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
      <Card.Content style={{ gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Live Tier B tablet register
          </Text>
          <Text variant="titleMedium">Wide product grid and active cart</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            selected={activeCategory === ALL_CATEGORY}
            mode={activeCategory === ALL_CATEGORY ? 'flat' : 'outlined'}
            onPress={() => setActiveCategory(ALL_CATEGORY)}
          >
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              selected={activeCategory === category.id}
              mode={activeCategory === category.id ? 'flat' : 'outlined'}
              onPress={() => setActiveCategory(category.id)}
            >
              {category.name}
            </Chip>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1.4, gap: 10, minWidth: 280 }}>
            {isPending ? (
              <View style={{ minHeight: 160, justifyContent: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : visibleProducts.length === 0 ? (
              <Card mode="outlined">
                <Card.Content>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    No active products in this category.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {visibleProducts.map((product) => (
                  <TabletProductTile key={product.id} product={product} />
                ))}
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 10, minWidth: 220 }}>
            <InfoTile
              label="Cart items"
              value={String(itemCount)}
              tone={itemCount > 0 ? 'good' : 'neutral'}
            />
            <InfoTile
              label="Cart total"
              value={formatMoney(total)}
              tone={total > 0 ? 'good' : 'neutral'}
            />
            {items.slice(0, 4).map((item) => (
              <View
                key={`${item.productId}-${item.wasSoldAs}`}
                style={{
                  borderBottomColor: theme.colors.outlineVariant,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  gap: 8,
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                }}
              >
                <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                  {item.name} x{item.qty}
                </Text>
                <Text variant="labelMedium">{formatMoney(item.lineTotal)}</Text>
              </View>
            ))}
            <Button
              mode="contained"
              icon="cash-register"
              disabled={items.length === 0}
              onPress={() => router.push('/(app)/checkout')}
            >
              Checkout
            </Button>
            <Button
              mode="outlined"
              icon="barcode-scan"
              onPress={() => router.push('/(app)/scanner')}
            >
              Scanner
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  )
}

async function loadLaneRows(db: ReturnType<typeof useSQLiteContext>) {
  return db.getAllAsync<LaneRow>(
    `
      SELECT
        shift_sessions.id,
        shift_sessions.cashier_code,
        shift_sessions.opened_at,
        shift_sessions.opening_cash,
        COUNT(sales.id) AS sale_count,
        COALESCE(SUM(sales.total_amount), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN sales.payment_method = 'cash' THEN sales.total_amount ELSE 0 END), 0) AS cash_sales
      FROM shift_sessions
      LEFT JOIN sales
        ON sales.created_at >= shift_sessions.opened_at
       AND (shift_sessions.user_id IS NULL OR sales.user_id = shift_sessions.user_id)
      WHERE shift_sessions.status = 'open'
      GROUP BY shift_sessions.id
      ORDER BY shift_sessions.opened_at DESC
      LIMIT 8
    `,
    [],
  )
}

function OwnerLaneControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const role = useAuthStore((state) => state.role)
  const [lanes, setLanes] = useState<LaneRow[]>([])
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const managerRole = role === 'owner' || role === 'manager'

  const loadBoard = useCallback(async () => {
    const [laneRows, health] = await Promise.all([loadLaneRows(db), getSyncHealth(db)])
    return { laneRows, health }
  }, [db])

  const refresh = useCallback(async () => {
    setBusy(true)
    const snapshot = await loadBoard()
    setLanes(snapshot.laneRows)
    setSyncHealth(snapshot.health)
    setBusy(false)
    setMessage('Lane board refreshed.')
  }, [loadBoard])

  useEffect(() => {
    let cancelled = false

    void loadBoard().then((snapshot) => {
      if (cancelled) return
      setLanes(snapshot.laneRows)
      setSyncHealth(snapshot.health)
      setBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadBoard])

  if (!managerRole) {
    return (
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Owner lane board
          </Text>
          <Text variant="titleMedium">Manager role required</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            This paid surface is scaffolded, but lane totals are visible to owner and manager roles.
          </Text>
        </Card.Content>
      </Card>
    )
  }

  return (
    <>
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                Live Tier B lane board
              </Text>
              <Text variant="titleMedium">Open shifts and local sync health</Text>
            </View>
            <Button mode="outlined" compact disabled={busy} onPress={() => void refresh()}>
              Refresh
            </Button>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <InfoTile
              label="Open lanes"
              value={String(lanes.length)}
              tone={lanes.length > 0 ? 'good' : 'neutral'}
            />
            <InfoTile
              label="Queued rows"
              value={String(syncHealth?.unsyncedRows ?? 0)}
              tone={
                (syncHealth?.reviewableRows ?? 0) > 0
                  ? 'danger'
                  : (syncHealth?.unsyncedRows ?? 0) > 0
                    ? 'warn'
                    : 'good'
              }
            />
            <InfoTile
              label="Needs review"
              value={String(syncHealth?.reviewableRows ?? 0)}
              tone={(syncHealth?.reviewableRows ?? 0) > 0 ? 'danger' : 'good'}
            />
          </View>

          {busy ? (
            <ActivityIndicator />
          ) : lanes.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No open local shifts on this device.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {lanes.map((lane) => {
                const cashSales = numberOrZero(lane.cash_sales)
                const expectedCash = numberOrZero(lane.opening_cash) + cashSales
                return (
                  <Card key={lane.id} mode="outlined">
                    <Card.Content style={{ gap: 8 }}>
                      <View
                        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall">{lane.cashier_code}</Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Opened {secondsToTime(lane.opened_at)}
                          </Text>
                        </View>
                        <Chip compact mode="flat">
                          {numberOrZero(lane.sale_count)} sales
                        </Chip>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <InfoTile
                          label="Gross"
                          value={formatMoney(numberOrZero(lane.gross_sales))}
                        />
                        <InfoTile
                          label="Expected cash"
                          value={formatMoney(expectedCash)}
                          tone="good"
                        />
                      </View>
                    </Card.Content>
                  </Card>
                )
              })}
            </View>
          )}
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={2500}>
        {message}
      </Snackbar>
    </>
  )
}

export function TierBSurfaceControls({ surface }: { surface: MobileTierSurface }) {
  if (surface === 'mobile.tablet_pos') return <TabletPosControls />
  if (surface === 'mobile.owner_lanes') return <OwnerLaneControls />
  if (surface === 'mobile.shift_login' || surface === 'mobile.shift_handoff') {
    return <ShiftSurfaceControls surface={surface} />
  }

  return null
}
