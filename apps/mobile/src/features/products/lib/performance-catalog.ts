import type { AsyncSqliteLike } from '@/db/async-sqlite'

export const PERFORMANCE_CATALOG_PRODUCT_COUNT = 500
export const PERFORMANCE_CATALOG_CATEGORY_COUNT = 10

export interface PerformanceCatalogCategory {
  id: string
  name: string
  color: string
}

export interface PerformanceCatalogProduct {
  id: string
  sku: string
  name: string
  categoryId: string
  pricePerPiece: number
  pricePerPack: number | null
  costPerPiece: number
  stockPieces: number
  piecesPerPack: number
  reorderPointPieces: number
  unitLabel: string
  isTingi: boolean
}

export interface PerformanceCatalogFixture {
  businessId: string
  categories: PerformanceCatalogCategory[]
  products: PerformanceCatalogProduct[]
}

const CATEGORY_COLORS = [
  '#0f766e',
  '#d97706',
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#be123c',
  '#4d7c0f',
  '#a16207',
]

const PRODUCT_FAMILIES = [
  'Sachet',
  'Coffee',
  'Noodles',
  'Snack',
  'Drink',
  'Soap',
  'Rice',
  'Canned Goods',
  'Load Card',
  'Candy',
]

export function buildPerformanceCatalogFixture(
  businessId: string,
  productCount = PERFORMANCE_CATALOG_PRODUCT_COUNT,
  categoryCount = PERFORMANCE_CATALOG_CATEGORY_COUNT,
): PerformanceCatalogFixture {
  const normalizedCategoryCount = Math.max(1, Math.floor(categoryCount))
  const normalizedProductCount = Math.max(0, Math.floor(productCount))
  const categories = Array.from({ length: normalizedCategoryCount }, (_, index) => ({
    id: deterministicUuid('10000000', index + 1),
    name: `Perf Category ${String(index + 1).padStart(2, '0')}`,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? '#0f766e',
  }))
  const products = Array.from({ length: normalizedProductCount }, (_, index) => {
    const category = categories[index % categories.length] as PerformanceCatalogCategory
    const piecesPerPack = index % 4 === 0 ? 12 : index % 4 === 1 ? 10 : index % 4 === 2 ? 6 : 1
    const pricePerPiece = 5 + (index % 31)
    const isTingi = piecesPerPack > 1

    return {
      id: deterministicUuid('20000000', index + 1),
      sku: `PERF-${String(index + 1).padStart(4, '0')}`,
      name: `${PRODUCT_FAMILIES[index % PRODUCT_FAMILIES.length]} SKU ${String(index + 1).padStart(4, '0')}`,
      categoryId: category.id,
      pricePerPiece,
      pricePerPack: isTingi ? pricePerPiece * piecesPerPack - Math.min(5, piecesPerPack) : null,
      costPerPiece: Math.max(1, pricePerPiece - 2),
      stockPieces: 80 + (index % 120),
      piecesPerPack,
      reorderPointPieces: piecesPerPack * 2,
      unitLabel: isTingi ? 'pc' : 'pack',
      isTingi,
    }
  })

  return { businessId, categories, products }
}

export async function seedPerformanceCatalog(
  db: AsyncSqliteLike,
  businessId: string,
  productCount = PERFORMANCE_CATALOG_PRODUCT_COUNT,
): Promise<PerformanceCatalogFixture> {
  const fixture = buildPerformanceCatalogFixture(businessId, productCount)

  await db.withTransactionAsync(async () => {
    for (const category of fixture.categories) {
      await db.runAsync(
        `INSERT INTO categories (id, business_id, name, color)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           name = excluded.name,
           color = excluded.color`,
        [category.id, businessId, category.name, category.color],
      )
    }

    for (const product of fixture.products) {
      await db.runAsync(
        `INSERT INTO products (
           id, business_id, sku, name, category_id, price_per_piece, price_per_pack,
           cost_per_piece, stock_pieces, pieces_per_pack, reorder_point_pieces,
           unit_label, is_tingi, is_active, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           sku = excluded.sku,
           name = excluded.name,
           category_id = excluded.category_id,
           price_per_piece = excluded.price_per_piece,
           price_per_pack = excluded.price_per_pack,
           cost_per_piece = excluded.cost_per_piece,
           stock_pieces = excluded.stock_pieces,
           pieces_per_pack = excluded.pieces_per_pack,
           reorder_point_pieces = excluded.reorder_point_pieces,
           unit_label = excluded.unit_label,
           is_tingi = excluded.is_tingi,
           is_active = excluded.is_active,
           updated_at = unixepoch()`,
        [
          product.id,
          businessId,
          product.sku,
          product.name,
          product.categoryId,
          product.pricePerPiece,
          product.pricePerPack,
          product.costPerPiece,
          product.stockPieces,
          product.piecesPerPack,
          product.reorderPointPieces,
          product.unitLabel,
          product.isTingi ? 1 : 0,
        ],
      )
    }
  })

  return fixture
}

function deterministicUuid(prefix: string, sequence: number): string {
  return `${prefix}-0000-4000-8000-${String(sequence).padStart(12, '0')}`
}
