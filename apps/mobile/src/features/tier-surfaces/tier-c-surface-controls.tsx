import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Button, Card, Chip, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import {
  createApprovalRequest,
  listPendingApprovals,
  resolveApprovalRequest,
  type LocalManagerApprovalRequest,
} from '@/features/approvals/lib/manager-approvals'
import { useProducts } from '@/features/products/hooks/use-products'
import type { MobileTierSurface } from '@/features/tier-surfaces/surface-scaffolds'
import { useHaptics } from '@/hooks/use-haptics'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { DbProduct } from '@tdpos/db'
import { formatMoney } from '@tdpos/shared'

function secondsToTime(value: number | null | undefined): string {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRequestType(value: string) {
  return value.replaceAll('_', ' ')
}

function FastItemButton({ product }: { product: DbProduct }) {
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
    <Button
      mode={lowStock ? 'outlined' : 'contained-tonal'}
      compact
      onPress={add}
      style={{ minWidth: 132 }}
      textColor={lowStock ? theme.colors.error : undefined}
    >
      {product.name} · {formatMoney(product.price_per_piece)}
    </Button>
  )
}

function ConvenienceCounterControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const businessId = useAuthStore((state) => state.businessId)
  const branchId = useAuthStore((state) => state.branchId)
  const userId = useAuthStore((state) => state.userId)
  const items = useCartStore((state) => state.items)
  const { data: products = [], isPending } = useProducts()
  const [message, setMessage] = useState<string | null>(null)
  const visibleProducts = products.slice(0, 10)
  const cartTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const requestOverride = async (product: DbProduct | undefined) => {
    const result = await createApprovalRequest({
      db,
      identity: { businessId, branchId, userId },
      requestType: 'price_override',
      reason: product ? `Counter override for ${product.name}` : 'Counter override request',
      details: {
        surface: 'mobile.convenience_counter',
        productId: product?.id ?? null,
        productName: product?.name ?? null,
      },
    })

    setMessage(result.ok ? 'Manager approval queued locally.' : result.message)
  }

  return (
    <>
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Live Tier C convenience counter
            </Text>
            <Text variant="titleMedium">Fast repeat items and manager approval queue</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip compact>High velocity</Chip>
            <Chip compact mode="outlined">
              {items.length} cart lines
            </Chip>
            <Chip compact mode="outlined">
              {formatMoney(cartTotal)}
            </Chip>
          </View>

          {isPending ? (
            <ActivityIndicator />
          ) : visibleProducts.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No active products available for fast-counter controls.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {visibleProducts.map((product) => (
                <FastItemButton key={product.id} product={product} />
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
            <Button
              mode="outlined"
              icon="account-check-outline"
              onPress={() => void requestOverride(visibleProducts[0])}
            >
              Queue override
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </>
  )
}

function ApprovalRow({
  request,
  onResolve,
}: {
  request: LocalManagerApprovalRequest
  onResolve: (requestId: string, status: 'approved' | 'declined') => void
}) {
  const theme = useAppTheme()
  return (
    <Card mode="outlined">
      <Card.Content style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">{formatRequestType(request.request_type)}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {secondsToTime(request.created_at)} · {request.reason ?? 'No reason recorded'}
            </Text>
          </View>
          <Chip compact mode="flat">
            {request.status}
          </Chip>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button mode="contained-tonal" compact onPress={() => onResolve(request.id, 'approved')}>
            Approve
          </Button>
          <Button mode="outlined" compact onPress={() => onResolve(request.id, 'declined')}>
            Decline
          </Button>
        </View>
      </Card.Content>
    </Card>
  )
}

function ManagerPhoneControls() {
  const db = useSQLiteContext()
  const theme = useAppTheme()
  const branchId = useAuthStore((state) => state.branchId)
  const userId = useAuthStore((state) => state.userId)
  const role = useAuthStore((state) => state.role)
  const [requests, setRequests] = useState<LocalManagerApprovalRequest[]>([])
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const managerRole = role === 'owner' || role === 'manager'

  const loadRequests = useCallback(async () => listPendingApprovals(db, branchId), [branchId, db])

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

  const onResolve = async (requestId: string, status: 'approved' | 'declined') => {
    const result = await resolveApprovalRequest({
      db,
      identity: { userId },
      requestId,
      status,
    })
    setMessage(result.ok ? `Request ${status}.` : result.message)
    await refresh()
  }

  if (!managerRole) {
    return (
      <Card mode="contained" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Manager phone approvals
          </Text>
          <Text variant="titleMedium">Manager role required</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Approval decisions are visible to owner and manager roles.
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
                Live Tier C approval inbox
              </Text>
              <Text variant="titleMedium">Pending local manager decisions</Text>
            </View>
            <Button mode="outlined" compact disabled={busy} onPress={() => void refresh()}>
              Refresh
            </Button>
          </View>

          {busy ? (
            <ActivityIndicator />
          ) : requests.length === 0 ? (
            <Card mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No pending local approval requests.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {requests.map((request) => (
                <ApprovalRow key={request.id} request={request} onResolve={onResolve} />
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </>
  )
}

export function TierCSurfaceControls({ surface }: { surface: MobileTierSurface }) {
  if (surface === 'mobile.convenience_counter') return <ConvenienceCounterControls />
  if (surface === 'mobile.manager_phone') return <ManagerPhoneControls />

  return null
}
