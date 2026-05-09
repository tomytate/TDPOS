import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import { getRecentSyncErrors } from '../lib/support-bundle'

interface UseRecentSyncErrorsOptions {
  enabled?: boolean
  limit?: number
}

export function useRecentSyncErrors(options: UseRecentSyncErrorsOptions = {}) {
  const db = useSQLiteContext()
  const limit = options.limit ?? 10

  return useQuery({
    queryKey: ['recent-sync-errors', limit],
    queryFn: () => getRecentSyncErrors(db, limit),
    enabled: options.enabled ?? true,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  })
}
