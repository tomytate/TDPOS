import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Card, Chip, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'

import type { MobileTierSurface } from './surface-scaffolds'

function PreviewShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const theme = useAppTheme()
  return (
    <Card mode="contained">
      <Card.Content style={{ gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Native scaffold preview
          </Text>
          <Text variant="titleMedium">{title}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        </View>
        {children}
      </Card.Content>
    </Card>
  )
}

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  const theme = useAppTheme()
  const color =
    tone === 'good'
      ? theme.tdpos.semantic.green600
      : tone === 'warn'
        ? theme.tdpos.amber[700]
        : tone === 'danger'
          ? theme.colors.error
          : theme.colors.onSurface

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        minWidth: 92,
        padding: 10,
      }}
    >
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color, marginTop: 4 }}>
        {value}
      </Text>
    </View>
  )
}

function StubButton({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'muted' }) {
  const theme = useAppTheme()
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: tone === 'primary' ? theme.colors.primary : theme.colors.surface,
        borderColor: tone === 'primary' ? theme.colors.primary : theme.colors.outlineVariant,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: 10,
      }}
    >
      <Text
        variant="labelMedium"
        style={{ color: tone === 'primary' ? theme.colors.onPrimary : theme.colors.onSurface }}
      >
        {label}
      </Text>
    </View>
  )
}

function RowItem({
  left,
  right,
  tone = 'neutral',
}: {
  left: string
  right: string
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  const theme = useAppTheme()
  const color =
    tone === 'good'
      ? theme.tdpos.semantic.green600
      : tone === 'warn'
        ? theme.tdpos.amber[700]
        : tone === 'danger'
          ? theme.colors.error
          : theme.colors.onSurfaceVariant

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor: theme.colors.outlineVariant,
        borderBottomWidth: 1,
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
        paddingVertical: 8,
      }}
    >
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {left}
      </Text>
      <Text variant="labelMedium" style={{ color }}>
        {right}
      </Text>
    </View>
  )
}

function ProductButton({ label, price }: { label: string; price: string }) {
  const theme = useAppTheme()
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        minHeight: 72,
        minWidth: 96,
        padding: 10,
        justifyContent: 'space-between',
      }}
    >
      <Text variant="labelMedium" numberOfLines={2}>
        {label}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
        {price}
      </Text>
    </View>
  )
}

function SplitGrid({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1.3, gap: 8 }}>{left}</View>
      <View style={{ flex: 1, gap: 8 }}>{right}</View>
    </View>
  )
}

