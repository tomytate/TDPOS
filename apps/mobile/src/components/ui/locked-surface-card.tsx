// Mobile parallel of the web TierLockBanner — renders a single tier-locked
// surface as a card with label + description + "Unlocks at <tier>" badge.
// Consumed by the /upgrade explorer and (eventually) by per-surface stub
// routes so the locked state is consistent across the app.

import { Button, Card, Chip, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { SURFACE_LABELS, type TierDefinition, type TierSurface } from '@tdpos/shared'

interface LockedSurfaceCardProps {
  surface: TierSurface
  // The minimum tier that unlocks this surface — usually computed once by the
  // caller via `getMinimumTierForSurface(surface)` so `/upgrade` can group
  // cards by unlocking tier without re-deriving on every render.
  unlocksAt: TierDefinition
  actionLabel?: string
  onAction?: () => void
}

export function LockedSurfaceCard({
  surface,
  unlocksAt,
  actionLabel,
  onAction,
}: LockedSurfaceCardProps) {
  const theme = useAppTheme()
  const meta = SURFACE_LABELS[surface]

  return (
    <Card mode="contained" style={{ backgroundColor: theme.tdpos.amber[50] }}>
      <Card.Content style={{ gap: 6 }}>
        <Text variant="labelLarge" style={{ color: theme.tdpos.amber[700] }}>
          {meta.label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {meta.description}
        </Text>
        <Chip
          mode="outlined"
          compact
          style={{ alignSelf: 'flex-start', borderColor: theme.tdpos.amber[400] }}
          textStyle={{ color: theme.tdpos.amber[700] }}
        >
          Unlocks at {unlocksAt.shortLabel}
        </Chip>
        {actionLabel && onAction ? (
          <Button mode="text" compact onPress={onAction} style={{ alignSelf: 'flex-start' }}>
            {actionLabel}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  )
}
