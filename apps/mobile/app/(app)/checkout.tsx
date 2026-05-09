import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Snackbar, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { executeCheckout } from '@/features/sales/lib/execute-checkout'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { PaymentMethod } from '@tdpos/shared'
import { CASH_DENOMINATIONS, createClientOperationId, formatMoney } from '@tdpos/shared'

const PAYMENT_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash' },
  { method: 'gcash', label: 'GCash' },
]

export default function CheckoutScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
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
  const userId = useAuthStore((s) => s.userId)
  const businessId = useAuthStore((s) => s.businessId)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const change = paymentMethod === 'cash' && tendered >= total ? Math.max(0, tendered - total) : 0

  const onConfirm = async () => {
    if (submitting) return

    if (items.length === 0) {
      setError('Cart is empty')
      void haptics.error()
      return
    }
    if (paymentMethod === null) {
      setError('Pick a payment method')
      void haptics.error()
      return
    }
    if (paymentMethod === 'cash' && tendered < total) {
      setError('Tendered amount is less than total')
      void haptics.error()
      return
    }
    if (!branchId || !branchCode || !cashierCode) {
      setError('Device not configured. Sign out and re-pair.')
      void haptics.error()
      return
    }

    setSubmitting(true)
    void haptics.tapMedium()

    try {
      const result = await executeCheckout({
        db,
        clientOperationId: createClientOperationId(),
        cart: { items, total, tendered, paymentMethod, isUtang: false },
        device: { branchId, branchCode, cashierCode, userId, businessId },
      })

      if (!result.ok) {
        setError(`Checkout failed: ${result.reason}`)
        setSubmitting(false)
        void haptics.error()
        return
      }

      setLastSaleResult({
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        total: result.total,
        tendered: result.tendered,
        change: result.change,
        paymentMethod,
        isUtang: false,
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
      setError(err instanceof Error ? err.message : 'Checkout error')
      setSubmitting(false)
      void haptics.error()
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content title={t('checkout.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card mode="contained">
          <Card.Content>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
            <Text variant="displaySmall" style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(total)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {items.length} item(s)
            </Text>
          </Card.Content>
        </Card>

        <View style={{ gap: 8 }}>
          <Text variant="labelLarge">{t('checkout.paymentMethod')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAYMENT_METHODS.map(({ method, label }) => {
              const selected = paymentMethod === method
              return (
                <Pressable
                  key={method}
                  onPress={() => {
                    setPaymentMethod(method)
                    void haptics.selection()
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
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
          </View>
        </View>

        {paymentMethod === 'cash' && (
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
                  style={{ flexBasis: '22%' }}
                  compact
                >
                  {formatMoney(denom)}
                </Button>
              ))}
            </View>
            <Card mode="contained">
              <Card.Content style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyMedium">Tendered</Text>
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
          </View>
        )}

        <Button
          mode="contained"
          onPress={onConfirm}
          loading={submitting}
          disabled={
            submitting ||
            items.length === 0 ||
            paymentMethod === null ||
            (paymentMethod === 'cash' && tendered < total)
          }
          buttonColor={theme.tdpos.amber[500]}
          textColor={theme.tdpos.ink[900]}
        >
          {t('checkout.confirm')}
        </Button>
      </ScrollView>

      <Snackbar visible={error !== null} onDismiss={() => setError(null)} duration={4000}>
        {error ?? ''}
      </Snackbar>
    </View>
  )
}
