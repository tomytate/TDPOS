// Local SQLite migration runner — applies versioned schema changes.
// Migrations are registered in LOCAL_MIGRATIONS array (v2-v8).
// Each migration runs exactly once via schema_version tracking.

import type { AsyncSqliteLike } from './async-sqlite'
import { LOCAL_SCHEMA_SQL } from './schema'

export interface LocalMigration {
  version: number
  sql: string
  transactional?: boolean
}

export interface LocalMigrationDb extends AsyncSqliteLike {
  execAsync(sql: string): Promise<void>
}

export const LOCAL_SHIFT_SESSIONS_SQL = `
CREATE TABLE IF NOT EXISTS shift_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  user_id TEXT,
  cashier_code TEXT NOT NULL,
  device_install_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','voided')),
  opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
  closed_at INTEGER,
  opening_cash REAL NOT NULL DEFAULT 0,
  expected_cash REAL,
  counted_cash REAL,
  variance REAL,
  handoff_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_shift_sessions_open
  ON shift_sessions(branch_id, cashier_code, status, opened_at DESC);
`

export const LOCAL_MANAGER_APPROVALS_SQL = `
CREATE TABLE IF NOT EXISTS manager_approval_requests (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  requested_by_user_id TEXT,
  approved_by_user_id TEXT,
  request_type TEXT NOT NULL CHECK(request_type IN ('void','price_override','shift_correction','cash_variance','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','voided')),
  reason TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_manager_approval_requests_pending
  ON manager_approval_requests(branch_id, status, created_at DESC);
`

export const LOCAL_KIOSK_ORDERS_SQL = `
CREATE TABLE IF NOT EXISTS kiosk_orders (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  device_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_staff','confirmed','cancelled')),
  customer_label TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  total_amount REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  confirmed_at INTEGER,
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_kiosk_orders_status
  ON kiosk_orders(branch_id, status, created_at DESC);
`

export const LOCAL_RETURN_REQUESTS_SQL = `
CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY NOT NULL,
  business_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  original_sale_id TEXT,
  compensating_sale_id TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','completed')),
  reason_code TEXT NOT NULL,
  reason_note TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
  ON return_requests(branch_id, status, created_at DESC);
`

export const LOCAL_CUSTOMER_ERASURE_SQL = `
ALTER TABLE customers ADD COLUMN pii_erased INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN erased_at INTEGER;
ALTER TABLE customers ADD COLUMN erased_by TEXT;
ALTER TABLE customers ADD COLUMN erasure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_erased
  ON customers(business_id, erased_at)
  WHERE erased_at IS NOT NULL;
`

export const LOCAL_SALE_CLOCK_METADATA_SQL = `
ALTER TABLE sales ADD COLUMN device_timezone TEXT;
ALTER TABLE sales ADD COLUMN synced_server_time_at_last_handshake TEXT;
`

export const LOCAL_STOCK_TAKE_COUNTS_SQL = `
CREATE TABLE IF NOT EXISTS stock_take_counts (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  branch_id TEXT NOT NULL,
  counted_stock_pieces INTEGER NOT NULL,
  system_stock_pieces_before INTEGER NOT NULL,
  pieces_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reason_note TEXT,
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_stock_take_counts_latest
  ON stock_take_counts(product_id, created_at DESC);
`

export const LOCAL_MIGRATIONS: LocalMigration[] = [
  {
    version: 1,
    sql: LOCAL_SCHEMA_SQL,
    transactional: false,
  },
  {
    version: 2,
    sql: LOCAL_SHIFT_SESSIONS_SQL,
  },
  {
    version: 3,
    sql: LOCAL_MANAGER_APPROVALS_SQL,
  },
  {
    version: 4,
    sql: LOCAL_KIOSK_ORDERS_SQL,
  },
  {
    version: 5,
    sql: LOCAL_RETURN_REQUESTS_SQL,
  },
  {
    version: 6,
    sql: LOCAL_CUSTOMER_ERASURE_SQL,
  },
  {
    version: 7,
    sql: LOCAL_SALE_CLOCK_METADATA_SQL,
  },
  {
    version: 8,
    sql: LOCAL_STOCK_TAKE_COUNTS_SQL,
  },
]

interface SchemaVersionRow {
  version: number
}

export async function runLocalMigrations(
  db: LocalMigrationDb,
  migrations: LocalMigration[] = LOCAL_MIGRATIONS,
) {
  await db.execAsync(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`)

  const appliedRows = await db.getAllAsync<SchemaVersionRow>(
    `SELECT version FROM schema_version`,
    [],
  )
  const appliedVersions = new Set(appliedRows.map((row) => row.version))
  const orderedMigrations = [...migrations].sort((a, b) => a.version - b.version)

  for (const migration of orderedMigrations) {
    if (appliedVersions.has(migration.version)) continue

    if (migration.transactional === false) {
      await db.execAsync(migration.sql)
      await recordAppliedMigration(db, migration.version)
    } else {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql)
        await recordAppliedMigration(db, migration.version)
      })
    }

    appliedVersions.add(migration.version)
  }
}

async function recordAppliedMigration(db: LocalMigrationDb, version: number) {
  await db.runAsync(`INSERT OR IGNORE INTO schema_version (version) VALUES (?)`, [version])
}
