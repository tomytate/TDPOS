// Barcode scanner - Tier A cashier scaffold.
// Uses Expo CameraView, local SQLite SKU lookup, and the existing cart store
// so scans follow the same checkout/inventory path as product-tile taps.
// EN + TL parity via `useT()` so the cashier sees their language end-to-end.

import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { useSQLiteContext } from 'expo-sqlite'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useCartStore } from '@/stores/cart-store'
import type { DbProduct } from '@tdpos/db'
import { formatMoney } from '@tdpos/shared'

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93'] as const

type ScanResult =
  | { kind: 'idle' }
  | { kind: 'found'; code: string; productName: string; price: number }
  | { kind: 'missing'; code: string }
  | { kind: 'out_of_stock'; code: string; productName: string }
  | { kind: 'error'; code: string }

export default function ScannerScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const t = useT()
  const db = useSQLiteContext()
  const addItem = useCartStore((state) => state.addItem)
  const [permission, requestPermission] = useCameraPermissions()
  const [scanLocked, setScanLocked] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult>({ kind: 'idle' })

  const goToSale = () => {
    void haptics.tapLight()
    router.replace('/(app)/(tabs)')
  }

  const requestCamera = () => {
    void haptics.tapLight()
    void requestPermission()
  }

  const resetScanner = () => {
    void haptics.selection()
    setScanResult({ kind: 'idle' })
    setScanLocked(false)
  }

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    const code = data.trim()
    if (scanLocked || code.length === 0) return

    setScanLocked(true)

    try {
      const product = await db.getFirstAsync<DbProduct>(
        `
          SELECT *
          FROM products
          WHERE is_active = 1
            AND (sku = ? OR id = ?)
          LIMIT 1
        `,
        [code, code],
      )

      if (!product) {
        setScanResult({ kind: 'missing', code })
        void haptics.error()
        return
      }

      if (product.stock_pieces <= 0) {
        setScanResult({ kind: 'out_of_stock', code, productName: product.name })
        void haptics.error()
        return
      }

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
      setScanResult({
        kind: 'found',
        code,
        productName: product.name,
        price: product.price_per_piece,
      })
      void haptics.success()
    } catch {
      setScanResult({ kind: 'error', code })
      void haptics.error()
    }
  }

  const canScan = permission?.granted === true

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title={t('scanner.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      {canScan ? (
        <View style={{ flex: 1 }}>
          <View
            style={{
              aspectRatio: 3 / 4,
              backgroundColor: theme.tdpos.ink[900],
              margin: 16,
              overflow: 'hidden',
              borderRadius: 8,
            }}
          >
            <CameraView
              active={!scanLocked}
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              facing="back"
              onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
              style={{ flex: 1 }}
            />
            <View
              pointerEvents="none"
              style={{
                borderColor: theme.tdpos.amber[400],
                borderRadius: 8,
                borderWidth: 2,
                height: 128,
                left: '12%',
                position: 'absolute',
                right: '12%',
                top: '36%',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.56)',
                bottom: 0,
                left: 0,
                padding: 12,
                position: 'absolute',
                right: 0,
              }}
            >
              <Text variant="bodyMedium" style={{ color: theme.tdpos.ink[50] }}>
                {t('scanner.frameHint')}
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{
              gap: 12,
              paddingHorizontal: 16,
              paddingBottom: 96 + insets.bottom,
            }}
          >
            <ScanResultCard result={scanResult} onReset={resetScanner} />
            <Card mode="contained">
              <Card.Content style={{ gap: 8 }}>
                <Text variant="titleMedium">{t('scanner.rulesTitle')}</Text>
                <Step order="1" label={t('scanner.step1Label')} hint={t('scanner.step1Hint')} />
                <Step order="2" label={t('scanner.step2Label')} hint={t('scanner.step2Hint')} />
                <Step order="3" label={t('scanner.step3Label')} hint={t('scanner.step3Hint')} />
              </Card.Content>
            </Card>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            gap: 16,
            padding: 16,
            paddingBottom: 96 + insets.bottom,
          }}
        >
          <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
            <Card.Content style={{ gap: 10 }}>
              <Text
                variant="labelLarge"
                style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
                accessibilityRole="header"
              >
                {t('scanner.permissionTitle')}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('scanner.permissionBody')}
              </Text>
              <Button mode="contained" icon="camera" onPress={requestCamera}>
                {t('scanner.permissionAction')}
              </Button>
            </Card.Content>
          </Card>

          <Card mode="contained">
            <Card.Content style={{ gap: 10 }}>
              <Text variant="titleMedium">{t('scanner.fallbackTitle')}</Text>
              <Step
                order="1"
                label={t('scanner.fallbackStep1Label')}
                hint={t('scanner.fallbackStep1Hint')}
              />
              <Step
                order="2"
                label={t('scanner.fallbackStep2Label')}
                hint={t('scanner.fallbackStep2Hint')}
              />
              <Step
                order="3"
                label={t('scanner.fallbackStep3Label')}
                hint={t('scanner.fallbackStep3Hint')}
              />
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      <Surface
        mode="elevated"
        elevation={4}
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          mode="contained"
          icon="cart-outline"
          buttonColor={theme.colors.primary}
          onPress={goToSale}
          accessibilityLabel={t('scanner.backToSale')}
        >
          {t('scanner.backToSale')}
        </Button>
      </Surface>
    </View>
  )
}

function ScanResultCard({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  const theme = useAppTheme()
  const t = useT()

  if (result.kind === 'idle') {
    return (
      <Card mode="contained">
        <Card.Content style={{ gap: 6 }}>
          <Text variant="titleMedium">{t('scanner.idleTitle')}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('scanner.idleBody')}
          </Text>
        </Card.Content>
      </Card>
    )
  }

  const tone =
    result.kind === 'found'
      ? { background: theme.tdpos.teal[50], color: theme.colors.primary }
      : { background: theme.colors.errorContainer, color: theme.colors.onErrorContainer }

  const title =
    result.kind === 'found'
      ? `${result.productName} ${t('scanner.foundSuffix')}`
      : result.kind === 'out_of_stock'
        ? `${result.productName} ${t('scanner.outOfStockSuffix')}`
        : result.kind === 'missing'
          ? t('scanner.missingTitle')
          : t('scanner.errorTitle')

  const body =
    result.kind === 'found'
      ? `${formatMoney(result.price)} ${t('scanner.foundBodyTemplate')}`
      : result.kind === 'out_of_stock'
        ? `${result.code} ${t('scanner.outOfStockBody')}`
        : result.kind === 'missing'
          ? `${result.code} ${t('scanner.missingBody')}`
          : t('scanner.errorBody')

  return (
    <Card mode="contained" style={{ backgroundColor: tone.background }}>
      <Card.Content style={{ gap: 10 }}>
        <Text variant="titleMedium" style={{ color: tone.color }}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: tone.color }}>
          {body}
        </Text>
        <Button mode="outlined" icon="refresh" onPress={onReset}>
          {t('scanner.scanAgain')}
        </Button>
      </Card.Content>
    </Card>
  )
}

function Step({ order, label, hint }: { order: string; label: string; hint: string }) {
  const theme = useAppTheme()

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.tdpos.teal[100],
          borderRadius: 999,
          height: 28,
          justifyContent: 'center',
          width: 28,
        }}
      >
        <Text variant="labelMedium" style={{ color: theme.tdpos.teal[800], fontWeight: '700' }}>
          {order}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
          {label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {hint}
        </Text>
      </View>
    </View>
  )
}
