import type { AsyncSqliteLike } from '@/db/async-sqlite'

interface StockAccuracyRow {
  product_id: string
  name: string
  stock_pieces: number
  counted_stock_pieces: number | null
  system_stock_pieces_before: number | null
  pieces_delta: number | null
  counted_at: number | null
}

export interface ProductStockAccuracy {
  productId: string
  name: string
  currentStockPieces: number
  countedStockPieces: number | null
  systemStockPiecesBefore: number | null
  adjustmentDelta: number | null
  countedAt: number | null
  accuracyPercent: number | null
}

export interface StockAccuracySnapshot {
  productCount: number
  countedProductCount: number
  uncountedProductCount: number
  averageAccuracyPercent: number | null
  products: ProductStockAccuracy[]
}

function scoreAdjustment(row: StockAccuracyRow): number | null {
  if (
    row.counted_stock_pieces === null ||
    row.system_stock_pieces_before === null ||
    row.pieces_delta === null
  ) {
    return null
  }

  const denominator = Math.max(
    Math.abs(row.counted_stock_pieces),
    Math.abs(row.system_stock_pieces_before),
    1,
  )
  const score = 1 - Math.abs(row.pieces_delta) / denominator
  return Math.max(0, Math.min(100, score * 100))
}

export async function getStockAccuracySnapshot(
  db: AsyncSqliteLike,
): Promise<StockAccuracySnapshot> {
  const rows = await db.getAllAsync<StockAccuracyRow>(
    `
      SELECT
        products.id AS product_id,
        products.name,
        products.stock_pieces,
        latest.counted_stock_pieces,
        latest.system_stock_pieces_before,
        latest.pieces_delta,
        latest.created_at AS counted_at
      FROM products
      LEFT JOIN stock_take_counts AS latest
        ON latest.id = (
          SELECT stock_take_counts.id
          FROM stock_take_counts
          WHERE stock_take_counts.product_id = products.id
          ORDER BY stock_take_counts.created_at DESC, stock_take_counts.id DESC
          LIMIT 1
        )
      WHERE products.is_active = 1
      ORDER BY products.name COLLATE NOCASE
    `,
    [],
  )

  const products = rows.map<ProductStockAccuracy>((row) => ({
    productId: row.product_id,
    name: row.name,
    currentStockPieces: row.stock_pieces,
    countedStockPieces: row.counted_stock_pieces,
    systemStockPiecesBefore: row.system_stock_pieces_before,
    adjustmentDelta: row.pieces_delta,
    countedAt: row.counted_at,
    accuracyPercent: scoreAdjustment(row),
  }))
  const scored = products.filter((product) => product.accuracyPercent !== null)
  const averageAccuracyPercent =
    scored.length === 0
      ? null
      : scored.reduce((sum, product) => sum + (product.accuracyPercent ?? 0), 0) / scored.length

  return {
    productCount: products.length,
    countedProductCount: scored.length,
    uncountedProductCount: products.length - scored.length,
    averageAccuracyPercent,
    products,
  }
}
