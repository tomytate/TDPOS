import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const migrationPath = join(repoRoot, 'apps/mobile/src/db/migrations/001_initial_schema.sql')
const embeddedPath = join(repoRoot, 'apps/mobile/src/db/schema.ts')

const migrationSql = readFileSync(migrationPath, 'utf8')
const embeddedSource = readFileSync(embeddedPath, 'utf8')
const embeddedMatch = embeddedSource.match(/export const LOCAL_SCHEMA_SQL = `([\s\S]*)`\s*$/)

if (!embeddedMatch) {
  console.error('Could not find LOCAL_SCHEMA_SQL in apps/mobile/src/db/schema.ts')
  process.exit(1)
}

const normalize = (sql) =>
  sql
    .replace(/\r\n/g, '\n')
    .replace(/^\s*--.*$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

if (normalize(migrationSql) !== normalize(embeddedMatch[1])) {
  console.error(
    'Local SQLite schema drift detected: keep 001_initial_schema.sql and LOCAL_SCHEMA_SQL in sync.',
  )
  process.exit(1)
}

console.log('Local SQLite schema is in sync.')
