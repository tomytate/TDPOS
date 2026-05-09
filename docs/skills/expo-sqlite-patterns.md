---
name: expo-sqlite-patterns
description: Use this skill when working with the local database, migrations, queries, or the SQLiteProvider. Agents commonly hallucinate the OLD synchronous expo-sqlite API or Drizzle ORM patterns. SDK 55 uses the ASYNC API exclusively.
version: 1.0.0
---

# expo-sqlite — Async API (SDK 55)

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate `SQLite.openDatabase('db.db')` — this is the **LEGACY API** (deprecated, moved to `expo-sqlite/legacy`). SDK 55 uses `SQLiteProvider` + `useSQLiteContext` exclusively.

## Correct Pattern: Provider + Context Hook

```tsx
// 1. Wrap app in SQLiteProvider (in _layout.tsx)
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite'

async function initializeDatabase(db: SQLiteDatabase) {
  // Run migrations here — called once when DB is first opened
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stock_pieces INTEGER NOT NULL DEFAULT 0,
      pieces_per_pack INTEGER NOT NULL DEFAULT 1
    );
  `)
}

export default function App() {
  return (
    <SQLiteProvider databaseName="tdpos.db" onInit={initializeDatabase}>
      <MainApp />
    </SQLiteProvider>
  )
}
```

```tsx
// 2. Access DB via hook in any child component
import { useSQLiteContext } from 'expo-sqlite'

function ProductList() {
  const db = useSQLiteContext()
  const [products, setProducts] = useState([])

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    const rows = await db.getAllAsync('SELECT * FROM products WHERE is_active = 1')
    setProducts(rows)
  }

  async function addProduct(product: Product) {
    await db.runAsync(
      'INSERT INTO products (id, name, stock_pieces, pieces_per_pack) VALUES (?, ?, ?, ?)',
      [product.id, product.name, product.stock_pieces, product.pieces_per_pack]
    )
    await loadProducts()
  }
}
```

## Key Async Methods

| Method | Returns | Use for |
|---|---|---|
| `db.execAsync(sql)` | void | DDL, multi-statement, pragmas |
| `db.getAllAsync(sql, params?)` | Row[] | SELECT queries (all rows) |
| `db.getFirstAsync(sql, params?)` | Row \| null | SELECT single row |
| `db.runAsync(sql, params?)` | RunResult | INSERT, UPDATE, DELETE |

`RunResult` contains: `{ lastInsertRowId: number, changes: number }`

## Transaction Pattern

```tsx
await db.withTransactionAsync(async () => {
  await db.runAsync('UPDATE products SET stock_pieces = stock_pieces - ? WHERE id = ?', [delta, productId])
  await db.runAsync(
    'INSERT INTO sync_queue (client_operation_id, table_name, record_id, operation, payload) VALUES (?, ?, ?, ?, ?)',
    [opId, 'products', productId, 'DELTA', JSON.stringify({ delta })]
  )
})
```

## ❌ DO NOT USE (Legacy/Wrong Patterns)

```tsx
// ❌ WRONG — Legacy synchronous API
import * as SQLite from 'expo-sqlite'
const db = SQLite.openDatabase('db.db')
db.transaction(tx => { tx.executeSql('SELECT...') })

// ❌ WRONG — Drizzle ORM (we use raw SQL for sync_queue control)
import { drizzle } from 'drizzle-orm/expo-sqlite'

// ✅ CORRECT — Async API via Provider
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
const db = useSQLiteContext()
await db.getAllAsync('SELECT * FROM products')
```

## Sources

- Package: `expo-sqlite@^55.0.0` (verified against `apps/mobile/package.json`)
- Official docs: <https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/>
- API reference: <https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/#sqliteprovider>
- Implementation: `apps/mobile/src/db/init.ts`, `apps/mobile/src/db/schema.ts`, `apps/mobile/src/features/sales/lib/execute-checkout.ts`, `apps/mobile/src/db/async-sqlite.ts` (test-friendly interface)
- Last verified: 2026-05-09
