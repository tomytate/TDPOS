// Receipt — the last impression after a sale. Polished for v0.9 visual QA:
// safe-area-aware docked footer, theme-token colors only, utang-aware
// header copy, accessibility live region on the success amount, and
// placeholder slots for the upcoming Print / Share affordances.

import { router } from 'expo-router'
import { Share, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Divider, Snackbar, Surface, Text } from 'react-native-paper'
import { useState } from 'react'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
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

// BIR receipts are traditionally printed on cream-coloured paper. Keeping
// the digital preview cream signals "this is a receipt" at a glance even
// before the user reads the content. Single-sourced here so dark mode (or
// a future theme variant) can swap it without hunting through the file.
const RECEIPT_PAPER_BG = '#fffdf8'

export default function ReceiptScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets()
  const lastSaleResult = useCartStore((s) => s.lastSaleResult)
  const storeName = useAuthStore((s) => s.storeName) ?? 'TD POS Store'
  const storeAddress = useAuthStore((s) => s.storeAddress) ?? ''
  const tin = useAuthStore((s) => s.tin) ?? ''

  const [snackbar, setSnackbar] = useState<string | null>(null)

  if (!lastSaleResult) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
          <Appbar.BackAction
            color={theme.colors.onPrimary}
            onPress={() => router.replace('/(app)/(tabs)')}
            accessibilityLabel="Back to sale"
          />
          <Appbar.Content title={t('receipt.recorded')} color={theme.colors.onPrimary} />
        </Appbar.Header>
        <View style={{ padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleLarge">No recent sale</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Complete a checkout from the Sale tab to see a receipt here.
              </Text>
              <Button
                mode="contained"
                icon="cart-outline"
                onPress={() => {
                  void haptics.tapLight()
                  router.replace('/(app)/(tabs)')
                }}
                accessibilityLabel="Back to Sale tab"
              >
                {t('receipt.newSale')}
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    )
  }

  const created = new Date(lastSaleResult.createdAt)
  const isUtang = lastSaleResult.isUtang
  const isCash = lastSaleResult.paymentMethod === 'cash' && !isUtang
  const successAccessibilityLabel = isUtang
    ? `Utang recorded, ${formatMoney(lastSaleResult.total)}`
    : `Sale recorded, ${formatMoney(lastSaleResult.total)}`

  const handleShare = async () => {
    void haptics.tapLight()
    try {
      const lines = [
        `${storeName} — Provisional receipt`,
        `#${lastSaleResult.receiptNumber}`,
        ...lastSaleResult.items.map(
          (item) =>
            `${item.qty}× ${item.name}${item.wasSoldAs === 'pack' ? ' (pack)' : ''} — ${formatMoney(item.lineTotal)}`,
        ),
        `Total: ${formatMoney(lastSaleResult.total)}`,
        isUtang ? 'Charged to utang' : `Paid: ${lastSaleResult.paymentMethod.toUpperCase()}`,
        APP_BRANDING_FOOTER,
      ]
      await Share.share({ message: lines.join('\n') })
    } catch {
      setSnackbar('Could not open share sheet.')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.tdpos.teal[900] }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 132 + insets.bottom }}
      >
        {/* Celebratory header — the moment the cashier just landed a sale */}
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          {isUtang ? (
            <Chip
              mode="flat"
              compact
              style={{ backgroundColor: theme.tdpos.amber[500] }}
              textStyle={{ color: theme.tdpos.ink[900], fontWeight: '700' }}
            >
              Utang · Credit sale
            </Chip>
          ) : null}
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimary }}>
            {isUtang ? 'Utang recorded' : t('receipt.recorded')}
          </Text>
          <Text
            variant="displaySmall"
            style={{
              color: theme.colors.onPrimary,
              fontVariant: ['tabular-nums'],
              fontWeight: '700',
            }}
            accessibilityLiveRegion="polite"
            accessibilityLabel={successAccessibilityLabel}
          >
            {formatMoney(lastSaleResult.total)}
          </Text>
          {!isUtang && lastSaleResult.change > 0 ? (
            <Text variant="titleMedium" style={{ color: theme.tdpos.amber[300] }}>
              {t('receipt.change')}: {formatMoney(lastSaleResult.change)}
            </Text>
          ) : null}
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onPrimary, opacity: 0.75, marginTop: 4 }}
          >
            #{lastSaleResult.receiptNumber}
          </Text>
        </View>

        {/* Paper preview — cream background mimics a BIR-ready printout */}
        <Card mode="contained" style={{ backgroundColor: RECEIPT_PAPER_BG }}>
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
            {isUtang ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                  UTANG (credit)
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                >
                  {formatMoney(lastSaleResult.total)}
                </Text>
              </View>
            ) : isCash ? (
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
      </ScrollView>

      {/* Docked footer — Print is a placeholder until @haroldtran/react-
          native-thermal-printer wiring lands; Share + New sale are live. */}
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            mode="outlined"
            icon="printer-outline"
            onPress={() => setSnackbar('Receipt printing arrives with the thermal-printer pair.')}
            disabled={false}
            style={{ flex: 1 }}
            accessibilityLabel="Print receipt"
            accessibilityHint="Send to paired thermal printer (coming soon)"
          >
            Print
          </Button>
          <Button
            mode="outlined"
            icon="share-variant-outline"
            onPress={handleShare}
            style={{ flex: 1 }}
            accessibilityLabel="Share receipt"
            accessibilityHint="Share via SMS, email, or messaging app"
          >
            Share
          </Button>
        </View>
        <Button
          mode="contained"
          icon="cart-outline"
          onPress={() => {
            void haptics.tapLight()
            router.replace('/(app)/(tabs)')
          }}
          buttonColor={theme.tdpos.amber[500]}
          textColor={theme.tdpos.ink[900]}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700' }}
          accessibilityLabel="Start a new sale"
        >
          {t('receipt.newSale')}
        </Button>
      </Surface>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3500}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  )
}
