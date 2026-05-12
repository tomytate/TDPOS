// Module privacy cleanup.
// When a paid module is disabled, local customer-facing caches must be wiped
// or narrowed on the device. Server history stays intact; this only removes
// local PII surfaces that are no longer entitled.

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import type { ModuleName } from '@tdpos/shared'

type ModuleState = Record<ModuleName, boolean>

export type ModulePrivacyCleanupOutcome = {
  clearedCustomerRows: boolean
  sanitizedFields: string[]
}

const CUSTOMER_CACHE_MODULES: ModuleName[] = ['utang', 'customer_sms', 'loyalty']

function wasDisabled(params: {
  previousModules: ModuleState
  nextModules: ModuleState
  module: ModuleName
}) {
  return (
    params.previousModules[params.module] === true && params.nextModules[params.module] === false
  )
}

function shouldDropCustomerRows(nextModules: ModuleState) {
  return CUSTOMER_CACHE_MODULES.every((module) => nextModules[module] === false)
}

export async function clearLocalCachesForDisabledModules(params: {
  db: AsyncSqliteLike
  previousModules: ModuleState
  nextModules: ModuleState
}): Promise<ModulePrivacyCleanupOutcome> {
  const { db, previousModules, nextModules } = params
  const sanitizedFields: string[] = []
  let clearedCustomerRows = false

  const customerModuleWasDisabled = CUSTOMER_CACHE_MODULES.some((module) =>
    wasDisabled({ previousModules, nextModules, module }),
  )

  if (!customerModuleWasDisabled) {
    return { clearedCustomerRows, sanitizedFields }
  }

  await db.withTransactionAsync(async () => {
    if (shouldDropCustomerRows(nextModules)) {
      await db.runAsync('DELETE FROM customers', [])
      clearedCustomerRows = true
      return
    }

    if (wasDisabled({ previousModules, nextModules, module: 'customer_sms' })) {
      await db.runAsync('UPDATE customers SET phone = NULL', [])
      sanitizedFields.push('customers.phone')
    }

    if (wasDisabled({ previousModules, nextModules, module: 'utang' })) {
      await db.runAsync('UPDATE customers SET total_utang = 0', [])
      sanitizedFields.push('customers.total_utang')
    }

    if (wasDisabled({ previousModules, nextModules, module: 'loyalty' })) {
      await db.runAsync('UPDATE customers SET points_balance = 0', [])
      sanitizedFields.push('customers.points_balance')
    }
  })

  return { clearedCustomerRows, sanitizedFields }
}
