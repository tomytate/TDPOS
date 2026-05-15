# Testing Guide

## Overview

TD POS uses **Bun's built-in test runner** for all tests. The test suite focuses on business-critical logic that runs against real SQLite databases.

- **144 tests** across **28 files**
- **108 mobile** tests (26 files) + **36 shared** tests (2 files)
- **~1 second** total runtime

## Running Tests

```bash
# All tests
bun run test

# Mobile tests only
bun run test:mobile

# Single file
bun test apps/mobile/src/features/sales/lib/execute-checkout.test.ts

# Watch mode
bun test --watch
```

## Test Structure

### Shared Tests (`packages/shared/`)

| File                                 | Tests | What it covers                                                                                                     |
| ------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `utils/index.test.ts`                | ~15   | Money formatting, stock splitting, receipt generation, phone validation, device pairing codes, heartbeat freshness |
| `constants/tier-definitions.test.ts` | ~19   | Tier structural integrity, legacy mapping, surface visibility, module state                                        |

### Mobile Tests (`apps/mobile/src/`)

| File                                                 | Tests | What it covers                                                                           |
| ---------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `features/sales/lib/execute-checkout.test.ts`        | ~12   | Full checkout transaction, tingi math, idempotency, insufficient stock, empty cart guard |
| `features/sales/lib/execute-void-sale.test.ts`       | ~10   | Void compensating entry, stock restoration, same-day guard, double-void prevention       |
| `features/inventory/lib/execute-stock-take.test.ts`  | ~8    | Stock adjustment, delta sync envelope, reason codes                                      |
| `features/inventory/lib/stock-accuracy.test.ts`      | ~5    | SAS computation, no-data handling                                                        |
| `features/kiosk/lib/kiosk-orders.test.ts`            | ~7    | Order lifecycle, awaiting_staff flow, staff confirm/cancel                               |
| `features/returns/lib/return-requests.test.ts`       | ~10   | Return lifecycle, ADR-011 immutability, receipt lookup                                   |
| `features/diagnostics/lib/local-data-export.test.ts` | ~5    | Recovery export format, sanitized output                                                 |
| `services/sync-processor.test.ts`                    | ~6    | Sync batch processing, error handling, retry logic                                       |
| `services/entitlement-cache.test.ts`                 | ~10   | Fail-closed logic, 7-day grace, Tier A exemption                                         |
| `services/catalog-refresh.test.ts`                   | ~7    | Remote-to-local sync, stock preservation with unsynced deltas                            |
| `services/device-heartbeat.test.ts`                  | ~3    | Heartbeat upsert, snapshot format                                                        |
| `services/device-pairing.test.ts`                    | ~5    | Code consumption, error cases, response parsing                                          |
| `db/migrations.test.ts`                              | ~6    | Migration ordering, idempotency, version tracking                                        |

## Writing Tests

### Pattern: SQLite Integration Tests

Most mobile tests create a real in-memory SQLite database:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import Database from 'bun:sqlite'
import { LOCAL_SCHEMA_SQL } from '../../../db/schema'

// Adapter to match expo-sqlite async API
function wrapBunSqlite(bunDb: ReturnType<typeof Database>) {
  return {
    getAllAsync: async <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
      bunDb.prepare(sql).all(...params) as T[],
    runAsync: async (sql: string, params: unknown[] = []) => {
      const result = bunDb.prepare(sql).run(...params)
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId }
    },
    getFirstAsync: async <T>(sql: string, params: unknown[] = []): Promise<T | null> =>
      (bunDb.prepare(sql).get(...params) as T) ?? null,
    execAsync: async (sql: string) => bunDb.exec(sql),
    withTransactionAsync: async (fn: () => Promise<void>) => {
      bunDb.exec('BEGIN')
      try {
        await fn()
        bunDb.exec('COMMIT')
      } catch (e) {
        bunDb.exec('ROLLBACK')
        throw e
      }
    },
  }
}

describe('your feature', () => {
  let db: ReturnType<typeof wrapBunSqlite>

  beforeEach(() => {
    const bunDb = new Database(':memory:')
    bunDb.exec(LOCAL_SCHEMA_SQL)
    db = wrapBunSqlite(bunDb)
  })

  test('does the thing', async () => {
    // ... test with real SQLite
  })
})
```

### Pattern: Pure Function Tests

For shared utilities, no database needed:

```typescript
import { describe, test, expect } from 'bun:test'
import { splitStock, displayStock } from './index'

describe('splitStock', () => {
  test('splits 47 pieces with 12 per pack', () => {
    expect(splitStock(47, 12)).toEqual({ packs: 3, loosePieces: 11 })
  })
})
```

## Required Tests (§14 of Spec)

Six mandatory Phase 1 tests that must always pass:

1. **Tingi math** — sell 7 from 12-sachet pack → 5 remaining
2. **Delta concurrency** — two offline branches, both sell 1 of 2
3. **Negative stock guard** — sale exceeding stock → `pending_sync_review`
4. **Idempotency replay** — same `client_operation_id` twice → one decrement
5. **Receipt collision** — two offline devices, no collisions
6. **TOCTOU race** — 100 concurrent calls, same op_id → exactly one decrement

## Test Conventions

- **File location:** co-locate tests with source: `feature.ts` → `feature.test.ts`
- **Describe blocks:** use the module name or feature area
- **Test names:** describe the behavior, not the implementation
- **Assertions:** use `expect()` — the gate counts expect() calls for coverage evidence
- **No mocking SQLite:** use real in-memory databases for integration tests
- **Strict TypeScript:** tests run under `strict: true` — no `any` or `@ts-ignore`
