import type { SQLiteDatabase } from 'expo-sqlite'

import { runLocalMigrations } from './migrations'
import { seedDevDatabase } from './seed-dev'

export async function initializeDatabase(db: SQLiteDatabase) {
  await runLocalMigrations(db)
  if (__DEV__) {
    await seedDevDatabase(db)
  }
}
