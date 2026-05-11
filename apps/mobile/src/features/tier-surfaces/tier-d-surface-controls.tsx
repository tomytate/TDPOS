// Tier D Premium mobile surface controls.
// Surfaces: supermarket counter (multi-lane cashier), customer display (cart mirror),
// back-office audit (sales/inventory/sync health), weighted PLU (lookup + weight entry).

import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useProducts } from '@/features/products/hooks/use-products'
import { getSyncHealth, type SyncHealth } from '@/features/diagnostics/lib/sync-health'
import type { MobileTierSurface } from '@/features/tier-surfaces/surface-scaffolds'
import { useHaptics } from '@/hooks/use-haptics'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { DbProduct } from '@tdpos/db'
import { formatMoney } from '@tdpos/shared'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// mobile.supermarket_counter
// ---------------------------------------------------------------------------

function ScannerProductRow({ product }: { product: DbProduct }) {
  const theme = useAppTheme()
  const haptics = useHaptics()
  const addItem = useCartStore((state) => state.addItem)
  const lowStock =
    product.reorder_point_pieces !== null && product.stock_pieces <= product.reorder_point_pieces

  const add = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price_per_piece: product.price_per_piece,
        price_per_pack: product.price_per_pack,
        pieces_per_pack: product.pieces_per_pack,
        category_id: product.category_id,
      },
      'piece',
      1,
    )
    void haptics.tapLight()
  }

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: theme.colors.outlineVariant,
        borderBottomWidth: 1,
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {product.name}
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: lowStock ? theme.tdpos.semantic.red500 : theme.colors.onSurfaceVariant,
            fontVariant: ['tabular-nums'],
          }}
        >
          {product.stock_pieces} pcs · {formatMoney(product.price_per_piece)}
          {lowStock ? ' · LOW' : ''}
        </Text>
      </View>
      <Button mode="contained-tonal" compact onPress={add}>
        + 1
      </Button>
      {product.price_per_pack !== null ? (
        <Button
          mode="outlined"
          compact
          onPress={() => {
            addItem(
              {
                id: product.id,
                name: product.name,
                price_per_piece: product.price_per_piece,
                price_per_pack: product.price_per_pack,
                pieces_per_pack: product.pieces_per_pack,
                category_id: product.category_id,
              },
              'pack',
              1,
            )
            void haptics.tapLight()
          }}
        >
          Pack
        </Button>
      ) : null}
    </View>
  )
}

