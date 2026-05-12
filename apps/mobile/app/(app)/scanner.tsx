// Scanner placeholder — v0.9 visual QA. We don't ship a camera barcode scanner
// in the alpha (would require a native module + permission flow), so this
// surface explains that gracefully and points the cashier at the working
// alternative (product search from Sale). Safe-area-aware, theme-token only.

import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'

export default function ScannerScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()

  const goToSale = () => {
    void haptics.tapLight()
    router.replace('/(app)/(tabs)')
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title="Barcode scanner" color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          gap: 16,
          padding: 16,
          paddingBottom: 96 + insets.bottom,
        }}
      >
        <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
          <Card.Content style={{ gap: 8 }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
              accessibilityRole="header"
            >
              Not in this build
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              The hardware barcode scanner ships after pilot. For now the cashier rings up items by
              tapping product tiles or typing the name.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <Text variant="titleMedium">How to ring up items today</Text>
            <Step
              order="1"
              label="Open Sale"
              hint="The tabbed home screen lists every active product."
            />
            <Step
              order="2"
              label="Tap a product tile"
              hint="Adds one piece to the cart. Long-press for pack pricing later."
            />
            <Step
              order="3"
              label="Charge to checkout"
              hint="Cash, GCash, or utang — receipt is BIR-ready."
            />
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              When the scanner ships
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Connect a USB or Bluetooth barcode reader. The cashier focus stays on the cart entry
              field and the scanner acts as a keyboard wedge — no extra setup.
            </Text>
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
          icon="cart-outline"
          buttonColor={theme.colors.primary}
          onPress={goToSale}
          accessibilityLabel="Back to Sale tab"
        >
          Back to Sale
        </Button>
      </Surface>
    </View>
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
