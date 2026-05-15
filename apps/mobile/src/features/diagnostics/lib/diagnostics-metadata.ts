import { APP_VERSION } from '@/constants/app'
import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { getOrCreateInstallId, type InstallIdStorage } from '@/services/device-identity'
import {
  getLatestPerformanceMetrics,
  type PerformanceMetricSummary,
} from '@/services/performance-metrics'
import type { DevicePairingStatus, ModuleName, SubscriptionTier, UserRole } from '@tdpos/shared'

interface SchemaVersionRow {
  version: number | null
}

export interface DiagnosticsIdentitySnapshot {
  role: UserRole | null
  branchCode: string | null
  branchName: string | null
  cashierCode: string | null
  devicePairingStatus?: DevicePairingStatus | null
  devicePairingId?: string | null
  devicePairedAt?: string | null
  subscriptionTier?: SubscriptionTier | null
  modules?: Record<ModuleName, boolean> | null
  entitlementsValidUntil?: string | null
  lastServerHandshakeAt?: string | null
}

export interface DiagnosticsStorage extends InstallIdStorage {
  readonly size: number
  getAllKeys(): string[]
}

export interface DiagnosticsDeviceStorageSnapshot {
  availableDiskBytes: number | null
  totalDiskBytes: number | null
}

export interface DiagnosticsMetadata {
  appVersion: string
  schemaVersion: number | null
  installId: string
  role: UserRole | null
  branchCode: string | null
  branchName: string | null
  cashierCode: string | null
  devicePairingStatus: DevicePairingStatus | null
  devicePairingId: string | null
  devicePairedAt: string | null
  subscriptionTier: SubscriptionTier | null
  enabledModuleCount: number
  entitlementsValidUntil: string | null
  lastServerHandshakeAt: string | null
  mmkvSizeBytes: number
  mmkvKeyCount: number
  availableDiskBytes: number | null
  totalDiskBytes: number | null
  performanceMetrics: PerformanceMetricSummary[]
}

export async function getDiagnosticsMetadata(
  db: AsyncSqliteLike,
  identity: DiagnosticsIdentitySnapshot,
  metadataStorage: DiagnosticsStorage,
  deviceStorage: DiagnosticsDeviceStorageSnapshot = {
    availableDiskBytes: null,
    totalDiskBytes: null,
  },
): Promise<DiagnosticsMetadata> {
  const row = await db.getFirstAsync<SchemaVersionRow>(
    `SELECT MAX(version) AS version FROM schema_version`,
    [],
  )

  return {
    appVersion: APP_VERSION,
    schemaVersion: row?.version ?? null,
    installId: getOrCreateInstallId(metadataStorage),
    role: identity.role,
    branchCode: identity.branchCode,
    branchName: identity.branchName,
    cashierCode: identity.cashierCode,
    devicePairingStatus: identity.devicePairingStatus ?? null,
    devicePairingId: identity.devicePairingId ?? null,
    devicePairedAt: identity.devicePairedAt ?? null,
    subscriptionTier: identity.subscriptionTier ?? null,
    enabledModuleCount: identity.modules
      ? Object.values(identity.modules).filter((enabled) => enabled).length
      : 0,
    entitlementsValidUntil: identity.entitlementsValidUntil ?? null,
    lastServerHandshakeAt: identity.lastServerHandshakeAt ?? null,
    mmkvSizeBytes: metadataStorage.size,
    mmkvKeyCount: metadataStorage.getAllKeys().length,
    availableDiskBytes: deviceStorage.availableDiskBytes,
    totalDiskBytes: deviceStorage.totalDiskBytes,
    performanceMetrics: getLatestPerformanceMetrics(metadataStorage),
  }
}
