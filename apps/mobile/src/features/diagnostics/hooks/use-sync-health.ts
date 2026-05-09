import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import { getSyncHealth } from '../lib/sync-health'

interface UseSyncHealthOptions {
  enabled?: boolean
}

export function useSyncHealth(options: UseSyncHealthOptions = {}) {
  const db = useSQLiteContext()

  return useQuery({
    queryKey: ['sync-health'],
    queryFn: () => getSyncHealth(db),
    enabled: options.enabled ?? true,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  })
}
