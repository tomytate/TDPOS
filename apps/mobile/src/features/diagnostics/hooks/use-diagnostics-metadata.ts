import { useQuery } from '@tanstack/react-query'
import { useSQLiteContext } from 'expo-sqlite'

import { useAuthStore } from '@/stores/auth-store'
import { storage } from '@/services/storage'

import { getDiagnosticsMetadata } from '../lib/diagnostics-metadata'

interface UseDiagnosticsMetadataOptions {
  enabled?: boolean
}

export function useDiagnosticsMetadata(options: UseDiagnosticsMetadataOptions = {}) {
  const db = useSQLiteContext()
  const role = useAuthStore((state) => state.role)
  const branchCode = useAuthStore((state) => state.branchCode)
  const branchName = useAuthStore((state) => state.branchName)
  const cashierCode = useAuthStore((state) => state.cashierCode)

  return useQuery({
    queryKey: ['diagnostics-metadata', role, branchCode, branchName, cashierCode],
    queryFn: () =>
      getDiagnosticsMetadata(
        db,
        {
          role,
          branchCode,
          branchName,
          cashierCode,
        },
        storage,
      ),
    enabled: options.enabled ?? true,
    staleTime: 60 * 1000,
  })
}
