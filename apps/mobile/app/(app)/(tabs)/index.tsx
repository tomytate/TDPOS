import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { ActivityIndicator, Appbar, Card, Chip, Text } from 'react-native-paper'

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

export default function SaleScreen() {
  const theme = useAppTheme()
  const t = useT()
  const haptics = useHaptics()
  const branchName = useAuthStore((state) => state.branchName) ?? 'Demo branch'
  const items = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const { data: categories = [] } = useCategories()
  const { data: products = [], isPending } = useProducts(
    activeCategory === ALL_CATEGORY ? undefined : activeCategory,
  )

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

  const handleCharge = () => {
    if (items.length === 0) return
    void haptics.tapMedium()
    router.push('/(app)/checkout')
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content
          title={t('sale.title')}
          subtitle={branchName}
          color={theme.colors.onPrimary}
        />
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
          onPress={() => setActiveCategory(ALL_CATEGORY)}
        >
          All
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            mode={activeCategory === cat.id ? 'flat' : 'outlined'}
            onPress={() => setActiveCategory(cat.id)}
          >
            {cat.name} · {cat.product_count}
          </Chip>
        ))}
      </ScrollView>

      {isPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Card mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleLarge">{t('sale.empty')}</Text>
              <Text variant="bodyMedium">
                Sync or seed products to start selling. Dev builds auto-seed sample products.
              </Text>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {products.map((product) => {
              const lowStock =
                product.reorder_point_pieces !== null &&
                product.stock_pieces <= product.reorder_point_pieces
              return (
                <Pressable
                  key={product.id}
                  onPress={() => handleAddProduct(product)}
                  accessibilityLabel={`${product.name}, ${formatMoney(product.price_per_piece)}, tap to add`}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    flexBasis: '47%',
                    flexGrow: 1,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Card mode="contained" style={{ minHeight: 110 }}>
                    <Card.Content style={{ gap: 4 }}>
                      <Text variant="titleSmall" numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                        {formatMoney(product.price_per_piece)}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: lowStock
                            ? theme.tdpos.semantic.red500
                            : theme.colors.onSurfaceVariant,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {product.stock_pieces} pcs in stock{lowStock ? ' · low' : ''}
                      </Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      )}

      {itemCount > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            backgroundColor: theme.tdpos.teal[800],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View>
            <Text variant="bodyMedium" style={{ color: '#ffffff', opacity: 0.85 }}>
              {itemCount} {t('sale.items')} · {pieceCount} {t('sale.pieces')}
            </Text>
            <Text variant="titleLarge" style={{ color: '#ffffff', fontVariant: ['tabular-nums'] }}>
              {formatMoney(total)}
            </Text>
          </View>
          <Pressable
            onPress={handleCharge}
            accessibilityRole="button"
            accessibilityLabel={t('sale.charge')}
            style={({ pressed }) => ({
              backgroundColor: theme.tdpos.amber[500],
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text variant="labelLarge" style={{ color: theme.tdpos.ink[900] }}>
              {t('sale.charge')} →
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
