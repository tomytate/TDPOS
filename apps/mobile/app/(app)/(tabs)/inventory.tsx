import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Appbar, Card, Chip, Divider, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useCategories } from '@/features/products/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import { useT } from '@/i18n/translations'
import { displayStock, formatMoney } from '@tdpos/shared'

const ALL_CATEGORY = 'all'

export default function InventoryScreen() {
  const theme = useAppTheme()
  const t = useT()
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const { data: categories = [] } = useCategories()
  const { data: products = [], isPending } = useProducts(
    activeCategory === ALL_CATEGORY ? undefined : activeCategory,
  )

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content title={t('inventory.title')} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipRail}
      >
        <Chip
          selected={activeCategory === ALL_CATEGORY}
          mode={activeCategory === ALL_CATEGORY ? 'flat' : 'outlined'}
          onPress={() => setActiveCategory(ALL_CATEGORY)}
        >
          {t('inventory.all')}
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            selected={activeCategory === category.id}
            mode={activeCategory === category.id ? 'flat' : 'outlined'}
            onPress={() => setActiveCategory(category.id)}
          >
            {category.name} · {category.product_count}
          </Chip>
        ))}
      </ScrollView>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.content}>
          <Card mode="contained">
            <Card.Content>
              <Text variant="titleMedium">{t('inventory.noProducts')}</Text>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.kpiGrid}>
            <MetricCard label={t('inventory.products')} value={String(products.length)} />
            <MetricCard label={t('inventory.stockValue')} value={formatMoney(stockValue)} />
            <MetricCard label={t('inventory.lowStock')} value={String(lowStockCount)} />
            <MetricCard label={t('inventory.out')} value={String(outCount)} />
          </View>

          <Card mode="contained">
            <Card.Content style={styles.list}>
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

                return (
                  <View key={product.id}>
                    {index > 0 ? <Divider /> : null}
                    <View
                      accessibilityLabel={`${product.name}, ${stockLabel}`}
                      style={styles.productRow}
                    >
                      <View style={styles.productText}>
                        <Text variant="titleSmall" numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {product.sku ?? product.category_id ?? 'SKU pending'}
                        </Text>
                      </View>

                      <View style={styles.stockText}>
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
                                ? theme.tdpos.semantic.red600
                                : theme.tdpos.amber[100],
                            }}
                            textStyle={{
                              color: isOut ? '#ffffff' : theme.tdpos.ink[900],
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card mode="contained" style={styles.metricCard}>
      <Card.Content style={styles.metricContent}>
        <Text variant="labelMedium">{label}</Text>
        <Text variant="titleLarge" style={styles.metricValue}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRail: {
    flexGrow: 0,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  list: {
    paddingVertical: 0,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 86,
  },
  metricContent: {
    gap: 6,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 86,
    paddingVertical: 14,
  },
  productText: {
    flex: 1,
    gap: 4,
  },
  stockText: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 112,
  },
})
