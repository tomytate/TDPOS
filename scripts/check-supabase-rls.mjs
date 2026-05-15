#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

function normalizeTableName(raw) {
  return raw.replaceAll('"', '').replace(/^public\./, '')
}

function collectMatches(sql, regex) {
  const names = new Set()
  for (const match of sql.matchAll(regex)) {
    if (match[1]) names.add(normalizeTableName(match[1]))
  }
  return names
}

const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b))

let sql = ''
for (const file of files) {
  sql += `\n-- ${file}\n${readFileSync(join(migrationsDir, file), 'utf8')}\n`
}

const createdTables = collectMatches(
  sql,
  /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"?public"?\.)?"?[a-zA-Z_][\w]*"?)/gi,
)
const rlsTables = collectMatches(
  sql,
  /\bALTER\s+TABLE\s+((?:"?public"?\.)?"?[a-zA-Z_][\w]*"?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\b/gi,
)

const missing = [...createdTables].filter((table) => !rlsTables.has(table)).sort()

if (missing.length > 0) {
  console.error('Supabase tables missing ENABLE ROW LEVEL SECURITY:')
  for (const table of missing) console.error(`- ${table}`)
  process.exit(1)
}

console.log(`All ${createdTables.size} Supabase tables enable RLS in migrations.`)
