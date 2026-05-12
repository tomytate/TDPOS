// Inventory tab — Tier A owner's daily stock lens. Polished for v0.9
// visual QA: theme-token colors only, skeleton loading, cashier-facing
// empty states, KPI tiles with tone-coded values, haptic chip selection,
// and a refresh affordance baked into both empty and populated states.

import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Appbar, Button, Card, Chip, Divider, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useCategories } from '@/features/products/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { displayStock, formatMoney } from '@tdpos/shared'

const ALL_CATEGORY = 'all'

type MetricTone = 'neutral' | 'good' | 'warn' | 'danger'

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: MetricTone
}) {
  const theme = useAppTheme()
  const valueColor =
    tone === 'good'
      ? theme.tdpos.semantic.green600
      : tone === 'warn'
        ? theme.tdpos.amber[700]
        : tone === 'danger'
          ? theme.colors.error
          : theme.colors.onSurface

  return (
    <Card mode="contained" style={{ flexBasis: '47%', flexGrow: 1, minHeight: 86 }}>
      <Card.Content style={{ gap: 6 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="titleLarge" style={{ color: valueColor, fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  )
}

function MetricSkeleton() {
  const theme = useAppTheme()
  return (
    <Card mode="contained" style={{ flexBasis: '47%', flexGrow: 1, minHeight: 86 }}>
      <Card.Content style={{ gap: 8 }}>
        <View
          style={{
            height: 10,
            width: '50%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[100],
          }}
        />
        <View
          style={{
            height: 22,
            width: '70%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[200],
          }}
        />
      </Card.Content>
    </Card>
  )
}

function ProductRowSkeleton() {
  const theme = useAppTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
        paddingVertical: 14,
        minHeight: 86,
      }}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            height: 14,
            width: '70%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[200],
          }}
        />
        <View
          style={{
            height: 10,
            width: '40%',
            borderRadius: 4,
            backgroundColor: theme.tdpos.ink[100],
          }}
        />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6, minWidth: 112 }}>
        <View
          style={{ height: 14, width: 84, borderRadius: 4, backgroundColor: theme.tdpos.ink[200] }}
        />
        <View
          style={{ height: 10, width: 56, borderRadius: 4, backgroundColor: theme.tdpos.ink[100] }}
        />
      </View>
    </View>
  )
}

export default function InventoryScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const { data: categories = [] } = useCategories()
  const {
    data: products = [],
    isPending,
    isFetching,
    refetch,
  } = useProducts(activeCategory === ALL_CATEGORY ? undefined : activeCategory)

  const stockValue = products.reduce(
    (total, product) => total + product.stock_pieces * (product.cost_per_piece ?? 0),
    0,
  )
  const lowStockCount = products.filter(
    (product) =>
      product.stock_pieces > 0 &&
      product.reorder_point_pieces !== null &&
      product.stock_pieces <= product.reorder_point_pieces,
  ).length
  const outCount = products.filter((product) => product.stock_pieces <= 0).length

  const handleCategorySelect = (id: string) => {
    if (id !== activeCategory) void haptics.tapLight()
    setActiveCategory(id)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title={t('inventory.title')} color={theme.colors.onPrimary} />
        <Appbar.Action
          icon="refresh"
          color={theme.colors.onPrimary}
          accessibilityLabel="Refresh inventory"
          disabled={isFetching}
          onPress={() => {
            void haptics.tapLight()
            void refetch()
          }}
        />
      </Appbar.Header>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 12 }}
        style={{ flexGrow: 0 }}
      >
        <Chip
          selected={activeCategory === ALL_CATEGORY}
          mode={activeCategory === ALL_CATEGORY ? 'flat' : 'outlined'}
          onPress={() => handleCategorySelect(ALL_CATEGORY)}
          accessibilityLabel="Show all categories"
        >
          {t('inventory.all')}
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            selected={activeCategory === category.id}
            mode={activeCategory === category.id ? 'flat' : 'outlined'}
            onPress={() => handleCategorySelect(category.id)}
            accessibilityLabel={`Filter by ${category.name}, ${category.product_count} products`}
          >
            {category.name} · {category.product_count}
          </Chip>
        ))}
      </ScrollView>

      {isPending ? (
        <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </View>
          <Card mode="contained">
            <Card.Content style={{ paddingVertical: 0 }}>
              {[0, 1, 2, 3].map((key) => (
                <View key={key}>
                  {key > 0 ? <Divider /> : null}
                  <ProductRowSkeleton />
                </View>
              ))}
            </Card.Content>
          </Card>
        </ScrollView>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleMedium">{t('inventory.noProducts')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {activeCategory === ALL_CATEGORY
                  ? 'No active products in your inventory. Add them from the web dashboard, or pull to refresh once a manager loads stock.'
                  : 'No active products in this category. Try All or pick another category above.'}
              </Text>
              <Button
                mode="outlined"
                icon="refresh"
                loading={isFetching}
                disabled={isFetching}
                onPress={() => {
                  void haptics.tapLight()
                  void refetch()
                }}
              >
                Refresh
              </Button>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricTile
              label={t('inventory.products')}
              value={String(products.length)}
              tone="neutral"
            />
            <MetricTile
              label={t('inventory.stockValue')}
              value={formatMoney(stockValue)}
              tone="good"
            />
            <MetricTile
              label={t('inventory.lowStock')}
              value={String(lowStockCount)}
              tone={lowStockCount > 0 ? 'warn' : 'neutral'}
            />
            <MetricTile
              label={t('inventory.out')}
              value={String(outCount)}
              tone={outCount > 0 ? 'danger' : 'neutral'}
            />
          </View>

          <Card mode="contained">
            <Card.Content style={{ paddingVertical: 0 }}>
              {products.map((product, index) => {
                const isOut = product.stock_pieces <= 0
                const isLow =
                  !isOut &&
                  product.reorder_point_pieces !== null &&
                  product.stock_pieces <= product.reorder_point_pieces
                const stockLabel = displayStock(
                  product.stock_pieces,
                  product.pieces_per_pack,
                  product.unit_label ?? 'pc',
                )
                const skuLabel = product.sku ?? 'No SKU'

                return (
                  <View key={product.id}>
                    {index > 0 ? <Divider /> : null}
                    <View
                      accessibilityLabel={`${product.name}, ${stockLabel}, ${formatMoney(product.price_per_piece)} per piece${
                        isOut ? ', out of stock' : isLow ? ', low stock' : ''
                      }`}
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        justifyContent: 'space-between',
                        minHeight: 86,
                        paddingVertical: 14,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text variant="titleSmall" numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                          numberOfLines={1}
                        >
                          {skuLabel}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 112 }}>
                        <Text
                          variant="labelLarge"
                          style={{
                            color: isOut
                              ? theme.colors.error
                              : isLow
                                ? theme.tdpos.amber[700]
                                : theme.colors.primary,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {stockLabel}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {formatMoney(product.price_per_piece)}
                        </Text>
                        {isOut || isLow ? (
                          <Chip
                            compact
                            accessibilityLabel={
                              isOut ? t('inventory.out') : t('inventory.lowStock')
                            }
                            style={{
                              alignSelf: 'flex-end',
                              backgroundColor: isOut
                                ? theme.colors.errorContainer
                                : theme.tdpos.amber[100],
                            }}
                            textStyle={{
                              color: isOut ? theme.colors.onErrorContainer : theme.tdpos.amber[700],
                              fontSize: 11,
                            }}
                          >
                            {isOut ? t('inventory.out') : t('inventory.low')}
                          </Chip>
                        ) : null}
                      </View>
                    </View>
                  </View>
                )
              })}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  )
}
