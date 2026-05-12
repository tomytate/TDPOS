// Mobile subscription / entitlements screen. Polished for v0.9 visual QA:
// owner-facing wording (no dev-only `UI mode` / `UI source` rows on the
// happy path), safe-area-aware bottom CTAs, surfaces grouped into
// unlocked / locked sections, and a compact limits chip-row for
// at-a-glance entitlement summary.

import { router } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Divider, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useAuthStore } from '@/stores/auth-store'
import {
  SURFACE_LABELS,
  formatTierPrice,
  getMinimumTierForSurface,
  getTierDefinition,
  getTierSurfaces,
  isTierSurfaceEnabled,
  type ModuleName,
  type SubscriptionTier,
} from '@tdpos/shared'

const MODULE_LABELS: Record<ModuleName, string> = {
  utang: 'Utang ledger',
  customer_sms: 'Customer SMS',
  loyalty: 'Loyalty',
  supplier_management: 'Supplier management',
  multi_branch: 'Multi-branch',
  franchise_management: 'Franchise management',
  payroll: 'Payroll',
  accounting_integration: 'Accounting integration',
  public_api: 'Public API',
}

const PRICING_URL = 'https://tdpos.app/pricing'
const MOBILE_SURFACES = getTierSurfaces('mobile')

function formatLimit(limit: number | null, suffix: string): string {
  return limit === null ? `Unlimited ${suffix}` : `${limit.toLocaleString('en-PH')} ${suffix}`
}

export default function SubscriptionScreen() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const tier = useAuthStore((state) => state.subscriptionTier) as SubscriptionTier
  const modules = useAuthStore((state) => state.modules)
  const entitlementsValidUntil = useAuthStore((state) => state.entitlementsValidUntil)
  const storeName = useAuthStore((state) => state.storeName)

  const definition = getTierDefinition(tier)
  const enabledModuleKeys = (Object.keys(modules) as ModuleName[]).filter((key) => modules[key])

  const unlockedSurfaces = MOBILE_SURFACES.filter((surface) => isTierSurfaceEnabled(tier, surface))
  const lockedSurfaces = MOBILE_SURFACES.filter((surface) => !isTierSurfaceEnabled(tier, surface))

  const expiresAt = entitlementsValidUntil
    ? new Date(entitlementsValidUntil).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const openPricing = () => {
    void Linking.openURL(PRICING_URL)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction
          color={theme.colors.onPrimary}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        <Appbar.Content title="Subscription" color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 168 + insets.bottom }}
      >
        {/* Current tier hero card */}
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {storeName ?? 'Your business'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
                {definition.publicName}
              </Text>
              <Chip
                mode="flat"
                compact
                style={{ backgroundColor: theme.tdpos.teal[100] }}
                textStyle={{ color: theme.tdpos.teal[800] }}
              >
                {definition.segment}
              </Chip>
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {formatTierPrice(definition.pricePhpMonthly)}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {definition.description}
            </Text>
            {expiresAt ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Renews / expires: {expiresAt}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        {/* Limits compact chip row */}
        <Card mode="contained">
          <Card.Content style={{ gap: 10 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Limits at this tier
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Chip compact mode="outlined" icon="package-variant">
                {formatLimit(definition.maxProducts, 'products')}
              </Chip>
              <Chip compact mode="outlined" icon="storefront-outline">
                {formatLimit(definition.maxBranches, 'branches')}
              </Chip>
              <Chip compact mode="outlined" icon="cellphone-link">
                {formatLimit(definition.maxDevices, 'devices')}
              </Chip>
              <Chip compact mode="outlined" icon="account-multiple-outline">
                {formatLimit(definition.maxUsers, 'users')}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Modules */}
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Modules
            </Text>
            {enabledModuleKeys.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Core only. Upgrade to unlock optional modules like utang, loyalty, and SMS.
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {enabledModuleKeys.map((key) => (
                  <Chip key={key} mode="flat" compact icon="check">
                    {MODULE_LABELS[key]}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Surfaces — grouped */}
        <Card mode="contained">
          <Card.Content style={{ gap: 12 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Mobile surfaces
            </Text>

            {unlockedSurfaces.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.tdpos.semantic.green600, fontWeight: '600' }}
                >
                  Available now ({unlockedSurfaces.length})
                </Text>
                {unlockedSurfaces.map((surface) => {
                  const meta = SURFACE_LABELS[surface]
                  return (
                    <Button
                      key={surface}
                      mode="contained-tonal"
                      icon="check-circle-outline"
                      contentStyle={{ justifyContent: 'flex-start' }}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/surfaces/[surface]',
                          params: { surface },
                        })
                      }
                      accessibilityLabel={`Open ${meta.label} surface`}
                    >
                      {meta.label}
                    </Button>
                  )
                })}
              </View>
            ) : null}

            {unlockedSurfaces.length > 0 && lockedSurfaces.length > 0 ? <Divider /> : null}

            {lockedSurfaces.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.tdpos.amber[700], fontWeight: '600' }}
                >
                  Unlock by upgrading ({lockedSurfaces.length})
                </Text>
                {lockedSurfaces.map((surface) => {
                  const meta = SURFACE_LABELS[surface]
                  const required = getTierDefinition(getMinimumTierForSurface(surface))
                  return (
                    <Button
                      key={surface}
                      mode="outlined"
                      icon="lock-outline"
                      contentStyle={{ justifyContent: 'flex-start' }}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/surfaces/[surface]',
                          params: { surface },
                        })
                      }
                      accessibilityLabel={`Preview ${meta.label}, unlocks at ${required.shortLabel}`}
                    >
                      {meta.label} · {required.shortLabel}
                    </Button>
                  )
                })}
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Docked CTAs */}
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
          onPress={() => router.push('/(app)/upgrade')}
          accessibilityLabel="See what other tiers unlock"
        >
          See what other tiers unlock
        </Button>
        <Button
          mode="contained"
          icon="open-in-new"
          onPress={openPricing}
          buttonColor={theme.colors.primary}
          accessibilityLabel="Compare tiers on the web"
          accessibilityHint="Opens the pricing page in your browser"
        >
          Compare tiers
        </Button>
      </Surface>
    </View>
  )
}
