import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import type { DbProduct } from '@tdpos/db'

export function useProducts(categoryId?: string) {
  const db = useSQLiteContext()
  const selectedCategoryId = categoryId && categoryId !== 'all' ? categoryId : null

  return useQuery({
    queryKey: ['products', categoryId ?? 'all'],
    queryFn: async () => {
      if (selectedCategoryId) {
        return db.getAllAsync<DbProduct>(
          `
            SELECT *
            FROM products
            WHERE is_active = 1 AND category_id = ?
            ORDER BY name COLLATE NOCASE
          `,
          [selectedCategoryId],
        )
      }

      return db.getAllAsync<DbProduct>(
        `
          SELECT *
          FROM products
          WHERE is_active = 1
          ORDER BY name COLLATE NOCASE
        `,
      )
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
