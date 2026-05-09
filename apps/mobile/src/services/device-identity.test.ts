import { describe, expect, test } from 'bun:test'

import { getOrCreateInstallId, INSTALL_ID_KEY, type InstallIdStorage } from './device-identity'

function memoryStorage(): InstallIdStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getString: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value)
    },
  }
}

describe('getOrCreateInstallId', () => {
  test('creates and persists an install id once', () => {
    const storage = memoryStorage()
    let sequence = 0

    const first = getOrCreateInstallId(storage, () => `install-${(sequence += 1)}`)
    const second = getOrCreateInstallId(storage, () => `install-${(sequence += 1)}`)

    expect(first).toBe('install-1')
    expect(second).toBe('install-1')
    expect(storage.values.get(INSTALL_ID_KEY)).toBe('install-1')
  })
})
