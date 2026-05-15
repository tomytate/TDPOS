// Checkout — every sale converges here. Polished for v0.9 visual QA:
// docked footer with total + confirm button (safe-area aware), inline cart
// item summary so the cashier can verify before charging, cashier-facing
// error copy (no raw enum strings), Paper MD3 components throughout,
// theme-token colors only. Accessibility labels + hints on every primary
// affordance.

import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, HelperText, Snackbar, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import type { CartItem } from '@/stores/cart-store'
import { executeCheckout } from '@/features/sales/lib/execute-checkout'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { startPerformanceTimer } from '@/services/performance-metrics'
import { storage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { PaymentMethod } from '@tdpos/shared'
import { CASH_DENOMINATIONS, createClientOperationId, formatMoney } from '@tdpos/shared'

const PAYMENT_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash' },
  { method: 'gcash', label: 'GCash' },
]

// Maps the executeCheckout failure reasons to cashier-facing copy. The
// underlying enum values are stable contract; copy lives here so the wording
// stays consistent across receipt errors + retry flows.
type Translate = ReturnType<typeof useT>

function describeCheckoutFailure(reason: string, t: Translate): string {
  switch (reason) {
    case 'insufficient_stock':
      return t('checkout.failure.insufficientStock')
    case 'empty_cart':
      return t('checkout.failure.cartEmpty')
    case 'invalid_tendered':
      return t('checkout.failure.tenderShort')
    case 'missing_device_identity':
      return t('checkout.failure.deviceUnpaired')
    case 'clock_skew_detected':
      return t('checkout.failure.clockSkew')
    default:
      return `Checkout could not complete (${reason}). Try again or call support.`
  }
}

