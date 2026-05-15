---
name: testing-patterns
description: Use this skill when writing tests, debugging test failures, or adding new test files. TD POS uses Bun's built-in test runner with bun:sqlite for fast in-memory database testing. Tests are co-located with source.
version: 1.0.0
---

# Testing Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate Jest patterns (`describe.each`, `jest.mock()`, `jest.fn()`) or Vitest patterns. TD POS uses **Bun's built-in test runner** — `bun:test`. The API is similar to Jest but not identical.

## Test Runner: Bun Test

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
```

### Key Differences from Jest

| Jest (❌) | Bun (✅) |
| --- | --- |
| `jest.fn()` | `() => {}` or inline mock |
| `jest.mock('module')` | Not available — use dependency injection |
| `jest.spyOn()` | Not available — design for testability |
| `describe.each()` | Use a `for` loop inside `describe` |
| `expect(x).toHaveBeenCalled()` | Track calls manually |

## Database Testing Pattern

The project uses `bun:sqlite` (Bun's native SQLite) to create fast in-memory databases for tests. The `AsyncSqliteLike` interface bridges expo-sqlite's async API to Bun's sync API.

```typescript
import { Database } from 'bun:sqlite'
import { createBunSqliteAdapter } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'

describe('inventory operations', () => {
  let db: AsyncSqliteLike

  beforeEach(() => {
    const raw = new Database(':memory:')
    db = createBunSqliteAdapter(raw)
    // Apply the same schema used in production
    raw.exec(LOCAL_SCHEMA_SQL)
  })

  it('decrements stock by pieces_per_pack when selling a pack', async () => {
    // Seed a product
    await db.runAsync(
      'INSERT INTO products (id, business_id, name, price_per_piece, stock_pieces, pieces_per_pack) VALUES (?, ?, ?, ?, ?, ?)',
      ['p1', 'b1', 'Shampoo Sachet', 8, 24, 12],
    )

    // Execute sale of 1 pack
    await db.runAsync('UPDATE products SET stock_pieces = stock_pieces - ? WHERE id = ?', [12, 'p1'])

    // Verify
    const row = await db.getFirstAsync('SELECT stock_pieces FROM products WHERE id = ?', ['p1'])
    expect(row.stock_pieces).toBe(12)
  })
})
```

## Pure Function Testing

Business logic in `lib/` directories should be pure functions that take data in and return data out — no database or React dependencies.

```typescript
// In features/sales/lib/calculate-cart.ts
export const calculateCartTotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

// In features/sales/lib/calculate-cart.test.ts
import { calculateCartTotal } from './calculate-cart'

it('sums item totals', () => {
  expect(
    calculateCartTotal([
      { quantity: 2, unitPrice: 15 },
      { quantity: 1, unitPrice: 25 },
    ]),
  ).toBe(55)
})
```

## Required Spec Tests (§14)

These 6 tests are mandatory and must always pass:

1. **Tingi math:** Sell 7 from 12-pack → 5 remaining
2. **Delta concurrency:** Two offline branches sell 1 of 2 → stock = 0
3. **Negative stock guard:** Sale exceeding stock → `pending_sync_review`
4. **Idempotency replay:** Same `client_operation_id` twice → one decrement
5. **Receipt collision:** Two offline devices → no collisions
6. **TOCTOU race:** 100 concurrent calls, same op_id → exactly one decrement

## File Naming

Tests are co-located with source:

```
src/features/sales/lib/
  execute-checkout.ts          # Source
  execute-checkout.test.ts     # Test
```

## Running Tests

```bash
bun run test                   # All tests (turbo parallel)
bun run test:mobile            # Mobile tests only
bun test apps/mobile/src/features/sales/  # Specific directory
```

## Current Metrics

- **140 tests** across 26 files (104 mobile + 36 shared)
- All tests complete in < 1 second
- Zero external dependencies — tests run offline

## Sources

- Test runner: Bun built-in (`bun:test`)
- SQLite adapter: `apps/mobile/src/db/async-sqlite.ts`
- Architecture: [../architecture.md](../architecture.md) (ADR-012 AsyncSqliteLike Test Interface)
- Spec requirements: [../spec-v5.md](../spec-v5.md) (§14)
- Last verified: 2026-05-15
