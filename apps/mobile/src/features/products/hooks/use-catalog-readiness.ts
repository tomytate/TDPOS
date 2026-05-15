import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import { getCatalogReadiness } from '../lib/catalog-readiness'

export function useCatalogReadiness() {
  const db = useSQLiteContext()

  return useQuery({
    queryKey: ['catalog-readiness'],
    queryFn: () => getCatalogReadiness(db),
    staleTime: 60 * 1000,
  })
}
