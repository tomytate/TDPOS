// Inventory tab — Tier A owner's daily stock lens. Polished for v0.9
// visual QA: theme-token colors only, skeleton loading, cashier-facing
// empty states, KPI tiles with tone-coded values, haptic chip selection,
// and a refresh affordance baked into both empty and populated states.

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { executeStockTake } from '@/features/inventory/lib/execute-stock-take'
import { getStockAccuracySnapshot } from '@/features/inventory/lib/stock-accuracy'
import { useCategories } from '@/features/products/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import {
  createClientOperationId,
  displayStock,
  formatMoney,
  type StockAdjustmentReason,
} from '@tdpos/shared'
import type { DbProduct } from '@tdpos/db'

const ALL_CATEGORY = 'all'

const STOCK_TAKE_REASONS: Array<{ value: StockAdjustmentReason; label: string }> = [
  { value: 'count_correction', label: 'Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'expiry', label: 'Expiry' },
  { value: 'other', label: 'Other' },
]

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
  const db = useSQLiteContext()
  const queryClient = useQueryClient()
  const role = useAuthStore((state) => state.role)
  const branchId = useAuthStore((state) => state.branchId)
  const userId = useAuthStore((state) => state.userId)
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const [stockTakeProduct, setStockTakeProduct] = useState<DbProduct | null>(null)
  const [countedPieces, setCountedPieces] = useState('')
  const [stockTakeReason, setStockTakeReason] = useState<StockAdjustmentReason>('count_correction')
  const [stockTakeNote, setStockTakeNote] = useState('')
  const [stockTakeSubmitting, setStockTakeSubmitting] = useState(false)
  const [stockTakeError, setStockTakeError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const { data: categories = [] } = useCategories()
  const {
    data: products = [],
    isPending,
    isFetching,
    refetch,
  } = useProducts(activeCategory === ALL_CATEGORY ? undefined : activeCategory)
  const { data: stockAccuracy } = useQuery({
    queryKey: ['stock-accuracy'],
    queryFn: () => getStockAccuracySnapshot(db),
    staleTime: 60 * 1000,
  })

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
  const accuracyLabel =
    stockAccuracy?.averageAccuracyPercent === null ||
    stockAccuracy?.averageAccuracyPercent === undefined
      ? t('inventory.noCounts')
      : `${Math.round(stockAccuracy.averageAccuracyPercent)}%`
  const canStockTake = role === 'owner' || role === 'manager'
  const countedPiecesNumber = Number.parseInt(countedPieces, 10)
  const countedPiecesInvalid =
    countedPieces.trim().length > 0 &&
    (!Number.isInteger(countedPiecesNumber) || countedPiecesNumber < 0)

  const handleCategorySelect = (id: string) => {
    if (id !== activeCategory) void haptics.tapLight()
    setActiveCategory(id)
  }

  const openStockTake = (product: DbProduct) => {
    void haptics.tapLight()
    setStockTakeProduct(product)
    setCountedPieces(String(product.stock_pieces))
    setStockTakeReason('count_correction')
    setStockTakeNote('')
    setStockTakeError(null)
  }

  const closeStockTake = () => {
    if (stockTakeSubmitting) return
    setStockTakeProduct(null)
    setStockTakeError(null)
  }

  const submitStockTake = async () => {
    if (!stockTakeProduct || stockTakeSubmitting) return
    if (!branchId) {
      setStockTakeError('Device not paired. Ask a manager to re-pair this register.')
      void haptics.error()
      return
    }
    if (!Number.isInteger(countedPiecesNumber) || countedPiecesNumber < 0) {
      setStockTakeError('Enter a whole-piece count.')
      void haptics.error()
      return
    }

    setStockTakeSubmitting(true)
    setStockTakeError(null)

    const result = await executeStockTake({
      db,
      clientOperationId: createClientOperationId(),
      productId: stockTakeProduct.id,
      branchId,
      countedStockPieces: countedPiecesNumber,
      reason: stockTakeReason,
      reasonNote: stockTakeNote,
      userId,
    })

    setStockTakeSubmitting(false)

    if (!result.ok) {
      const message =
        result.reason === 'invalid_count'
          ? 'Enter a whole-piece count.'
          : result.reason === 'product_not_found'
            ? 'Product is no longer active. Refresh inventory.'
            : 'Stock take could not be recorded.'
      setStockTakeError(message)
      void haptics.error()
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['products'] })
    await queryClient.invalidateQueries({ queryKey: ['stock-accuracy'] })
    await refetch()
    setStockTakeProduct(null)
    setSnackbar(
      `Stock adjusted by ${result.delta > 0 ? '+' : ''}${result.delta} piece${
        Math.abs(result.delta) === 1 ? '' : 's'
      }.`,
    )
    void haptics.success()
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
            <MetricTile
              label={t('inventory.accuracy')}
              value={accuracyLabel}
              tone={
                stockAccuracy?.averageAccuracyPercent === undefined ||
                stockAccuracy.averageAccuracyPercent === null
                  ? 'neutral'
                  : stockAccuracy.averageAccuracyPercent >= 95
                    ? 'good'
                    : stockAccuracy.averageAccuracyPercent >= 80
                      ? 'warn'
                      : 'danger'
              }
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
                        {canStockTake ? (
                          <Button
                            compact
                            mode="text"
                            icon="clipboard-edit-outline"
                            onPress={() => openStockTake(product)}
                            accessibilityLabel={`Stock take for ${product.name}`}
                          >
                            {t('inventory.stockTake')}
                          </Button>
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

      <Portal>
        <Dialog visible={stockTakeProduct !== null} onDismiss={closeStockTake}>
          <Dialog.Title>{t('inventory.stockTake')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text variant="bodyMedium">
              {stockTakeProduct?.name ?? 'Product'} · current{' '}
              {stockTakeProduct
                ? displayStock(
                    stockTakeProduct.stock_pieces,
                    stockTakeProduct.pieces_per_pack,
                    stockTakeProduct.unit_label ?? 'pc',
                  )
                : ''}
            </Text>
            <TextInput
              mode="outlined"
              label={t('inventory.countedPieces')}
              value={countedPieces}
              keyboardType="number-pad"
              onChangeText={(value) => {
                setCountedPieces(value.replace(/[^\d]/g, ''))
                setStockTakeError(null)
              }}
              error={countedPiecesInvalid}
              accessibilityLabel="Counted stock pieces"
            />
            <HelperText type={countedPiecesInvalid ? 'error' : 'info'} visible>
              {countedPiecesInvalid
                ? t('inventory.wholePieceCount')
                : t('inventory.countCanonical')}
            </HelperText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STOCK_TAKE_REASONS.map((reason) => (
                <Chip
                  key={reason.value}
                  selected={stockTakeReason === reason.value}
                  onPress={() => {
                    setStockTakeReason(reason.value)
                    setStockTakeError(null)
                  }}
                >
                  {reason.label}
                </Chip>
              ))}
            </View>
            <TextInput
              mode="outlined"
              label={
                stockTakeReason === 'other'
                  ? t('inventory.reasonNote')
                  : t('inventory.optionalNote')
              }
              value={stockTakeNote}
              onChangeText={setStockTakeNote}
              multiline
              accessibilityLabel="Stock take reason note"
            />
            {stockTakeError ? (
              <HelperText type="error" visible>
                {stockTakeError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeStockTake} disabled={stockTakeSubmitting}>
              {t('inventory.cancel')}
            </Button>
            <Button
              mode="contained"
              loading={stockTakeSubmitting}
              disabled={stockTakeSubmitting || countedPieces.trim().length === 0}
              onPress={() => void submitStockTake()}
            >
              {t('inventory.record')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  )
}
