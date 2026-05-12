// Mobile tier-surface scaffold. Polished for v0.9 visual QA:
// safe-area-aware docked footer with the upgrade explorer + pricing
// CTAs (was inline buttons that landed under the tab bar), haptic
// taps, clearer "locked vs unlocked" hero card, and the dev-leaning
// "Scaffold contract" card stays but is collapsed under a labelled
// disclosure so owners aren't confronted with `UI mode`/`Reference
// canvas` rows on the happy path.
//
// The root UI canvas stays reference-only; this route gives every
// mobile.* TierSurface a native Expo placeholder with entitlement
// gating and the exact design-reference file recorded from
// TIER_DEFINITIONS.

import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Surface, Text } from 'react-native-paper'

import { LockedSurfaceCard } from '@/components/ui/locked-surface-card'
import { useAppTheme } from '@/constants/theme'
import { useHaptics } from '@/hooks/use-haptics'
import {
  getMobileSurfaceScaffold,
  type MobileTierSurface,
} from '@/features/tier-surfaces/surface-scaffolds'
import { SurfacePreview } from '@/features/tier-surfaces/surface-preview'
import { TierBSurfaceControls } from '@/features/tier-surfaces/tier-b-surface-controls'
import { TierCSurfaceControls } from '@/features/tier-surfaces/tier-c-surface-controls'
import { TierDSurfaceControls } from '@/features/tier-surfaces/tier-d-surface-controls'
import { TierESurfaceControls } from '@/features/tier-surfaces/tier-e-surface-controls'
import { canUseMobileSurfaceFromCache } from '@/services/entitlement-cache'
import { useAuthStore } from '@/stores/auth-store'
import {
  SURFACE_LABELS,
  getMinimumTierForSurface,
  getTierDefinition,
  type TierSurface,
} from '@tdpos/shared'

const PRICING_URL = 'https://tdpos.app/pricing'

function parseMobileSurface(value: string | string[] | undefined): MobileTierSurface | null {
  const surface = Array.isArray(value) ? value[0] : value
  if (!surface) return null
  const meta = SURFACE_LABELS[surface as TierSurface]
  if (!meta || meta.group !== 'mobile') return null
  return surface as MobileTierSurface
}

function SurfaceFact({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  )
}