function SupermarketCounterControls() {
  const theme = useAppTheme()
  const { data: products = [], isPending } = useProducts()
  const items = useCartStore((state) => state.items)
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const visibleProducts = products.slice(0, 12)

  return (
    <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
      <Card.Content style={{ gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Live Tier D supermarket lane
          </Text>
          <Text variant="titleMedium">Scanner-driven counter with belt mode</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip compact>Belt mode</Chip>
          <Chip compact mode="outlined">
            {itemCount} items
          </Chip>
          <Chip compact mode="outlined">
            {formatMoney(total)}
          </Chip>
        </View>

        {isPending ? (
          <ActivityIndicator />
        ) : visibleProducts.length === 0 ? (
          <Card mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No active products available for the supermarket lane.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View>
            {visibleProducts.map((product) => (
              <ScannerProductRow key={product.id} product={product} />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            mode="contained"
            icon="cash-register"
            disabled={items.length === 0}
            onPress={() => router.push('/(app)/checkout')}
          >
            Checkout
          </Button>
          <Button mode="outlined" icon="barcode-scan" onPress={() => router.push('/(app)/scanner')}>
            Scanner
          </Button>
        </View>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Continuous scan mode and loyalty lookup remain 0.9 phase. All items write through the
          existing cart/checkout path — no lane-specific stock math.
        </Text>
      </Card.Content>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// mobile.customer_display
// ---------------------------------------------------------------------------

function CustomerDisplayControls() {
  const theme = useAppTheme()
  const items = useCartStore((state) => state.items)
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const storeName = useAuthStore((state) => state.storeName)

  return (
    <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
      <Card.Content style={{ gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Live Tier D customer display
          </Text>
          <Text variant="titleMedium">Customer-facing live cart mirror</Text>
        </View>

        <Card
          mode="outlined"
          style={{
            backgroundColor: theme.colors.inverseSurface,
            borderRadius: 12,
          }}
        >
          <Card.Content style={{ gap: 10, paddingVertical: 16 }}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.inverseOnSurface, textAlign: 'center' }}
            >
              {storeName ?? 'TD POS Store'}
            </Text>

            {items.length === 0 ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.inverseOnSurface, opacity: 0.7, textAlign: 'center' }}
              >
                Welcome — waiting for items
              </Text>
            ) : (
              <View style={{ gap: 4 }}>
                {items.slice(0, 8).map((item) => (
                  <View
                    key={`${item.productId}-${item.wasSoldAs}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      style={{ color: theme.colors.inverseOnSurface, flex: 1 }}
                    >
                      {item.name} x{item.qty}
                    </Text>
                    <Text
                      variant="labelMedium"
                      style={{
                        color: theme.colors.inverseOnSurface,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatMoney(item.lineTotal)}
                    </Text>
                  </View>
                ))}
                {items.length > 8 ? (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.inverseOnSurface,
                      opacity: 0.7,
                      textAlign: 'center',
                    }}
                  >
                    +{items.length - 8} more items
                  </Text>
                ) : null}
              </View>
            )}

            <View
              style={{
                borderTopColor: theme.colors.inverseOnSurface,
                borderTopWidth: 1,
                marginTop: 4,
                opacity: 0.3,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 8,
              }}
            >
              <Text variant="titleMedium" style={{ color: theme.colors.inverseOnSurface }}>
                {itemCount} items
              </Text>
              <Text
                variant="headlineSmall"
                style={{
                  color: theme.colors.inverseOnSurface,
                  fontVariant: ['tabular-nums'],
                  fontWeight: 'bold',
                }}
              >
                {formatMoney(total)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          This card previews the customer-facing display layout. Paired tablet display and idle
          branding are 0.9 phase. The display mirrors local cart state only — no second source of
          transaction truth.
        </Text>
      </Card.Content>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// mobile.backoffice_audit
// ---------------------------------------------------------------------------

interface AuditRow {
  type: string
  pieces_delta: number
  reason: string | null
  product_name: string | null
  created_at: number
}

interface SaleRow {
  id: string
  receipt_number: string
  total_amount: number
  payment_method: string
  status: string
  created_at: number
}

function BackofficeAuditControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const role = useAuthStore((state) => state.role)
  const branchId = useAuthStore((state) => state.branchId)
  const [inventoryLogs, setInventoryLogs] = useState<AuditRow[]>([])
  const [recentSales, setRecentSales] = useState<SaleRow[]>([])
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const managerRole = role === 'owner' || role === 'manager'

  const loadAuditData = useCallback(async () => {
    const [logs, sales, health] = await Promise.all([
      db.getAllAsync<AuditRow>(
        `
          SELECT
            il.type,
            il.pieces_delta,
            il.reason,
            p.name AS product_name,
            il.created_at
          FROM inventory_logs il
          LEFT JOIN products p ON p.id = il.product_id
          WHERE il.branch_id = ?
          ORDER BY il.created_at DESC
          LIMIT 15
        `,
        [branchId ?? ''],
      ),
      db.getAllAsync<SaleRow>(
        `
          SELECT id, receipt_number, total_amount, payment_method, status, created_at
          FROM sales
          WHERE branch_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `,
        [branchId ?? ''],
      ),
      getSyncHealth(db),
    ])
    return { logs, sales, health }
  }, [branchId, db])

  const refresh = useCallback(async () => {
    setBusy(true)
    const snapshot = await loadAuditData()
    setInventoryLogs(snapshot.logs)
    setRecentSales(snapshot.sales)
    setSyncHealth(snapshot.health)
    setBusy(false)
    setMessage('Audit data refreshed.')
  }, [loadAuditData])

  useEffect(() => {
    let cancelled = false

    void loadAuditData().then((snapshot) => {
      if (cancelled) return
      setInventoryLogs(snapshot.logs)
      setRecentSales(snapshot.sales)
      setSyncHealth(snapshot.health)
      setBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadAuditData])

  if (!managerRole) {
    return (
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Back-office audit
          </Text>
          <Text variant="titleMedium">Manager role required</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Audit trail review is visible to owner and manager roles only.
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
                Live Tier D audit trail
              </Text>
              <Text variant="titleMedium">Local inventory and sale history</Text>
            </View>
            <Button mode="outlined" compact disabled={busy} onPress={() => void refresh()}>
              Refresh
            </Button>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
            <InfoTile label="Last sync" value={secondsToTime(syncHealth?.lastSuccessfulSyncAt)} />
          </View>

          {busy ? (
            <ActivityIndicator />
          ) : (
            <>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Recent sales
              </Text>
              {recentSales.length === 0 ? (
                <Card mode="outlined">
                  <Card.Content>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      No local sales recorded yet.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <View style={{ gap: 6 }}>
                  {recentSales.map((sale) => (
                    <View
                      key={sale.id}
                      style={{
                        borderBottomColor: theme.colors.outlineVariant,
                        borderBottomWidth: 1,
                        flexDirection: 'row',
                        gap: 8,
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {sale.receipt_number}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {secondsToTime(sale.created_at)} · {sale.payment_method}
                        </Text>
                      </View>
                      <Text variant="labelMedium" style={{ fontVariant: ['tabular-nums'] }}>
                        {formatMoney(sale.total_amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Inventory changes
              </Text>
              {inventoryLogs.length === 0 ? (
                <Card mode="outlined">
                  <Card.Content>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      No local inventory changes recorded yet.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <View style={{ gap: 6 }}>
                  {inventoryLogs.map((log, idx) => (
                    <View
                      key={`${log.created_at}-${idx}`}
                      style={{
                        borderBottomColor: theme.colors.outlineVariant,
                        borderBottomWidth: 1,
                        flexDirection: 'row',
                        gap: 8,
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {log.product_name ?? 'Unknown'} · {log.type}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {secondsToTime(log.created_at)}
                          {log.reason ? ` · ${log.reason}` : ''}
                        </Text>
                      </View>
                      <Text
                        variant="labelMedium"
                        style={{
                          color:
                            log.pieces_delta < 0
                              ? theme.tdpos.semantic.red500
                              : theme.tdpos.semantic.green600,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {log.pieces_delta > 0 ? '+' : ''}
                        {log.pieces_delta} pcs
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Reads cached audit and sync health locally. Export and complete remote history require a
            synced Supabase session (0.9 phase).
          </Text>
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={2500}>
        {message}
      </Snackbar>
    </>
  )
}

// ---------------------------------------------------------------------------
// mobile.weighted_plu
// ---------------------------------------------------------------------------

function WeightedPluControls() {
  const theme = useAppTheme()
  const haptics = useHaptics()
  const { data: products = [], isPending } = useProducts()
  const addItem = useCartStore((state) => state.addItem)
  const items = useCartStore((state) => state.items)
  const [pluSearch, setPluSearch] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  // Filter products that look like weighted items (tingi-enabled or low piece count)
  const pluProducts = products.filter((p) => {
    if (pluSearch.trim()) {
      const term = pluSearch.toLowerCase()
      return (
        p.name.toLowerCase().includes(term) ||
        (p.sku !== null && p.sku.toLowerCase().includes(term))
      )
    }
    return p.is_tingi === 1 || p.is_tingi === true
  })

  const visiblePlu = pluProducts.slice(0, 8)

  const addWeightedItem = (product: DbProduct) => {
    const weight = Number(weightInput.replace(/[^\d.]/g, ''))
    if (!Number.isFinite(weight) || weight <= 0) {
      setMessage('Enter a valid weight before adding.')
      return
    }

    // Convert weight to pieces (grams → canonical pieces for weighted items)
    const pieces = Math.round(weight)
    addItem(
      {
        id: product.id,
        name: product.name,
        price_per_piece: product.price_per_piece,
        price_per_pack: product.price_per_pack,
        pieces_per_pack: product.pieces_per_pack,
        category_id: product.category_id,
      },
      'piece',
      pieces,
    )
    void haptics.tapLight()
    setWeightInput('')
    setMessage(`${product.name}: ${pieces} pcs added from weight entry.`)
  }

  const cartTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <>
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Live Tier D weighted PLU
            </Text>
            <Text variant="titleMedium">PLU lookup and weight entry</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip compact>Manual weight</Chip>
            <Chip compact mode="outlined">
              {items.length} cart lines
            </Chip>
            <Chip compact mode="outlined">
              {formatMoney(cartTotal)}
            </Chip>
          </View>

          <TextInput
            mode="outlined"
            label="PLU code or product name"
            value={pluSearch}
            onChangeText={setPluSearch}
            left={<TextInput.Icon icon="magnify" />}
          />

          <TextInput
            mode="outlined"
            label="Weight (units / grams)"
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="numeric"
            left={<TextInput.Icon icon="scale" />}
          />

          {isPending ? (
            <ActivityIndicator />
          ) : visiblePlu.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {pluSearch.trim()
                    ? 'No products match this PLU code or name.'
                    : 'No tingi-enabled products found. PLU items appear here.'}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 6 }}>
              {visiblePlu.map((product) => (
                <View
                  key={product.id}
                  style={{
                    alignItems: 'center',
                    borderBottomColor: theme.colors.outlineVariant,
                    borderBottomWidth: 1,
                    flexDirection: 'row',
                    gap: 8,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {product.sku ?? 'No SKU'} · {formatMoney(product.price_per_piece)}/pc ·{' '}
                      {product.stock_pieces} pcs
                    </Text>
                  </View>
                  <Button
                    mode="contained-tonal"
                    compact
                    onPress={() => addWeightedItem(product)}
                    disabled={!weightInput.trim()}
                  >
                    Add by weight
                  </Button>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              mode="contained"
              icon="cash-register"
              disabled={items.length === 0}
              onPress={() => router.push('/(app)/checkout')}
            >
              Checkout
            </Button>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Scale hardware integration and tare rules are 0.9 phase. Weight capture produces
            deterministic local sale items and inventory deltas. Scale network is optional.
          </Text>
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tier D dispatcher
// ---------------------------------------------------------------------------

export function TierDSurfaceControls({ surface }: { surface: MobileTierSurface }) {
  if (surface === 'mobile.supermarket_counter') return <SupermarketCounterControls />
  if (surface === 'mobile.customer_display') return <CustomerDisplayControls />
  if (surface === 'mobile.backoffice_audit') return <BackofficeAuditControls />
  if (surface === 'mobile.weighted_plu') return <WeightedPluControls />

  return null
}
