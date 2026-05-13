#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const migrationsPath = path.join(repoRoot, 'apps/mobile/src/db/migrations.ts')
const text = fs.readFileSync(migrationsPath, 'utf8')

const registryMatch = text.match(/export const LOCAL_MIGRATIONS:[\s\S]*?= \[([\s\S]*?)\]\n/)
if (!registryMatch) {
  fail(['Could not find LOCAL_MIGRATIONS registry in apps/mobile/src/db/migrations.ts.'])
}

const registryText = registryMatch[1]
const versionMatches = [...registryText.matchAll(/version:\s*(\d+)/g)].map((match) =>
  Number(match[1]),
)
const sqlReferences = [...registryText.matchAll(/sql:\s*([A-Z0-9_]+)/g)].map((match) => match[1])
const sqlConstants = [...text.matchAll(/export const (LOCAL_[A-Z0-9_]+_SQL)\s*=/g)].map(
  (match) => match[1],
)

const failures = []

if (versionMatches.length === 0) {
  failures.push('LOCAL_MIGRATIONS must contain at least one migration version.')
}

const seen = new Set()
for (const version of versionMatches) {
  if (seen.has(version)) failures.push(`Duplicate local migration version: ${version}.`)
  seen.add(version)
}

for (let index = 0; index < versionMatches.length; index += 1) {
  const expected = index + 1
  const actual = versionMatches[index]
  if (actual !== expected) {
    failures.push(
      `LOCAL_MIGRATIONS must be contiguous and sorted: expected version ${expected} at index ${index}, found ${actual}.`,
    )
    break
  }
}

if (!/version:\s*1[\s\S]*?sql:\s*LOCAL_SCHEMA_SQL/.test(registryText)) {
  failures.push('Local migration version 1 must embed LOCAL_SCHEMA_SQL.')
}

for (const constantName of sqlConstants) {
  if (!sqlReferences.includes(constantName)) {
    failures.push(`${constantName} is exported but not registered in LOCAL_MIGRATIONS.`)
  }
}

for (const sqlReference of sqlReferences) {
  if (sqlReference !== 'LOCAL_SCHEMA_SQL' && !sqlConstants.includes(sqlReference)) {
    failures.push(`${sqlReference} is registered but no exported SQL constant defines it.`)
  }
}

if (failures.length > 0) fail(failures)

console.log(`Local SQLite migration registry is ordered through v${versionMatches.at(-1)}.`)

function fail(failures) {
  console.error('Local SQLite migration registry check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
