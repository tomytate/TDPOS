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
