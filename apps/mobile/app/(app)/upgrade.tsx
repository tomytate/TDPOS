// Mobile upgrade explorer — lists every mobile.* TierSurface that the
// current tier does NOT unlock, grouped by which tier would unlock it.
// Read-only scaffold: each card uses LockedSurfaceCard so the locked
// presentation stays consistent across the app.
//
// Adding a new TierSurface to the union in `@tdpos/shared` automatically
// shows up here (as long as a SURFACE_LABELS entry exists), so the
// explorer scales with the surface registry without per-screen edits.

import { router } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Text } from 'react-native-paper'

import { LockedSurfaceCard } from '@/components/ui/locked-surface-card'
import { useAppTheme } from '@/constants/theme'
import { useAuthStore } from '@/stores/auth-store'
import {
  SUBSCRIPTION_TIERS,
  SURFACE_LABELS,
  getMinimumTierForSurface,
  getTierDefinition,
  isTierSurfaceEnabled,
  type SubscriptionTier,
  type TierSurface,
} from '@tdpos/shared'

const PRICING_URL = 'https://tdpos.app/pricing'

export default function UpgradeScreen() {
  const theme = useAppTheme()
  const tier = useAuthStore((state) => state.subscriptionTier) as SubscriptionTier

  // Mobile-only surfaces, locked at the current tier, indexed by the tier
  // that unlocks them. Iterating the SURFACE_LABELS registry means new
  // surfaces don't need explicit wiring — TypeScript exhaustiveness keeps
  // this list in sync with the `TierSurface` union.
  const lockedByTier = (Object.keys(SURFACE_LABELS) as TierSurface[]).reduce(
    (acc, surface) => {
      const meta = SURFACE_LABELS[surface]
      if (meta.group !== 'mobile') return acc
      if (isTierSurfaceEnabled(tier, surface)) return acc
      const required = getMinimumTierForSurface(surface)
      if (required === tier) return acc
      acc[required] = acc[required] ?? []
      acc[required].push(surface)
      return acc
    },
    {} as Partial<Record<SubscriptionTier, TierSurface[]>>,
  )

  const orderedTiers = SUBSCRIPTION_TIERS.filter((t) => lockedByTier[t]?.length)

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content title="Upgrade explorer" color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
        {orderedTiers.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">All mobile surfaces unlocked</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                You're on the highest tier — every mobile surface is available on this device.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          orderedTiers.map((unlockTier) => {
            const definition = getTierDefinition(unlockTier)
            const surfaces = lockedByTier[unlockTier] ?? []

            return (
              <View key={unlockTier} style={{ gap: 8 }}>
                <View style={{ gap: 2 }}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    {definition.label}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {definition.description}
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {surfaces.map((surface) => (
                    <LockedSurfaceCard key={surface} surface={surface} unlocksAt={definition} />
                  ))}
                </View>
              </View>
            )
          })
        )}

        <Button
          mode="contained"
          icon="open-in-new"
          onPress={() => {
            void Linking.openURL(PRICING_URL)
          }}
          buttonColor={theme.colors.primary}
        >
          Compare tiers on the web
        </Button>
      </ScrollView>
    </View>
  )
}
