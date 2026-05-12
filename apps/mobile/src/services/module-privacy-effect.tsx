// Mounted module privacy cleanup.
// Watches cached entitlement modules and applies local PII cleanup whenever
// customer-facing modules turn off while the app is open.

import { useEffect, useRef } from 'react'
import { useSQLiteContext } from 'expo-sqlite'

import { clearLocalCachesForDisabledModules } from '@/services/module-privacy'
import { warnSafe } from '@/services/safe-logger'
import { useAuthStore } from '@/stores/auth-store'

export function ModulePrivacyCleanupEffect() {
  const db = useSQLiteContext()
  const modules = useAuthStore((state) => state.modules)
  const previousModulesRef = useRef(modules)

  useEffect(() => {
    const previousModules = previousModulesRef.current
    previousModulesRef.current = modules

    void clearLocalCachesForDisabledModules({
      db,
      previousModules,
      nextModules: modules,
    }).catch((err) => {
      warnSafe('[ModulePrivacy] local cleanup failed', err)
    })
  }, [db, modules])

  return null
}
