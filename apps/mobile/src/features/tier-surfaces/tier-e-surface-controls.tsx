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
import { getSyncHealth, type SyncHealth } from '@/features/diagnostics/lib/sync-health'
import {
  cancelKioskOrder,
  confirmKioskOrder,
  createKioskOrder,
  listActiveKioskOrders,
  type LocalKioskOrder,
} from '@/features/kiosk/lib/kiosk-orders'
import { useProducts } from '@/features/products/hooks/use-products'
import {
  createReturnRequest,
  listPendingReturns,
  lookupSaleByReceipt,
  resolveReturnRequest,
  type LocalReturnRequest,
} from '@/features/returns/lib/return-requests'
import type { MobileTierSurface } from '@/features/tier-surfaces/surface-scaffolds'
import { useAuthStore } from '@/stores/auth-store'
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
// mobile.hq_rollup
// ---------------------------------------------------------------------------

interface BranchSnapshot {
  branch_id: string
  branch_name: string
  sale_count: number | null
  gross_sales: number | null
  product_count: number | null
  low_stock_count: number | null
}

function HqRollupControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const role = useAuthStore((state) => state.role)
  const [branches, setBranches] = useState<BranchSnapshot[]>([])
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const managerRole = role === 'owner' || role === 'manager'

  const loadHqData = useCallback(async () => {
    const [branchRows, health] = await Promise.all([
      db.getAllAsync<BranchSnapshot>(
        `
          SELECT
            b.id AS branch_id,
            b.name AS branch_name,
            (SELECT COUNT(*) FROM sales WHERE branch_id = b.id) AS sale_count,
            (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE branch_id = b.id) AS gross_sales,
            (SELECT COUNT(*) FROM products WHERE business_id = b.business_id AND is_active = 1) AS product_count,
            (SELECT COUNT(*) FROM products WHERE business_id = b.business_id AND is_active = 1
               AND reorder_point_pieces IS NOT NULL AND stock_pieces <= reorder_point_pieces) AS low_stock_count
          FROM branches b
          WHERE b.is_active = 1
          ORDER BY b.name
          LIMIT 20
        `,
        [],
      ),
      getSyncHealth(db),
    ])
    return { branchRows, health }
  }, [db])

  const refresh = useCallback(async () => {
    setBusy(true)
    const snapshot = await loadHqData()
    setBranches(snapshot.branchRows)
    setSyncHealth(snapshot.health)
    setBusy(false)
    setMessage('HQ data refreshed.')
  }, [loadHqData])

  useEffect(() => {
    let cancelled = false

    void loadHqData().then((snapshot) => {
      if (cancelled) return
      setBranches(snapshot.branchRows)
      setSyncHealth(snapshot.health)
      setBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadHqData])

  if (!managerRole) {
    return (
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            HQ rollup
          </Text>
          <Text variant="titleMedium">Manager role required</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Cross-branch rollup is visible to owner and manager roles only.
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
                Live Tier E HQ rollup
              </Text>
              <Text variant="titleMedium">Cross-branch sales and stock health</Text>
            </View>
            <Button mode="outlined" compact disabled={busy} onPress={() => void refresh()}>
              Refresh
            </Button>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <InfoTile
              label="Active branches"
              value={String(branches.length)}
              tone={branches.length > 0 ? 'good' : 'neutral'}
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
          </View>

          {busy ? (
            <ActivityIndicator />
          ) : branches.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No active branches found in local data. HQ rollup is primarily remote; cached
                  branch snapshots appear here when offline.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {branches.map((branch) => (
                <Card key={branch.branch_id} mode="outlined">
                  <Card.Content style={{ gap: 8 }}>
                    <View
                      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
                    >
                      <Text variant="titleSmall" style={{ flex: 1 }}>
                        {branch.branch_name}
                      </Text>
                      {Number(branch.low_stock_count ?? 0) > 0 ? (
                        <Chip compact mode="outlined" textStyle={{ color: theme.colors.error }}>
                          {branch.low_stock_count} low stock
                        </Chip>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <InfoTile
                        label="Sales"
                        value={String(Number(branch.sale_count ?? 0))}
                        tone={Number(branch.sale_count ?? 0) > 0 ? 'good' : 'neutral'}
                      />
                      <InfoTile
                        label="Revenue"
                        value={formatMoney(Number(branch.gross_sales ?? 0))}
                        tone={Number(branch.gross_sales ?? 0) > 0 ? 'good' : 'neutral'}
                      />
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            HQ rollup is primarily synced/remote; device cache shows last-known branch snapshots
            when offline. Cross-branch transfers and franchise management are 0.9 phase.
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
// mobile.self_service_kiosk
// ---------------------------------------------------------------------------

function SelfServiceKioskControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const businessId = useAuthStore((state) => state.businessId)
  const branchId = useAuthStore((state) => state.branchId)
  const { data: products = [], isPending } = useProducts()
  const [orders, setOrders] = useState<LocalKioskOrder[]>([])
  const [customerLabel, setCustomerLabel] = useState('')
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const visibleProducts = products.slice(0, 6)

  const loadOrders = useCallback(async () => listActiveKioskOrders(db, branchId), [branchId, db])

  const refresh = useCallback(async () => {
    setBusy(true)
    setOrders(await loadOrders())
    setBusy(false)
  }, [loadOrders])

  useEffect(() => {
    let cancelled = false

    void loadOrders().then((nextOrders) => {
      if (cancelled) return
      setOrders(nextOrders)
      setBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadOrders])

  const onCreateOrder = async () => {
    const items = visibleProducts.slice(0, 2).map((p) => ({
      productId: p.id,
      name: p.name,
      qty: 1,
      unitPrice: p.price_per_piece,
    }))

    const result = await createKioskOrder({
      db,
      identity: { businessId, branchId },
      customerLabel: customerLabel.trim() || null,
      items,
    })

    setMessage(result.ok ? 'Kiosk order queued for staff.' : result.message)
    setCustomerLabel('')
    await refresh()
  }

  const onConfirm = async (orderId: string) => {
    const result = await confirmKioskOrder({ db, orderId })
    setMessage(result.ok ? 'Order confirmed by staff.' : result.message)
    await refresh()
  }

  const onCancel = async (orderId: string) => {
    const result = await cancelKioskOrder({ db, orderId })
    setMessage(result.ok ? 'Order cancelled.' : result.message)
    await refresh()
  }

  return (
    <>
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Live Tier E self-service kiosk
            </Text>
            <Text variant="titleMedium">Customer order queue and staff confirmation</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip compact>Kiosk mode</Chip>
            <Chip compact mode="outlined">
              {orders.length} active orders
            </Chip>
          </View>

          <TextInput
            mode="outlined"
            label="Customer name / number (optional)"
            value={customerLabel}
            onChangeText={setCustomerLabel}
            left={<TextInput.Icon icon="account-outline" />}
          />

          {isPending ? (
            <ActivityIndicator />
          ) : visibleProducts.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No products available for kiosk ordering.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <Button mode="contained" icon="cart-plus" onPress={() => void onCreateOrder()}>
              Create sample kiosk order
            </Button>
          )}

          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Staff approval queue
          </Text>

          {busy ? (
            <ActivityIndicator />
          ) : orders.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No pending kiosk orders.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {orders.map((order) => (
                <Card key={order.id} mode="outlined">
                  <Card.Content style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleSmall">
                          {order.customer_label ?? 'Walk-in customer'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {secondsToTime(order.created_at)} · {formatMoney(order.total_amount)}
                        </Text>
                      </View>
                      <Chip compact mode="flat">
                        {order.status}
                      </Chip>
                    </View>
                    {order.status === 'awaiting_staff' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Button
                          mode="contained-tonal"
                          compact
                          onPress={() => void onConfirm(order.id)}
                        >
                          Confirm
                        </Button>
                        <Button mode="outlined" compact onPress={() => void onCancel(order.id)}>
                          Cancel
                        </Button>
                      </View>
                    ) : null}
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Kiosk orders queue locally and require staff confirmation before stock is decremented.
            Device lock policy and customer accessibility are 0.9 phase.
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
// mobile.returns_warranty
// ---------------------------------------------------------------------------

function formatReasonCode(value: string) {
  return value.replaceAll('_', ' ')
}

function ReturnsWarrantyControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const businessId = useAuthStore((state) => state.businessId)
  const branchId = useAuthStore((state) => state.branchId)
  const userId = useAuthStore((state) => state.userId)
  const role = useAuthStore((state) => state.role)
  const [requests, setRequests] = useState<LocalReturnRequest[]>([])
  const [receiptSearch, setReceiptSearch] = useState('')
  const [foundSale, setFoundSale] = useState<{
    id: string
    receipt_number: string
    total_amount: number
    payment_method: string
  } | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const managerRole = role === 'owner' || role === 'manager'

  const loadRequests = useCallback(async () => listPendingReturns(db, branchId), [branchId, db])

  const refresh = useCallback(async () => {
    setBusy(true)
    setRequests(await loadRequests())
    setBusy(false)
  }, [loadRequests])

  useEffect(() => {
    let cancelled = false

    void loadRequests().then((nextRequests) => {
      if (cancelled) return
      setRequests(nextRequests)
      setBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadRequests])

  const onLookup = async () => {
    if (!receiptSearch.trim()) {
      setMessage('Enter a receipt number to search.')
      return
    }
    const sale = await lookupSaleByReceipt(db, receiptSearch)
    if (!sale) {
      setMessage('Receipt not found in local records.')
      setFoundSale(null)
      return
    }
    setFoundSale(sale)
    setMessage(`Found: ${sale.receipt_number}`)
  }

  const onCreateReturn = async () => {
    const result = await createReturnRequest({
      db,
      identity: { businessId, branchId, userId },
      originalSaleId: foundSale?.id ?? null,
      reasonCode: 'customer_changed_mind',
      reasonNote: foundSale
        ? `Return against ${foundSale.receipt_number}`
        : 'Return without receipt reference',
      details: {
        surface: 'mobile.returns_warranty',
        receipt_number: foundSale?.receipt_number ?? null,
      },
    })

    setMessage(result.ok ? 'Return request created locally.' : result.message)
    setFoundSale(null)
    setReceiptSearch('')
    await refresh()
  }

  const onResolve = async (requestId: string, status: 'approved' | 'declined') => {
    const result = await resolveReturnRequest({
      db,
      identity: { userId },
      requestId,
      status,
    })
    setMessage(result.ok ? `Return ${status}.` : result.message)
    await refresh()
  }

  if (!managerRole) {
    return (
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Returns and warranty desk
          </Text>
          <Text variant="titleMedium">Manager role required</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Return and warranty decisions are visible to owner and manager roles.
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
                Live Tier E returns desk
              </Text>
              <Text variant="titleMedium">Receipt lookup and return queue</Text>
            </View>
            <Button mode="outlined" compact disabled={busy} onPress={() => void refresh()}>
              Refresh
            </Button>
          </View>

          <TextInput
            mode="outlined"
            label="Receipt number"
            value={receiptSearch}
            onChangeText={setReceiptSearch}
            left={<TextInput.Icon icon="receipt" />}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button mode="contained-tonal" icon="magnify" onPress={() => void onLookup()}>
              Lookup
            </Button>
            {foundSale ? (
              <Button mode="contained" icon="undo" onPress={() => void onCreateReturn()}>
                Create return
              </Button>
            ) : null}
          </View>

          {foundSale ? (
            <Card mode="outlined">
              <Card.Content style={{ gap: 6 }}>
                <Text variant="titleSmall">{foundSale.receipt_number}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatMoney(foundSale.total_amount)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {foundSale.payment_method}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Pending returns
          </Text>

          {busy ? (
            <ActivityIndicator />
          ) : requests.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No pending return requests.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {requests.map((request) => (
                <Card key={request.id} mode="outlined">
                  <Card.Content style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleSmall">{formatReasonCode(request.reason_code)}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {secondsToTime(request.created_at)}
                          {request.reason_note ? ` · ${request.reason_note}` : ''}
                        </Text>
                      </View>
                      <Chip compact mode="flat">
                        {request.status}
                      </Chip>
                    </View>
                    {request.status === 'pending' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Button
                          mode="contained-tonal"
                          compact
                          onPress={() => void onResolve(request.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          mode="outlined"
                          compact
                          onPress={() => void onResolve(request.id, 'declined')}
                        >
                          Decline
                        </Button>
                      </View>
                    ) : null}
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Returns never mutate the original sale. Every return writes compensating rows with new
            operation IDs. Warranty claim metadata and compensating-sale schema are 0.9 phase.
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
// Tier E dispatcher
// ---------------------------------------------------------------------------

export function TierESurfaceControls({ surface }: { surface: MobileTierSurface }) {
  if (surface === 'mobile.hq_rollup') return <HqRollupControls />
  if (surface === 'mobile.self_service_kiosk') return <SelfServiceKioskControls />
  if (surface === 'mobile.returns_warranty') return <ReturnsWarrantyControls />

  return null
}
