import { createClientOperationId } from '@tdpos/shared'

export const INSTALL_ID_KEY = 'tdpos.install_id'

export interface InstallIdStorage {
  getString(key: string): string | undefined
  set(key: string, value: string): void
}

export function getOrCreateInstallId(
  installStorage: InstallIdStorage,
  createId: () => string = createClientOperationId,
): string {
  const existing = installStorage.getString(INSTALL_ID_KEY)
  if (existing) return existing

  const next = createId()
  installStorage.set(INSTALL_ID_KEY, next)
  return next
}
