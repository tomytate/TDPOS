// Mobile upgrade explorer — lists every mobile.* TierSurface that the
// current tier does NOT unlock, grouped by which tier would unlock it.
// Read-only scaffold: each card uses LockedSurfaceCard so the locked
// presentation stays consistent across the app. Polished for v0.9 visual
// QA: safe-area-aware docked footer + haptic taps on tier section taps.
//
// Adding a new TierSurface to the union in `@tdpos/shared` automatically
// shows up here (as long as a SURFACE_LABELS entry exists), so the
// explorer scales with the surface registry without per-screen edits.

import { router } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Surface, Text } from 'react-native-paper'

import { LockedSurfaceCard } from '@/components/ui/locked-surface-card'
import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import {
  SUBSCRIPTION_TIERS,
  getLockedTierSurfaces,
  getMinimumTierForSurface,
  getTierDefinition,
  type SubscriptionTier,
  type TierSurface,
} from '@tdpos/shared'

const PRICING_URL = 'https://tdpos.app/pricing'

export default function UpgradeScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const t = useT()
  const tier = useAuthStore((state) => state.subscriptionTier) as SubscriptionTier

  // Mobile-only surfaces, locked at the current tier, indexed by the tier
  // that unlocks them.
  const lockedByTier = getLockedTierSurfaces(tier, 'mobile').reduce(
    (acc, surface) => {
      const required = getMinimumTierForSurface(surface)
      if (required === tier) return acc
      acc[required] = acc[required] ?? []
      acc[required].push(surface)
      return acc
    },
    {} as Partial<Record<SubscriptionTier, TierSurface[]>>,
  )

  const orderedTiers = SUBSCRIPTION_TIERS.filter((t) => lockedByTier[t]?.length)
  const totalLocked = orderedTiers.reduce(
    (sum, unlockTier) => sum + (lockedByTier[unlockTier]?.length ?? 0),
    0,
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel={t('upgrade.back')}
        />
        <Appbar.Content title={t('upgrade.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 96 + insets.bottom }}
      >
        {orderedTiers.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">{t('upgrade.allUnlocked')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('upgrade.allUnlockedBody')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
              <Card.Content style={{ gap: 4 }}>
                <Text
                  variant="labelLarge"
                  style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
                >
                  {totalLocked}{' '}
                  {totalLocked === 1 ? t('upgrade.waitingSingular') : t('upgrade.waitingPlural')}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('upgrade.waitingBody')}
                </Text>
              </Card.Content>
            </Card>

            {orderedTiers.map((unlockTier) => {
              const definition = getTierDefinition(unlockTier)
              const surfaces = lockedByTier[unlockTier] ?? []

              return (
                <View key={unlockTier} style={{ gap: 8 }}>
                  <View style={{ gap: 2 }}>
                    <Text
                      variant="labelMedium"
                      style={{
                        color: theme.colors.primary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {definition.shortLabel}
                    </Text>
                    <Text variant="titleMedium">{definition.label}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {definition.description}
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {surfaces.map((surface) => (
                      <LockedSurfaceCard
                        key={surface}
                        surface={surface}
                        unlocksAt={definition}
                        actionLabel={t('upgrade.openScaffold')}
                        onAction={() => {
                          void haptics.tapLight()
                          router.push({
                            pathname: '/(app)/surfaces/[surface]',
                            params: { surface },
                          })
                        }}
                      />
                    ))}
                  </View>
                </View>
              )
            })}
          </>
        )}
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
          icon="open-in-new"
          onPress={() => {
            void haptics.tapLight()
            void Linking.openURL(PRICING_URL)
          }}
          buttonColor={theme.colors.primary}
          accessibilityLabel={t('upgrade.compareTiersWeb')}
          accessibilityHint={t('upgrade.compareTiersHint')}
        >
          {t('upgrade.compareTiersWeb')}
        </Button>
      </Surface>
    </View>
  )
}