function BulletList({ items }: { items: readonly string[] }) {
  const theme = useAppTheme()
  return (
    <View style={{ gap: 6 }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: 8 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            •
          </Text>
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  )
}

function StatusChip({ status }: { status: 'scaffold' | 'blocked' | 'phase-0.9' }) {
  const theme = useAppTheme()
  const label = status === 'scaffold' ? 'Scaffolded' : status === 'blocked' ? 'Blocked' : '0.9 gate'
  const color =
    status === 'scaffold'
      ? theme.colors.primary
      : status === 'blocked'
        ? theme.colors.error
        : theme.tdpos.amber[700]

  return (
    <Chip compact mode="outlined" textStyle={{ color }} style={{ alignSelf: 'flex-start' }}>
      {label}
    </Chip>
  )
}

export default function TierSurfaceScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const params = useLocalSearchParams<{ surface?: string }>()
  const currentTier = useAuthStore((state) => state.subscriptionTier)
  const entitlementsValidUntil = useAuthStore((state) => state.entitlementsValidUntil)
  const surface = parseMobileSurface(params.surface)
  const [showScaffoldContract, setShowScaffoldContract] = useState(false)

  if (!surface) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
          <Appbar.BackAction
            color={theme.colors.onPrimary}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          />
          <Appbar.Content title="Surface unavailable" color={theme.colors.onPrimary} />
        </Appbar.Header>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">Unknown mobile surface</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                This route exists for registered mobile tier surfaces only. Use the upgrade explorer
                to pick a valid surface.
              </Text>
              <Button
                mode="contained-tonal"
                icon="lock-open-outline"
                onPress={() => {
                  void haptics.tapLight()
                  router.replace('/(app)/upgrade')
                }}
              >
                Open upgrade explorer
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    )
  }

  const meta = SURFACE_LABELS[surface]
  const requiredTier = getMinimumTierForSurface(surface)
  const requiredDefinition = getTierDefinition(requiredTier)
  const currentDefinition = getTierDefinition(currentTier)
  const surfaceAccess = canUseMobileSurfaceFromCache({
    tier: currentTier,
    surface,
    entitlementsValidUntil,
  })
  const unlocked = surfaceAccess.allowed
  const scaffold = getMobileSurfaceScaffold(surface)

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title={meta.label} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 120 + insets.bottom }}
      >
        {/* Surface hero — required tier + unlock state at a glance */}
        <Card
          mode="contained"
          style={{ backgroundColor: unlocked ? theme.tdpos.teal[50] : theme.tdpos.amber[50] }}
        >
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip
                compact
                mode="flat"
                style={{ backgroundColor: theme.colors.surface }}
                textStyle={{ color: theme.colors.primary, fontWeight: '600' }}
                accessibilityLabel={`Requires ${requiredDefinition.publicName}`}
              >
                {requiredDefinition.publicName}
              </Chip>
              <Chip
                compact
                mode="flat"
                icon={unlocked ? 'lock-open-variant-outline' : 'lock-outline'}
                style={{
                  backgroundColor: unlocked ? theme.tdpos.teal[100] : theme.colors.surface,
                }}
                textStyle={{
                  color: unlocked ? theme.tdpos.teal[800] : theme.tdpos.amber[700],
                  fontWeight: '600',
                }}
              >
                {unlocked ? 'Unlocked' : `Locked for ${currentDefinition.shortLabel}`}
              </Chip>
            </View>
            <Text variant="headlineSmall" accessibilityRole="header">
              {meta.label}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {meta.description}
            </Text>
          </Card.Content>
        </Card>

        {!unlocked && surfaceAccess.reason === 'tier_locked' ? (
          <LockedSurfaceCard surface={surface} unlocksAt={requiredDefinition} />
        ) : null}

        {!unlocked && surfaceAccess.reason === 'entitlements_stale' ? (
          <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
            <Card.Content style={{ gap: 8 }}>
              <Chip
                compact
                mode="outlined"
                style={{ alignSelf: 'flex-start', borderColor: theme.tdpos.amber[400] }}
                textStyle={{ color: theme.tdpos.amber[700] }}
              >
                Entitlements need refresh
              </Chip>
              <Text variant="titleMedium">Reconnect to unlock this surface</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {surfaceAccess.cacheStatus.message}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tier A cashier sales stay available offline. Paid owner/manager surfaces fail closed
                when cached entitlement state is stale.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {surfaceAccess.cacheStatus.status === 'fresh' && surface !== 'mobile.tier_a_cashier' ? (
          <Card mode="contained">
            <Card.Content style={{ gap: 6 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Entitlement cache
              </Text>
              <Text variant="bodyMedium">{surfaceAccess.cacheStatus.message}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {scaffold ? (
          <>
            <Card mode="contained">
              <Card.Content style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Chip compact mode="outlined">
                    Phase {scaffold.scaffoldPhase}
                  </Chip>
                  <Chip
                    compact
                    mode="flat"
                    style={{ backgroundColor: theme.tdpos.teal[100] }}
                    textStyle={{ color: theme.tdpos.teal[800] }}
                  >
                    {requiredDefinition.shortLabel}
                  </Chip>
                </View>
                <Text variant="titleLarge">{scaffold.headline}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {scaffold.primaryWorkflow}
                </Text>
              </Card.Content>
            </Card>

            <SurfacePreview surface={surface} />

            {unlocked ? (
              <>
                <TierBSurfaceControls surface={surface} />
                <TierCSurfaceControls surface={surface} />
                <TierDSurfaceControls surface={surface} />
                <TierESurfaceControls surface={surface} />
              </>
            ) : null}

            <Card mode="contained">
              <Card.Content style={{ gap: 10 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  Offline contract
                </Text>
                <Text variant="bodyMedium">{scaffold.offlineContract}</Text>
              </Card.Content>
            </Card>

            <Card mode="contained">
              <Card.Content style={{ gap: 10 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  Data feeds
                </Text>
                <BulletList items={scaffold.dataFeeds} />
              </Card.Content>
            </Card>

            <Card mode="contained">
              <Card.Content style={{ gap: 10 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  Native action placeholders
                </Text>
                <View style={{ gap: 8 }}>
                  {scaffold.actions.map((action) => (
                    <View
                      key={action.label}
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text variant="bodyMedium" style={{ flex: 1 }}>
                        {action.label}
                      </Text>
                      <StatusChip status={action.status} />
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>

            <Card mode="contained">
              <Card.Content style={{ gap: 10 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  0.9 acceptance backlog
                </Text>
                <BulletList items={scaffold.acceptanceBacklog} />
              </Card.Content>
            </Card>
          </>
        ) : null}

        {/* Scaffold contract — collapsible so owners aren't confronted with
            UI mode / reference canvas paths on the happy path. */}
        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: 8,
                justifyContent: 'space-between',
              }}
            >
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Scaffold contract
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => {
                  void haptics.tapLight()
                  setShowScaffoldContract((prev) => !prev)
                }}
                icon={showScaffoldContract ? 'chevron-up' : 'chevron-down'}
                accessibilityLabel={
                  showScaffoldContract ? 'Hide scaffold contract' : 'Show scaffold contract'
                }
              >
                {showScaffoldContract ? 'Hide' : 'Show'}
              </Button>
            </View>
            {showScaffoldContract ? (
              <>
                <SurfaceFact label="Segment" value={requiredDefinition.segment} />
                <SurfaceFact label="UI mode" value={requiredDefinition.uiMode} />
                <SurfaceFact label="Reference canvas" value={requiredDefinition.uiSource} />
                <SurfaceFact
                  label="Native status"
                  value={
                    unlocked
                      ? 'Route shell is available. Production controls land in the scaffold phase.'
                      : 'Route shell exists, but access is gated by cached entitlements.'
                  }
                />
              </>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Reference paths and UI mode for design/engineering hand-off.
              </Text>
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
          gap: 8,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          mode="contained-tonal"
          icon="lock-open-outline"
          onPress={() => {
            void haptics.tapLight()
            router.push('/(app)/upgrade')
          }}
          accessibilityLabel="Open upgrade explorer"
        >
          Open upgrade explorer
        </Button>
        <Button
          mode="contained"
          icon="open-in-new"
          buttonColor={theme.colors.primary}
          onPress={() => {
            void haptics.tapLight()
            void Linking.openURL(PRICING_URL)
          }}
          accessibilityLabel="Compare tiers on the web"
          accessibilityHint="Opens the pricing page in your browser"
        >
          Compare tiers
        </Button>
      </Surface>
    </View>
  )
}
