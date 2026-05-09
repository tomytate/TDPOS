import type { SQLiteDatabase } from 'expo-sqlite'

import { LOCAL_SCHEMA_SQL } from './schema'
import { seedDevDatabase } from './seed-dev'

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(LOCAL_SCHEMA_SQL)
  if (__DEV__) {
    await seedDevDatabase(db)
  }
}
