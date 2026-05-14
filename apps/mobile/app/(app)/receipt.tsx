// Receipt — the last impression after a sale. Polished for v0.9 visual QA:
// safe-area-aware docked footer, theme-token colors only, utang-aware
// header copy, accessibility live region on the success amount, and
// placeholder slots for the upcoming Print / Share affordances.

import { router } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Share, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  Portal,
  Snackbar,
  Surface,
  Text,
} from 'react-native-paper'
import { useState } from 'react'

import { useAppTheme } from '@/constants/theme'
import { formatThermalReceipt } from '@/features/receipts/lib/thermal-receipt'
import { executeVoidSale } from '@/features/sales/lib/execute-void-sale'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { printBleReceipt } from '@/services/thermal-printer'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import { useSettingsStore } from '@/stores/settings-store'
import {
  APP_BRANDING_FOOTER,
  BIR_RECEIPT_FOOTER,
  BIR_RECEIPT_HEADER,
  BIR_RECEIPT_NOTE,
  createClientOperationId,
  formatMoney,
} from '@tdpos/shared'

// BIR receipts are traditionally printed on cream-coloured paper. Keeping
// the digital preview cream signals "this is a receipt" at a glance even
// before the user reads the content. Single-sourced here so dark mode (or
// a future theme variant) can swap it without hunting through the file.
const RECEIPT_PAPER_BG = '#fffdf8'
const MANAGER_ROLES = new Set(['owner', 'manager'])

function formatReceiptAmount(value: number) {
  if (value < 0) return `-${formatMoney(Math.abs(value))}`
  return formatMoney(value)
}

type Translate = ReturnType<typeof useT>

function describeVoidFailure(reason: string, t: Translate): string {
  switch (reason) {
    case 'missing_device_identity':
      return t('receipt.voidReasonDeviceUnpaired')
    case 'sale_not_found':
      return t('receipt.voidReasonSaleNotFound')
    case 'already_voided':
      return t('receipt.voidReasonAlreadyVoided')
    case 'void_window_closed':
      return t('receipt.voidReasonWindowClosed')
    case 'no_sale_items':
      return t('receipt.voidReasonNoItems')
    default:
      return `Void could not complete (${reason}). Try again or call support.`
  }
}

