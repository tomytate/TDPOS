// Receipt printer settings. Polished for v0.9 visual QA: safe-area-aware
// docked Scan CTA so the primary action always sits above the home
// indicator, a tone-aware "Selected printer" hero (teal when chosen,
// neutral surface variant when not), a "Hardware proof pending" amber
// chip near the top so pilot owners know thermal print is a 0.9
// hardware-pass deliverable, skeleton row while scanning, and softer
// empty/coach-mark copy explaining how the scanner-wedge pattern works.

import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Snackbar, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import {
  discoverBlePrinters,
  printBleTestSlip,
  type DiscoveredThermalPrinter,
} from '@/services/thermal-printer'
import { useSettingsStore } from '@/stores/settings-store'

export default function PrinterSettingsScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const t = useT()
  const selectedPrinter = useSettingsStore((state) => state.selectedThermalPrinter)
  const setSelectedThermalPrinter = useSettingsStore((state) => state.setSelectedThermalPrinter)
  const clearSelectedThermalPrinter = useSettingsStore((state) => state.clearSelectedThermalPrinter)
  const [printers, setPrinters] = useState<DiscoveredThermalPrinter[]>([])
  const [scanning, setScanning] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hasScannedOnce, setHasScannedOnce] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)

  const scan = async () => {
    if (scanning) return
    setScanning(true)
    setSnackbar(null)
    void haptics.tapLight()
    try {
      const devices = await discoverBlePrinters()
      setPrinters(devices)
      setHasScannedOnce(true)
      setSnackbar(
        devices.length === 0
          ? t('printer.scanFoundNone')
          : t('printer.scanFoundSome').replace('{count}', String(devices.length)),
      )
    } catch {
      setSnackbar(t('printer.scanError'))
    } finally {
      setScanning(false)
    }
  }

  const testSelectedPrinter = async () => {
    if (testing) return
    setTesting(true)
    setSnackbar(null)
    void haptics.tapMedium()
    const result = await printBleTestSlip(selectedPrinter)
    setTesting(false)
    if (result.ok) {
      setSnackbar(t('printer.testSent'))
      void haptics.success()
    } else {
      setSnackbar(result.message)
      void haptics.error()
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title={t('printer.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          gap: 12,
          padding: 16,
          paddingBottom: 96 + insets.bottom,
        }}
      >
        {/* Pilot disclosure — print hardware is a 0.9 device-pass deliverable */}
        <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
          <Card.Content style={{ gap: 4 }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
              accessibilityRole="alert"
            >
              {t('printer.hardwarePendingTitle')}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('printer.hardwarePendingBody')}
            </Text>
          </Card.Content>
        </Card>

        {/* Selected printer hero */}
        <Card
          mode="contained"
          style={{
            backgroundColor: selectedPrinter ? theme.tdpos.teal[50] : theme.colors.surfaceVariant,
          }}
        >
          <Card.Content style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('printer.selectedTitle')}
              </Text>
              <Chip
                compact
                mode="flat"
                icon={selectedPrinter ? 'printer-check' : 'printer-off-outline'}
                style={{
                  backgroundColor: selectedPrinter ? theme.tdpos.teal[100] : theme.colors.surface,
                }}
                textStyle={{
                  color: selectedPrinter ? theme.tdpos.teal[800] : theme.colors.onSurfaceVariant,
                  fontWeight: '600',
                }}
              >
                {selectedPrinter ? t('printer.statusConfigured') : t('printer.statusOnScreen')}
              </Chip>
            </View>

            {selectedPrinter ? (
              <>
                <Text variant="titleMedium">{selectedPrinter.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  BLE {tailAddress(selectedPrinter.address)} · selected{' '}
                  {new Date(selectedPrinter.selectedAt).toLocaleString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    mode="contained-tonal"
                    icon="printer-check"
                    loading={testing}
                    disabled={testing}
                    onPress={testSelectedPrinter}
                    accessibilityLabel={t('printer.testPrint')}
                  >
                    {t('printer.testPrint')}
                  </Button>
                  <Button
                    mode="outlined"
                    icon="close"
                    disabled={testing}
                    onPress={() => {
                      void haptics.tapLight()
                      clearSelectedThermalPrinter()
                      setSnackbar(t('printer.clearedSnackbar'))
                    }}
                    accessibilityLabel={t('printer.clear')}
                  >
                    {t('printer.clear')}
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Text variant="titleMedium">{t('printer.noneSelectedTitle')}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('printer.noneSelectedBody')}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Discovery */}
        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" accessibilityRole="header">
                  {t('printer.discoveryTitle')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('printer.discoveryHint')}
                </Text>
              </View>
            </View>

            {scanning ? (
              <ScanSkeletonRow />
            ) : printers.length === 0 ? (
              <View
                style={{
                  borderColor: theme.colors.outline,
                  borderRadius: 8,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  gap: 4,
                  padding: 12,
                }}
              >
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  {hasScannedOnce
                    ? t('printer.emptyAfterScanTitle')
                    : t('printer.emptyBeforeScanTitle')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {hasScannedOnce
                    ? t('printer.emptyAfterScanBody')
                    : t('printer.emptyBeforeScanBody')}
                </Text>
              </View>
            ) : (
              printers.map((printer) => {
                const isSelected = selectedPrinter?.address === printer.address
                return (
                  <Card key={printer.address} mode="outlined">
                    <Card.Content style={{ gap: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall">{printer.name}</Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {tailAddress(printer.address)}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Chip
                            compact
                            mode="flat"
                            icon="check"
                            style={{ backgroundColor: theme.tdpos.teal[100] }}
                            textStyle={{ color: theme.tdpos.teal[800], fontWeight: '600' }}
                          >
                            {t('printer.selected')}
                          </Chip>
                        ) : null}
                      </View>
                      <Button
                        mode={isSelected ? 'contained-tonal' : 'outlined'}
                        icon="check"
                        disabled={isSelected}
                        onPress={() => {
                          setSelectedThermalPrinter({
                            kind: 'ble',
                            name: printer.name,
                            address: printer.address,
                            selectedAt: new Date().toISOString(),
                          })
                          setSnackbar(t('printer.selectedSnackbar').replace('{name}', printer.name))
                          void haptics.selection()
                        }}
                        accessibilityLabel={`${t('printer.selectAction')}: ${printer.name}`}
                      >
                        {isSelected ? t('printer.selected') : t('printer.selectAction')}
                      </Button>
                    </Card.Content>
                  </Card>
                )
              })
            )}
          </Card.Content>
        </Card>
      </ScrollView>

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
          icon="bluetooth-searching"
          buttonColor={theme.colors.primary}
          loading={scanning}
          disabled={scanning}
          onPress={scan}
          contentStyle={{ paddingVertical: 4 }}
          accessibilityLabel={t('printer.scanAccessibility')}
        >
          {scanning ? t('printer.scanningAction') : t('printer.scanAction')}
        </Button>
      </Surface>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3500}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  )
}

function ScanSkeletonRow() {
  const theme = useAppTheme()
  const swatch = theme.tdpos.ink[100]
  const bar = theme.tdpos.ink[200]
  return (
    <View style={{ gap: 8 }}>
      {[0, 1].map((key) => (
        <View
          key={key}
          style={{
            borderColor: theme.colors.outline,
            borderRadius: 8,
            borderWidth: 1,
            gap: 8,
            padding: 12,
          }}
        >
          <View style={{ height: 14, width: '60%', borderRadius: 4, backgroundColor: bar }} />
          <View style={{ height: 10, width: '35%', borderRadius: 4, backgroundColor: swatch }} />
          <View style={{ height: 32, borderRadius: 6, backgroundColor: swatch }} />
        </View>
      ))}
    </View>
  )
}

function tailAddress(value: string): string {
  return value.length > 8 ? `...${value.slice(-8)}` : value
}
