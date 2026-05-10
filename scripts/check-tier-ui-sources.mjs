#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const constantsPath = path.join(repoRoot, 'packages/shared/src/constants/index.ts')
const constantsText = fs.readFileSync(constantsPath, 'utf8')

const sourceMatches = [...constantsText.matchAll(/uiSource:\s*'([^']+)'/g)].map((match) => match[1])
const uniqueSources = [...new Set(sourceMatches)]

const failures = []
if (uniqueSources.length !== 5) {
  failures.push(
    `Expected 5 unique tier UI sources in packages/shared/src/constants/index.ts, found ${uniqueSources.length}.`,
  )
}

for (const source of uniqueSources) {
  const absolute = path.join(repoRoot, source)
  if (!source.startsWith('UI/')) {
    failures.push(`${source} must stay inside the root UI/ reference canvas.`)
  } else if (!fs.existsSync(absolute)) {
    failures.push(`${source} does not exist.`)
  }
}

if (failures.length > 0) {
  console.error('Tier UI source check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`All ${uniqueSources.length} tier UI source files exist.`)