export default function ReceiptScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets()
  const db = useSQLiteContext()
  const lastSaleResult = useCartStore((s) => s.lastSaleResult)
  const setLastSaleResult = useCartStore((s) => s.setLastSaleResult)
  const branchId = useAuthStore((s) => s.branchId)
  const branchCode = useAuthStore((s) => s.branchCode)
  const cashierCode = useAuthStore((s) => s.cashierCode)
  const userId = useAuthStore((s) => s.userId)
  const role = useAuthStore((s) => s.role)
  const storeName = useAuthStore((s) => s.storeName) ?? 'TD POS Store'
  const storeAddress = useAuthStore((s) => s.storeAddress) ?? ''
  const tin = useAuthStore((s) => s.tin) ?? ''
  const selectedPrinter = useSettingsStore((s) => s.selectedThermalPrinter)

  const [snackbar, setSnackbar] = useState<{
    message: string
    action?: { label: string; onPress: () => void }
  } | null>(null)
  const [voidDialogVisible, setVoidDialogVisible] = useState(false)
  const [voidSubmitting, setVoidSubmitting] = useState(false)
  const [printSubmitting, setPrintSubmitting] = useState(false)

  if (!lastSaleResult) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
          <Appbar.BackAction
            color={theme.colors.onPrimary}
            onPress={() => router.replace('/(app)/(tabs)')}
            accessibilityLabel={t('receipt.backToSaleA11y')}
          />
          <Appbar.Content title={t('receipt.recorded')} color={theme.colors.onPrimary} />
        </Appbar.Header>
        <View style={{ padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleLarge">{t('receipt.noRecentTitle')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('receipt.noRecentBody')}
              </Text>
              <Button
                mode="contained"
                icon="cart-outline"
                onPress={() => {
                  void haptics.tapLight()
                  router.replace('/(app)/(tabs)')
                }}
                accessibilityLabel={t('receipt.backToSaleA11y')}
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
  const isVoid = lastSaleResult.status === 'voided'
  const displayTotal = Math.abs(lastSaleResult.total)
  const isCash = lastSaleResult.paymentMethod === 'cash' && !isUtang
  const canVoid = !isVoid && role !== null && MANAGER_ROLES.has(role)
  const successAccessibilityLabel = isUtang
    ? `Utang recorded, ${formatMoney(displayTotal)}`
    : isVoid
      ? `Sale voided, ${formatMoney(displayTotal)}`
      : `Sale recorded, ${formatMoney(displayTotal)}`

  const handleShare = async () => {
    void haptics.tapLight()
    try {
      const lines = [
        `${storeName} — Provisional receipt`,
        ...(isVoid && lastSaleResult.voidedOriginalReceiptNumber
          ? [`VOID — refers to ${lastSaleResult.voidedOriginalReceiptNumber}`]
          : []),
        `#${lastSaleResult.receiptNumber}`,
        ...lastSaleResult.items.map(
          (item) =>
            `${item.qty}× ${item.name}${item.wasSoldAs === 'pack' ? ' (pack)' : ''} — ${formatReceiptAmount(item.lineTotal)}`,
        ),
        `Total: ${formatReceiptAmount(lastSaleResult.total)}`,
        isVoid
          ? t('receipt.voidCompensating')
          : isUtang
            ? t('receipt.chargedToUtang')
            : `Paid: ${lastSaleResult.paymentMethod.toUpperCase()}`,
        APP_BRANDING_FOOTER,
      ]
      await Share.share({ message: lines.join('\n') })
    } catch {
      setSnackbar({ message: t('receipt.shareFailed') })
    }
  }

  const handlePrint = async () => {
    if (printSubmitting) return
    if (!selectedPrinter) {
      setSnackbar({
        message: t('receipt.printNoPrinter'),
        action: {
          label: t('receipt.printNoPrinterAction'),
          onPress: () => router.push('/(app)/printer-settings'),
        },
      })
      void haptics.error()
      return
    }

    setPrintSubmitting(true)
    void haptics.tapMedium()
    const result = await printBleReceipt({
      printer: selectedPrinter,
      receiptText: formatThermalReceipt({
        storeName,
        storeAddress,
        tin,
        receiptNumber: lastSaleResult.receiptNumber,
        status: lastSaleResult.status,
        voidedOriginalReceiptNumber: lastSaleResult.voidedOriginalReceiptNumber,
        total: lastSaleResult.total,
        tendered: lastSaleResult.tendered,
        change: lastSaleResult.change,
        paymentMethod: lastSaleResult.paymentMethod,
        isUtang: lastSaleResult.isUtang,
        items: lastSaleResult.items,
        createdAt: lastSaleResult.createdAt,
      }),
    })
    setPrintSubmitting(false)

    if (result.ok) {
      setSnackbar({ message: t('receipt.printSent') })
      void haptics.success()
    } else {
      setSnackbar({
        message: `${result.message} Receipt remains visible on-screen.`,
        action: {
          label: t('receipt.printFailedAction'),
          onPress: () => router.push('/(app)/printer-settings'),
        },
      })
      void haptics.error()
    }
  }

  const handleVoidSale = async () => {
    if (!lastSaleResult || voidSubmitting) return
    if (!branchId || !branchCode || !cashierCode) {
      setSnackbar({
        message: t('receipt.voidMissingDevice'),
        action: {
          label: t('receipt.voidMissingDeviceAction'),
          onPress: () => router.push('/(app)/device-pairing'),
        },
      })
      void haptics.error()
      return
    }

    setVoidSubmitting(true)
    try {
      const result = await executeVoidSale({
        db,
        clientOperationId: createClientOperationId(),
        originalSaleId: lastSaleResult.saleId,
        branchId,
        branchCode,
        cashierCode,
        userId,
        reason: 'customer_cancelled',
      })

      if (!result.ok) {
        setSnackbar({ message: describeVoidFailure(result.reason, t) })
        void haptics.error()
        return
      }

      setLastSaleResult({
        ...lastSaleResult,
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        status: 'voided',
        voidedOriginalReceiptNumber: result.originalReceiptNumber,
        total: result.total,
        tendered: 0,
        change: 0,
        items: lastSaleResult.items.map((item) => ({
          ...item,
          lineTotal: -Math.abs(item.lineTotal),
        })),
        createdAt: result.createdAt * 1000,
      })
      setVoidDialogVisible(false)
      setSnackbar({ message: t('receipt.voidSuccess') })
      void haptics.success()
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : t('receipt.voidFailed'),
      })
      void haptics.error()
    } finally {
      setVoidSubmitting(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.tdpos.teal[900] }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 132 + insets.bottom }}
      >
        {/* Celebratory header — the moment the cashier just landed a sale */}
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          {isVoid ? (
            <Chip
              mode="flat"
              compact
              style={{ backgroundColor: theme.colors.errorContainer }}
              textStyle={{ color: theme.colors.onErrorContainer, fontWeight: '700' }}
            >
              VOID · Compensating entry
            </Chip>
          ) : isUtang ? (
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
            {isVoid
              ? t('receipt.voided')
              : isUtang
                ? t('receipt.utangRecorded')
                : t('receipt.recorded')}
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
            {isVoid ? `-${formatMoney(displayTotal)}` : formatMoney(displayTotal)}
          </Text>
          {!isVoid && !isUtang && lastSaleResult.change > 0 ? (
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
            {isVoid && lastSaleResult.voidedOriginalReceiptNumber ? (
              <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                {t('receipt.voidedRef')}: {lastSaleResult.voidedOriginalReceiptNumber}
              </Text>
            ) : null}
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
                  {formatReceiptAmount(item.lineTotal)}
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
                {formatReceiptAmount(lastSaleResult.total)}
              </Text>
            </View>
            {isVoid ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                  VOID
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ fontFamily: 'monospace', fontVariant: ['tabular-nums'] }}
                >
                  {formatReceiptAmount(lastSaleResult.total)}
                </Text>
              </View>
            ) : isUtang ? (
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

      {/* Docked footer — Print is wired, while physical printer proof remains
          part of the 0.9 hardware pass. Share + New sale are live fallbacks. */}
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
            onPress={handlePrint}
            loading={printSubmitting}
            disabled={printSubmitting}
            style={{ flex: 1 }}
            accessibilityLabel={t('receipt.printA11y')}
            accessibilityHint="Send to selected Bluetooth receipt printer"
          >
            Print
          </Button>
          <Button
            mode="outlined"
            icon="share-variant-outline"
            onPress={handleShare}
            style={{ flex: 1 }}
            accessibilityLabel={t('receipt.shareA11y')}
            accessibilityHint="Share via SMS, email, or messaging app"
          >
            Share
          </Button>
        </View>
        {canVoid ? (
          <Button
            mode="outlined"
            icon="backup-restore"
            onPress={() => {
              void haptics.tapMedium()
              setVoidDialogVisible(true)
            }}
            loading={voidSubmitting}
            disabled={voidSubmitting}
            accessibilityLabel={t('receipt.voidA11y')}
          >
            {t('receipt.voidSale')}
          </Button>
        ) : null}
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
          accessibilityLabel={t('receipt.newSaleA11y')}
        >
          {t('receipt.newSale')}
        </Button>
      </Surface>

      <Portal>
        <Dialog visible={voidDialogVisible} onDismiss={() => setVoidDialogVisible(false)}>
          <Dialog.Title>{t('receipt.voidConfirmTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('receipt.voidConfirmBody')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={voidSubmitting} onPress={() => setVoidDialogVisible(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button loading={voidSubmitting} disabled={voidSubmitting} onPress={handleVoidSale}>
              {t('receipt.voidSale')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar !== null}
        onDismiss={() => setSnackbar(null)}
        duration={3500}
        action={
          snackbar?.action
            ? {
                label: snackbar.action.label,
                onPress: () => {
                  snackbar.action?.onPress()
                  setSnackbar(null)
                },
              }
            : undefined
        }
      >
        {snackbar?.message ?? ''}
      </Snackbar>
    </View>
  )
}
