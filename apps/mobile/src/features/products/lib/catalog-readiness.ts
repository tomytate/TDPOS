import type { AsyncSqliteLike } from '@/db/async-sqlite'

interface CatalogReadinessRow {
  active_products: number
  active_categories: number
  newest_product_update: number | null
}

export interface CatalogReadiness {
  ready: boolean
  activeProducts: number
  activeCategories: number
  newestProductUpdate: number | null
}

export async function getCatalogReadiness(db: AsyncSqliteLike): Promise<CatalogReadiness> {
  const row = await db.getFirstAsync<CatalogReadinessRow>(
    `
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS active_products,
        (SELECT COUNT(*) FROM categories) AS active_categories,
        (SELECT MAX(updated_at) FROM products WHERE is_active = 1) AS newest_product_update
    `,
    [],
  )

  const activeProducts = row?.active_products ?? 0
  return {
    ready: activeProducts > 0,
    activeProducts,
    activeCategories: row?.active_categories ?? 0,
    newestProductUpdate: row?.newest_product_update ?? null,
  }
}
