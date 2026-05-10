// Mobile subscription / entitlements screen.
// Reads tier identity from auth-store (populated by auth-bootstrap on
// every INITIAL_SESSION + SIGNED_IN). For tier comparison the user is
// pointed at the web /pricing page so the marketing copy lives in one
// place. Mutations (upgrade flow) ship later — this screen is read-only
// scaffold for now.

import { router } from 'expo-router'
import { Linking, ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Chip, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useAuthStore } from '@/stores/auth-store'
import {
  formatTierPrice,
  getMinimumTierForSurface,
  getTierDefinition,
  getTierSurfaces,
  isTierSurfaceEnabled,
  SURFACE_LABELS,
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
  const tier = useAuthStore((state) => state.subscriptionTier) as SubscriptionTier
  const modules = useAuthStore((state) => state.modules)
  const entitlementsValidUntil = useAuthStore((state) => state.entitlementsValidUntil)
  const storeName = useAuthStore((state) => state.storeName)

  const definition = getTierDefinition(tier)
  const enabledModuleKeys = (Object.keys(modules) as ModuleName[]).filter((key) => modules[key])

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
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content title="Subscription" color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {storeName ?? 'Your business'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="headlineSmall">{definition.publicName}</Text>
              <Chip mode="flat" compact>
                {definition.segment}
              </Chip>
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
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

        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Tier contract
            </Text>
            <LimitRow label="Billing" value={definition.billing} />
            <LimitRow label="UI mode" value={definition.uiMode.replace(/_/g, ' ')} />
            <LimitRow label="UI source" value={definition.uiSource} />
            <LimitRow label="Products" value={formatLimit(definition.maxProducts, '')} />
            <LimitRow label="Branches" value={formatLimit(definition.maxBranches, '')} />
            <LimitRow label="Devices" value={formatLimit(definition.maxDevices, '')} />
            <LimitRow label="Users" value={formatLimit(definition.maxUsers, '')} />
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Modules
            </Text>
            {enabledModuleKeys.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Core only. Upgrade to unlock optional modules.
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {enabledModuleKeys.map((key) => (
                  <Chip key={key} mode="outlined" compact>
                    {MODULE_LABELS[key]}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Content style={{ gap: 8 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Mobile tier surfaces
            </Text>
            <View style={{ gap: 8 }}>
              {MOBILE_SURFACES.map((surface) => {
                const meta = SURFACE_LABELS[surface]
                const unlocked = isTierSurfaceEnabled(tier, surface)
                const required = getTierDefinition(getMinimumTierForSurface(surface))

                return (
                  <Button
                    key={surface}
                    mode={unlocked ? 'contained-tonal' : 'outlined'}
                    icon={unlocked ? 'check-circle-outline' : 'lock-outline'}
                    contentStyle={{ justifyContent: 'flex-start' }}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/surfaces/[surface]',
                        params: { surface },
                      })
                    }
                  >
                    {meta.label} · {unlocked ? 'Available' : required.shortLabel}
                  </Button>
                )
              })}
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained-tonal"
          icon="lock-open-outline"
          onPress={() => router.push('/(app)/upgrade')}
        >
          See what other tiers unlock
        </Button>

        <Button
          mode="contained"
          icon="open-in-new"
          onPress={openPricing}
          buttonColor={theme.colors.primary}
        >
          Compare tiers
        </Button>
      </ScrollView>
    </View>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  )
}
