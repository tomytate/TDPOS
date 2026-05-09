import { APP_VERSION } from '@/constants/app'
import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { getOrCreateInstallId, type InstallIdStorage } from '@/services/device-identity'
import type { UserRole } from '@tdpos/shared'

interface SchemaVersionRow {
  version: number | null
}

export interface DiagnosticsIdentitySnapshot {
  role: UserRole | null
  branchCode: string | null
  branchName: string | null
  cashierCode: string | null
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
  mmkvSizeBytes: number
  mmkvKeyCount: number
  availableDiskBytes: number | null
  totalDiskBytes: number | null
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
    mmkvSizeBytes: metadataStorage.size,
    mmkvKeyCount: metadataStorage.getAllKeys().length,
    availableDiskBytes: deviceStorage.availableDiskBytes,
    totalDiskBytes: deviceStorage.totalDiskBytes,
  }
}