export function SurfacePreview({ surface }: { surface: MobileTierSurface }) {
  switch (surface) {
    case 'mobile.tier_a_cashier':
      return (
        <PreviewShell title="Pocket cashier" subtitle="The always-free Tier A sale loop.">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <ProductButton label="Shampoo sachet" price="P7" />
            <ProductButton label="Coffee stick" price="P8" />
            <ProductButton label="Candy" price="P1" />
          </View>
          <StubButton label="Charge P16" />
        </PreviewShell>
      )

    case 'mobile.tablet_pos':
      return (
        <PreviewShell
          title="Tablet register"
          subtitle="Landscape split view: fast product grid left, live cart right."
        >
          <SplitGrid
            left={
              <>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {['All', 'Drinks', 'Sachets', 'Cigarettes'].map((label) => (
                    <Chip key={label} compact>
                      {label}
                    </Chip>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <ProductButton label="Coke mismo" price="P20" />
                  <ProductButton label="Nescafe" price="P8" />
                  <ProductButton label="Pancit canton" price="P17" />
                  <ProductButton label="Mentos" price="P2" />
                </View>
              </>
            }
            right={
              <>
                <RowItem left="Nescafe x2" right="P16" />
                <RowItem left="Coke mismo" right="P20" />
                <MetricTile label="Cart total" value="P36" tone="good" />
              </>
            }
          />
        </PreviewShell>
      )

    case 'mobile.owner_lanes':
      return (
        <PreviewShell
          title="Lane board"
          subtitle="Owner/manager snapshot of active cashiers and sync exceptions."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetricTile label="Lane A" value="P2,140" tone="good" />
            <MetricTile label="Lane B" value="8 queued" tone="warn" />
            <MetricTile label="Lane C" value="Closed" />
          </View>
          <RowItem left="Manager review" right="1 void request" tone="warn" />
        </PreviewShell>
      )

    case 'mobile.shift_login':
      return (
        <PreviewShell
          title="Shift gate"
          subtitle="Cashier identity is captured before sales attach to receipt namespaces."
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Cashier 01', 'Cashier 02'].map((label) => (
              <MetricTile key={label} label={label} value="Ready" />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['*', '*', '*', '*'].map((dot, index) => (
              <View
                key={`${dot}-${index}`}
                style={{
                  alignItems: 'center',
                  borderRadius: 8,
                  borderWidth: 1,
                  flex: 1,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                <Text variant="titleMedium">{dot}</Text>
              </View>
            ))}
          </View>
          <StubButton label="Start shift" />
        </PreviewShell>
      )

    case 'mobile.shift_handoff':
      return (
        <PreviewShell
          title="Cash drawer handoff"
          subtitle="Expected vs counted totals create an immutable shift summary."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetricTile label="Expected cash" value="P4,820" />
            <MetricTile label="Counted" value="P4,800" />
            <MetricTile label="Variance" value="-P20" tone="warn" />
          </View>
          <RowItem left="Reason" right="Short coin count" tone="warn" />
          <StubButton label="Sign handoff" />
        </PreviewShell>
      )

    case 'mobile.convenience_counter':
      return (
        <PreviewShell
          title="Convenience counter"
          subtitle="High-velocity shelves, cooler groups, and repeat-item controls."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Cooler', 'Hot shelf', 'Cigarettes', 'Promo'].map((label) => (
              <MetricTile key={label} label={label} value={label === 'Promo' ? '3 live' : 'Open'} />
            ))}
          </View>
          <RowItem left="Repeat last item" right="P20" />
          <StubButton label="Open promo group" />
        </PreviewShell>
      )

    case 'mobile.manager_phone':
      return (
        <PreviewShell
          title="Approval inbox"
          subtitle="Sensitive cashier actions wait for a manager decision."
        >
          <RowItem left="Void sale BR01-..." right="Needs approval" tone="warn" />
          <RowItem left="Price override: Coke mismo" right="Review" tone="warn" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <StubButton label="Approve" />
            </View>
            <View style={{ flex: 1 }}>
              <StubButton label="Decline" tone="muted" />
            </View>
          </View>
        </PreviewShell>
      )

    case 'mobile.supermarket_counter':
      return (
        <PreviewShell
          title="Scanner lane"
          subtitle="Long-cart checkout with scanner focus and line-item stability."
        >
          <MetricTile label="Scan input" value="Ready" tone="good" />
          <RowItem left="4800012345678" right="P126" />
          <RowItem left="4800087654321" right="P59" />
          <RowItem left="Basket total" right="P1,482" tone="good" />
        </PreviewShell>
      )

    case 'mobile.customer_display':
      return (
        <PreviewShell
          title="Customer display"
          subtitle="Mirrors the cashier cart without becoming transaction truth."
        >
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Text variant="displaySmall">P185.00</Text>
            <Text variant="bodyMedium">3 items</Text>
          </View>
          <RowItem left="Coke mismo" right="P20" />
          <RowItem left="Rice 2kg" right="P130" />
        </PreviewShell>
      )

    case 'mobile.backoffice_audit':
      return (
        <PreviewShell
          title="Audit queue"
          subtitle="Manager-only review of stock, price, sale, and sync exceptions."
        >
          <RowItem left="Stock adjustment" right="queued" tone="warn" />
          <RowItem left="Price edit" right="synced" tone="good" />
          <RowItem left="Sync review" right="2 rows" tone="danger" />
        </PreviewShell>
      )

    case 'mobile.weighted_plu':
      return (
        <PreviewShell
          title="Weighted PLU"
          subtitle="PLU lookup plus deterministic manual/scale weight capture."
        >
          <RowItem left="PLU 4011 · Banana" right="1.250 kg" />
          <RowItem left="Unit price" right="P88/kg" />
          <MetricTile label="Line total" value="P110" tone="good" />
          <StubButton label="Use manual weight fallback" tone="muted" />
        </PreviewShell>
      )

    case 'mobile.hq_rollup':
      return (
        <PreviewShell
          title="HQ branch rollup"
          subtitle="Last-known chain snapshot for enterprise operators."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetricTile label="Branches" value="24" />
            <MetricTile label="At risk" value="3" tone="warn" />
            <MetricTile label="Today" value="P1.2M" tone="good" />
          </View>
          <RowItem left="Worst sync queue" right="Branch 07" tone="warn" />
        </PreviewShell>
      )

    case 'mobile.self_service_kiosk':
      return (
        <PreviewShell
          title="Self-service kiosk"
          subtitle="Customer order capture with staff confirmation before stock moves."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <ProductButton label="Combo meal" price="P99" />
            <ProductButton label="Bottled water" price="P20" />
          </View>
          <RowItem left="Staff handoff" right="Required" tone="warn" />
          <StubButton label="Send to counter" />
        </PreviewShell>
      )

    case 'mobile.returns_warranty':
      return (
        <PreviewShell
          title="Returns desk"
          subtitle="Original sales stay immutable; returns create compensating entries."
        >
          <RowItem left="Receipt lookup" right="BR01-...0421" />
          <RowItem left="Return reason" right="Damaged item" tone="warn" />
          <RowItem left="Compensating row" right="pending" />
          <StubButton label="Request manager approval" />
        </PreviewShell>
      )
  }
}
