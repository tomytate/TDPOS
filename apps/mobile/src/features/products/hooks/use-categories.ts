import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import type { DbCategory } from '@tdpos/db'

export interface CategoryWithCount extends DbCategory {
  product_count: number
}

export function useCategories() {
  const db = useSQLiteContext()

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      db.getAllAsync<CategoryWithCount>(`
        SELECT
          categories.*,
          COUNT(products.id) AS product_count
        FROM categories
        LEFT JOIN products
          ON products.category_id = categories.id
          AND products.is_active = 1
        GROUP BY categories.id
        ORDER BY categories.name COLLATE NOCASE
      `),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
