#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const checks = [
  {
    name: 'Node.js',
    command: ['node', '--version'],
    expected: '24.x LTS',
    validate: (version) => /^v24\./.test(version),
  },
  {
    name: 'Bun',
    command: ['bun', '--version'],
    expected: '1.3.13',
    validate: (version) => version === '1.3.13',
  },
  {
    name: 'Supabase CLI',
    command: ['supabase', '--version'],
    expected: 'installed',
    validate: (version) => version.length > 0,
  },
  {
    name: 'EAS CLI runner',
    command: ['eas', '--version'],
    fallbackCommand: ['bunx', '--version'],
    expected: 'available as eas or bunx',
    validate: (version) => version.length > 0,
  },
]

function run(command) {
  const result = spawnSync(command[0], command.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    return { ok: false, output: result.error.message }
  }

  const output = `${result.stdout}${result.stderr}`.trim()
  return { ok: result.status === 0, output }
}

let failed = 0

for (const check of checks) {
  const primary = run(check.command)
  const result = primary.ok || !check.fallbackCommand ? primary : run(check.fallbackCommand)
  const firstLine = result.output.split('\n')[0]?.trim() ?? ''
  const ok = result.ok && check.validate(firstLine)

  if (ok) {
    console.log(`OK ${check.name}: ${firstLine}`)
  } else {
    failed += 1
    console.error(
      `FAIL ${check.name}: expected ${check.expected}; got ${firstLine || result.output || 'not installed'}`,
    )
  }
}

if (failed > 0) {
  console.error(`\n${failed} toolchain check(s) failed.`)
  process.exit(1)
}

console.log('\nToolchain matches the TD POS baseline.')
