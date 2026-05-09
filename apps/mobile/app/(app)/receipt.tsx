import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Divider, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import {
  APP_BRANDING_FOOTER,
  BIR_RECEIPT_FOOTER,
  BIR_RECEIPT_HEADER,
  BIR_RECEIPT_NOTE,
  formatMoney,
} from '@tdpos/shared'

export default function ReceiptScreen() {
  const theme = useAppTheme()
  const t = useT()
  const lastSaleResult = useCartStore((s) => s.lastSaleResult)
  const storeName = useAuthStore((s) => s.storeName) ?? 'TD POS Store'
  const storeAddress = useAuthStore((s) => s.storeAddress) ?? ''
  const tin = useAuthStore((s) => s.tin) ?? ''

  if (!lastSaleResult) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
          <Appbar.Content title={t('receipt.recorded')} color={theme.colors.onPrimary} />
        </Appbar.Header>
        <View style={{ padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleLarge">No recent sale</Text>
              <Text variant="bodyMedium">
                Complete a checkout from the Sale tab to see a receipt here.
              </Text>
              <Button mode="contained" onPress={() => router.replace('/(app)/(tabs)')}>
                {t('receipt.newSale')}
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    )
  }

  const created = new Date(lastSaleResult.createdAt)

  return (
    <View style={{ flex: 1, backgroundColor: theme.tdpos.teal[900] }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <Text variant="headlineMedium" style={{ color: '#ffffff' }}>
            {t('receipt.recorded')}
          </Text>
          <Text
            variant="displaySmall"
            style={{ color: '#ffffff', fontVariant: ['tabular-nums'] }}
            accessibilityLiveRegion="polite"
          >
            {formatMoney(lastSaleResult.total)}
          </Text>
          {lastSaleResult.change > 0 ? (
            <Text variant="titleMedium" style={{ color: theme.tdpos.amber[300] }}>
              {t('receipt.change')}: {formatMoney(lastSaleResult.change)}
            </Text>
          ) : null}
        </View>

        <Card mode="contained" style={{ backgroundColor: '#fffdf8' }}>
          <Card.Content style={{ gap: 8 }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text variant="labelSmall" style={{ fontFamily: 'monospace' }}>
                {BIR_RECEIPT_HEADER}
              </Text>
              <Text variant="titleMedium" style={{ fontFamily: 'monospace' }}>
                {storeName}
              </Text>
              {storeAddress ? (
                <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                  {storeAddress}
                </Text>
              ) : null}
              {tin ? (
                <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                  TIN: {tin}
                </Text>
              ) : null}
            </View>
            <Divider />
            <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
              Receipt: {lastSaleResult.receiptNumber}
            </Text>
            <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
              {created.toLocaleString('en-PH')}
            </Text>
            <Divider />
            {lastSaleResult.items.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text
                  variant="bodySmall"
                  style={{ fontFamily: 'monospace', flex: 1 }}
                  numberOfLines={1}
                >
                  {item.qty}× {item.name}
                  {item.wasSoldAs === 'pack' ? ' (pack)' : ''}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                >
                  {formatMoney(item.lineTotal)}
                </Text>
              </View>
            ))}
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="titleSmall" style={{ fontFamily: 'monospace' }}>
                TOTAL
              </Text>
              <Text
                variant="titleSmall"
                style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
              >
                {formatMoney(lastSaleResult.total)}
              </Text>
            </View>
            {lastSaleResult.paymentMethod === 'cash' ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                    Cash
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                  >
                    {formatMoney(lastSaleResult.tendered)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                    Change
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                  >
                    {formatMoney(lastSaleResult.change)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                  {lastSaleResult.paymentMethod.toUpperCase()}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                >
                  {formatMoney(lastSaleResult.total)}
                </Text>
              </View>
            )}
            <Divider />
            <Text variant="bodySmall" style={{ fontFamily: 'monospace', textAlign: 'center' }}>
              {BIR_RECEIPT_FOOTER}
            </Text>
            <Text
              variant="bodySmall"
              style={{ fontFamily: 'monospace', textAlign: 'center', fontStyle: 'italic' }}
            >
              {BIR_RECEIPT_NOTE}
            </Text>
            <Text
              variant="bodySmall"
              style={{ fontFamily: 'monospace', textAlign: 'center', opacity: 0.6 }}
            >
              {APP_BRANDING_FOOTER}
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => router.replace('/(app)/(tabs)')}
          buttonColor={theme.tdpos.amber[500]}
          textColor={theme.tdpos.ink[900]}
        >
          {t('receipt.newSale')}
        </Button>
      </ScrollView>
    </View>
  )
}
