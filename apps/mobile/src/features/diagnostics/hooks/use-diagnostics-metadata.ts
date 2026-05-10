import { useQuery } from '@tanstack/react-query'
import { Paths } from 'expo-file-system'
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
  const subscriptionTier = useAuthStore((state) => state.subscriptionTier)
  const modules = useAuthStore((state) => state.modules)
  const entitlementsValidUntil = useAuthStore((state) => state.entitlementsValidUntil)

  return useQuery({
    queryKey: [
      'diagnostics-metadata',
      role,
      branchCode,
      branchName,
      cashierCode,
      subscriptionTier,
      modules,
      entitlementsValidUntil,
    ],
    queryFn: () =>
      getDiagnosticsMetadata(
        db,
        {
          role,
          branchCode,
          branchName,
          cashierCode,
          subscriptionTier,
          modules,
          entitlementsValidUntil,
        },
        storage,
        getDeviceStorageSnapshot(),
      ),
    enabled: options.enabled ?? true,
    staleTime: 60 * 1000,
  })
}

function getDeviceStorageSnapshot() {
  return {
    availableDiskBytes: normalizeDiskBytes(Paths.availableDiskSpace),
    totalDiskBytes: normalizeDiskBytes(Paths.totalDiskSpace),
  }
}

function normalizeDiskBytes(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null
}
