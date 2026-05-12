// Cashier home — Tier A free path. Highest-traffic mobile surface; every
// sale starts here. Polished for v0.9 visual QA: theme-token colors only,
// safe-area-aware docked cart bar, skeleton loading, cashier-facing empty
// state, MD3 Paper components throughout for cross-tier visual consistency.

import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Appbar, Button, Card, Chip, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'
import { useCategories } from '@/features/products/hooks/use-categories'
import { useProducts } from '@/features/products/hooks/use-products'
import { useHaptics } from '@/hooks/use-haptics'
import { useT } from '@/i18n/translations'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import type { DbProduct } from '@tdpos/db'
import { formatMoney } from '@tdpos/shared'

const ALL_CATEGORY = 'all'

// 6 placeholder cards while the products query is pending. Matches the
// 2-column flex-basis grid below so the layout doesn't reflow on resolve.
function ProductSkeletonGrid() {
  const theme = useAppTheme()
  const placeholders = [0, 1, 2, 3, 4, 5]
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12 }}>
      {placeholders.map((key) => (
        <Card key={key} mode="contained" style={{ flexBasis: '47%', flexGrow: 1, minHeight: 110 }}>
          <Card.Content style={{ gap: 8 }}>
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
                height: 18,
                width: '40%',
                borderRadius: 4,
                backgroundColor: theme.tdpos.ink[200],
              }}
            />
            <View
              style={{
                height: 12,
                width: '55%',
                borderRadius: 4,
                backgroundColor: theme.tdpos.ink[100],
              }}
            />
          </Card.Content>
        </Card>
      ))}
    </View>
  )
}

function ProductCard({ product, onAdd }: { product: DbProduct; onAdd: () => void }) {
  const theme = useAppTheme()
  const t = useT()
  const lowStock =
    product.reorder_point_pieces !== null && product.stock_pieces <= product.reorder_point_pieces

  return (
    <Pressable
      onPress={onAdd}
      accessibilityLabel={`${product.name}, ${formatMoney(product.price_per_piece)}`}
      accessibilityHint={t('sale.addHint')}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexBasis: '47%',
        flexGrow: 1,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Card mode="contained" style={{ minHeight: 110 }}>
        <Card.Content style={{ gap: 6 }}>
          <Text variant="titleSmall" numberOfLines={2}>
            {product.name}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
            {formatMoney(product.price_per_piece)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontVariant: ['tabular-nums'],
              }}
            >
              {product.stock_pieces} {t('sale.pieces')}
            </Text>
            {lowStock ? (
              <Chip
                compact
                mode="flat"
                style={{ backgroundColor: theme.tdpos.amber[100] }}
                textStyle={{ color: theme.tdpos.amber[700], fontSize: 11 }}
              >
                {t('inventory.low')}
              </Chip>
            ) : null}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  )
}

export default function SaleScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets()
  const branchName = useAuthStore((state) => state.branchName) ?? 'Demo branch'
  const items = useCartStore((state) => state.items)
  const lastSaleResult = useCartStore((state) => state.lastSaleResult)
  const addItem = useCartStore((state) => state.addItem)

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const { data: categories = [] } = useCategories()
  const {
    data: products = [],
    isPending,
    refetch,
    isFetching,
  } = useProducts(activeCategory === ALL_CATEGORY ? undefined : activeCategory)

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const itemCount = items.length
  const pieceCount = items.reduce(
    (sum, item) => sum + item.qty * (item.wasSoldAs === 'pack' ? item.piecesPerPack : 1),
    0,
  )

  const handleAddProduct = (product: DbProduct) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price_per_piece: product.price_per_piece,
        price_per_pack: product.price_per_pack,
        pieces_per_pack: product.pieces_per_pack,
        category_id: product.category_id,
      },
      'piece',
      1,
    )
    void haptics.tapLight()
  }

  const handleCategorySelect = (id: string) => {
    if (id !== activeCategory) void haptics.tapLight()
    setActiveCategory(id)
  }

  const handleCharge = () => {
    if (items.length === 0) return
    void haptics.tapMedium()
    router.push('/(app)/checkout')
  }

  // Leave room for the docked cart bar AND the system tab bar. Tab bar adds
  // its own bottom padding; the cart bar floats above the tab bar, so the
  // ScrollView contentContainer needs roughly (cart-bar-height + safe-bottom)
  // when the cart has items.
  const dockedCartHeight = itemCount > 0 ? 96 + insets.bottom : 0

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content
          title={t('sale.title')}
          subtitle={branchName}
          color={theme.colors.onPrimary}
        />
        <Appbar.Action
          icon="card-account-details-outline"
          color={theme.colors.onPrimary}
          accessibilityLabel="Open subscription"
          onPress={() => router.push('/(app)/subscription')}
        />
        {lastSaleResult ? (
          <Appbar.Action
            icon="receipt-text-outline"
            color={theme.colors.onPrimary}
            accessibilityLabel={`Open last receipt ${lastSaleResult.receiptNumber}`}
            onPress={() => router.push('/(app)/receipt')}
          />
        ) : null}
        <Appbar.Action
          icon="barcode-scan"
          color={theme.colors.onPrimary}
          accessibilityLabel="Open scanner"
          onPress={() => router.push('/(app)/scanner')}
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
          accessibilityLabel={t('sale.showAllCategories')}
        >
          {t('inventory.all')}
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            mode={activeCategory === cat.id ? 'flat' : 'outlined'}
            onPress={() => handleCategorySelect(cat.id)}
            accessibilityLabel={`${t('sale.filterCategory')}: ${cat.name}, ${cat.product_count} ${t('inventory.products')}`}
          >
            {cat.name} · {cat.product_count}
          </Chip>
        ))}
      </ScrollView>

      {isPending ? (
        <ScrollView contentContainerStyle={{ paddingBottom: dockedCartHeight + 12 }}>
          <ProductSkeletonGrid />
        </ScrollView>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 12 }}>
              <Text variant="titleMedium">{t('sale.empty')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {activeCategory === ALL_CATEGORY ? t('sale.emptyAll') : t('sale.emptyCategory')}
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
                {t('sale.refresh')}
              </Button>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: dockedCartHeight + 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => handleAddProduct(product)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {itemCount > 0 ? (
        <Surface
          mode="elevated"
          elevation={4}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: theme.tdpos.teal[800],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onPrimary, opacity: 0.85 }}
              accessibilityLabel={`${itemCount} cart items, ${pieceCount} pieces total`}
            >
              {itemCount} {t('sale.items')} · {pieceCount} {t('sale.pieces')}
            </Text>
            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onPrimary,
                fontVariant: ['tabular-nums'],
                fontWeight: '700',
              }}
            >
              {formatMoney(total)}
            </Text>
          </View>
          <Button
            mode="contained"
            icon="cash-register"
            onPress={handleCharge}
            buttonColor={theme.tdpos.amber[500]}
            textColor={theme.tdpos.ink[900]}
            accessibilityLabel={`${t('sale.charge')}, ${formatMoney(total)}`}
            contentStyle={{ paddingVertical: 4, paddingHorizontal: 8 }}
            labelStyle={{ fontWeight: '700' }}
          >
            {t('sale.charge')}
          </Button>
        </Surface>
      ) : null}
    </View>
  )
}