function pluralItems(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`
}

function CartLineRow({ item }: { item: CartItem }) {
  const theme = useAppTheme()
  const unitNoun =
    item.wasSoldAs === 'pack'
      ? item.qty === 1
        ? 'pack'
        : 'packs'
      : item.qty === 1
        ? 'piece'
        : 'pieces'

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomColor: theme.colors.outlineVariant,
        borderBottomWidth: 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {item.qty} {unitNoun} @ {formatMoney(item.unitPrice)}
        </Text>
      </View>
      <Text variant="titleSmall" style={{ fontVariant: ['tabular-nums'] }}>
        {formatMoney(item.lineTotal)}
      </Text>
    </View>
  )
}

export default function CheckoutScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets()
  const db = useSQLiteContext()

  const items = useCartStore((s) => s.items)
  const tendered = useCartStore((s) => s.tendered)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const setTendered = useCartStore((s) => s.setTendered)
  const setLastSaleResult = useCartStore((s) => s.setLastSaleResult)
  const clearCart = useCartStore((s) => s.clear)

  const branchId = useAuthStore((s) => s.branchId)
  const branchCode = useAuthStore((s) => s.branchCode)
  const cashierCode = useAuthStore((s) => s.cashierCode)
  const devicePairingStatus = useAuthStore((s) => s.devicePairingStatus)
  const userId = useAuthStore((s) => s.userId)
  const businessId = useAuthStore((s) => s.businessId)
  const modules = useAuthStore((s) => s.modules)
  const lastServerHandshakeAt = useAuthStore((s) => s.lastServerHandshakeAt)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUtangPayment, setIsUtangPayment] = useState(false)

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const change = paymentMethod === 'cash' && tendered >= total ? Math.max(0, tendered - total) : 0
  const itemCount = items.length
  const pieceCount = items.reduce(
    (sum, item) => sum + item.qty * (item.wasSoldAs === 'pack' ? item.piecesPerPack : 1),
    0,
  )

  const cashShort = paymentMethod === 'cash' && !isUtangPayment && tendered < total
  const deviceReady = Boolean(
    branchId && branchCode && cashierCode && devicePairingStatus === 'paired',
  )
  const confirmDisabled =
    submitting ||
    items.length === 0 ||
    !deviceReady ||
    (!isUtangPayment && paymentMethod === null) ||
    (!isUtangPayment && paymentMethod === 'cash' && tendered < total)

  const onConfirm = async () => {
    if (submitting) return
    void haptics.tapMedium()

    if (items.length === 0) {
      setError(t('checkout.cartEmptyError'))
      void haptics.error()
      return
    }
    if (!isUtangPayment && paymentMethod === null) {
      setError(t('checkout.pickPayment'))
      void haptics.error()
      return
    }
    if (!isUtangPayment && paymentMethod === 'cash' && tendered < total) {
      setError(t('checkout.shortError'))
      void haptics.error()
      return
    }
    if (!deviceReady) {
      setError(t('checkout.deviceUnpairedError'))
      void haptics.error()
      return
    }
    const checkoutPaymentMethod: PaymentMethod = isUtangPayment ? 'cash' : paymentMethod!

    setSubmitting(true)

    try {
      const stopCheckoutTimer = startPerformanceTimer('checkout_commit_ms', storage)
      const result = await executeCheckout({
        db,
        clientOperationId: createClientOperationId(),
        cart: {
          items,
          total,
          tendered: isUtangPayment ? 0 : tendered,
          paymentMethod: checkoutPaymentMethod,
          isUtang: isUtangPayment,
        },
        device: {
          branchId: branchId!,
          branchCode: branchCode!,
          cashierCode: cashierCode!,
          userId,
          businessId,
        },
        lastServerHandshakeAt,
      })
      stopCheckoutTimer()

      if (!result.ok) {
        setError(describeCheckoutFailure(result.reason, t))
        setSubmitting(false)
        void haptics.error()
        return
      }

      setLastSaleResult({
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        status: 'completed',
        voidedOriginalReceiptNumber: null,
        total: result.total,
        tendered: result.tendered,
        change: result.change,
        paymentMethod: checkoutPaymentMethod,
        isUtang: isUtangPayment,
        items: items.map((item) => ({
          name: item.name,
          qty: item.qty,
          wasSoldAs: item.wasSoldAs,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        createdAt: result.createdAt * 1000,
      })

      clearCart()
      void haptics.success()
      router.replace('/(app)/receipt')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failureFallback'))
      setSubmitting(false)
      void haptics.error()
    }
  }

  // Reserve space at the bottom of the ScrollView for the docked footer.
  // Footer height ≈ 116 (title + confirm button + own padding), plus
  // bottom safe-area inset for iPhone home-indicator clearance.
  const footerReserve = 116 + insets.bottom

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel={t('checkout.backToCart')}
        />
        <Appbar.Content title={t('checkout.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: footerReserve + 12 }}
      >
        {/* Cart summary — every line so the cashier can verify before charging */}
        {!deviceReady ? (
          <Card mode="contained" style={{ backgroundColor: theme.colors.errorContainer }}>
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer }}>
                {t('checkout.devicePairedTitle')}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
                {t('checkout.devicePairedBody')}
              </Text>
              <Button
                mode="contained"
                icon="cellphone-link"
                onPress={() => router.push('/(app)/device-pairing')}
                accessibilityLabel={t('checkout.openDevicePairing')}
              >
                {t('checkout.pairDevice')}
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('checkout.cart')} · {pluralItems(itemCount)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {pieceCount}{' '}
                {pieceCount === 1 ? t('sale.pieces').replace(/s$/, '') : t('sale.pieces')}
              </Text>
            </View>
            {items.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('checkout.cartEmpty')}
              </Text>
            ) : (
              <View style={{ gap: 2 }}>
                {items.map((item, idx) => (
                  <CartLineRow key={`${item.productId}-${item.wasSoldAs}-${idx}`} item={item} />
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Payment method picker */}
        <View style={{ gap: 8 }}>
          <Text variant="labelLarge">{t('checkout.paymentMethod')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAYMENT_METHODS.map(({ method, label }) => {
              const selected = !isUtangPayment && paymentMethod === method
              return (
                <Pressable
                  key={method}
                  onPress={() => {
                    setIsUtangPayment(false)
                    setPaymentMethod(method)
                    void haptics.selection()
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
                  accessibilityHint={`Pay with ${label}`}
                  style={({ pressed }) => ({
                    flex: 1,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Card
                    mode={selected ? 'contained' : 'outlined'}
                    style={
                      selected ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined
                    }
                  >
                    <Card.Content>
                      <Text variant="titleMedium">{label}</Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              )
            })}
            {modules.utang ? (
              <Pressable
                onPress={() => {
                  setIsUtangPayment(true)
                  setPaymentMethod('cash')
                  setTendered(0)
                  void haptics.selection()
                }}
                accessibilityRole="button"
                accessibilityLabel={`Utang${isUtangPayment ? ', selected' : ''}`}
                accessibilityHint="Record a credit sale (paid later)"
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Card
                  mode={isUtangPayment ? 'contained' : 'outlined'}
                  style={
                    isUtangPayment
                      ? { borderColor: theme.tdpos.amber[500], borderWidth: 2 }
                      : undefined
                  }
                >
                  <Card.Content>
                    <Text variant="titleMedium">{t('checkout.utang')}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('checkout.utangSubtitle')}
                    </Text>
                  </Card.Content>
                </Card>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Cash tendered + change */}
        {paymentMethod === 'cash' && !isUtangPayment && (
          <View style={{ gap: 8 }}>
            <Text variant="labelLarge">{t('checkout.cashTendered')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CASH_DENOMINATIONS.map((denom) => (
                <Button
                  key={denom}
                  mode={tendered === denom ? 'contained' : 'outlined'}
                  onPress={() => {
                    setTendered(denom)
                    void haptics.selection()
                  }}
                  style={{ flexBasis: '22%', flexGrow: 1, minWidth: 72 }}
                  contentStyle={{ minHeight: 48 }}
                  accessibilityLabel={`Tender ${formatMoney(denom)}`}
                >
                  {formatMoney(denom)}
                </Button>
              ))}
            </View>
            {total > 0 ? (
              <Button
                mode="contained-tonal"
                icon="cash-check"
                onPress={() => {
                  setTendered(total)
                  void haptics.selection()
                }}
                accessibilityLabel={`${t('checkout.exact')} · ${formatMoney(total)}`}
              >
                {t('checkout.exact')} · {formatMoney(total)}
              </Button>
            ) : null}
            <Card mode="contained">
              <Card.Content style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyMedium">{t('checkout.tendered')}</Text>
                  <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatMoney(tendered)}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                  accessibilityLiveRegion="assertive"
                >
                  <Text variant="titleMedium">{t('checkout.changeDue')}</Text>
                  <Text
                    variant="titleMedium"
                    style={{
                      fontVariant: ['tabular-nums'],
                      color:
                        tendered >= total
                          ? theme.tdpos.semantic.green600
                          : theme.tdpos.semantic.red500,
                    }}
                  >
                    {formatMoney(change)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            {cashShort ? (
              <HelperText type="error" visible>
                {t('checkout.shortBy')} {formatMoney(total - tendered)}. {t('checkout.shortByHint')}
              </HelperText>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Docked footer — total + primary CTA always visible. Safe-area
          inset on the bottom keeps the button clear of the iPhone home
          indicator and the system tab bar. */}
      <Surface
        mode="elevated"
        elevation={4}
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          gap: 8,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {isUtangPayment ? t('checkout.chargeToUtang') : t('checkout.total')}
          </Text>
          <Text
            variant="displaySmall"
            style={{ fontVariant: ['tabular-nums'], color: theme.colors.onSurface }}
          >
            {formatMoney(total)}
          </Text>
        </View>
        <Button
          mode="contained"
          icon={isUtangPayment ? 'notebook-edit-outline' : 'cash-register'}
          onPress={onConfirm}
          loading={submitting}
          disabled={confirmDisabled}
          buttonColor={theme.tdpos.amber[500]}
          textColor={theme.tdpos.ink[900]}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700' }}
          accessibilityLabel={`${t('checkout.confirm')}, ${formatMoney(total)}`}
          accessibilityHint={
            isUtangPayment ? t('checkout.confirmHintUtang') : t('checkout.confirmHintCash')
          }
        >
          {t('checkout.confirm')}
        </Button>
      </Surface>

      <Snackbar visible={error !== null} onDismiss={() => setError(null)} duration={4500}>
        {error ?? ''}
      </Snackbar>
    </View>
  )
}
