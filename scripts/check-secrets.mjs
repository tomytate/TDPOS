import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const ignoredFiles = new Set(['bun.lock', 'UI/b_g4eU9LYiRKM/pnpm-lock.yaml'])
const textExtensions = new Set([
  '',
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.sql',
  '.toml',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
])

const secretPatterns = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ['JWT-like token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ['PayMongo secret key', /\bsk_(?:test|live)_[A-Za-z0-9]{20,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
]

const sensitiveEnvName = (name) => {
  if (/(^|_)PUBLIC(_|$)|(^|_)PUBLISHABLE(_|$)/i.test(name)) return false
  return /(SECRET|TOKEN|PRIVATE|SERVICE_ROLE|API_KEY)/i.test(name)
}

const placeholderValue = (value) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '')
  if (!trimmed) return true
  if (/^(<.*>|your[-_].*|replace[_-]?me|changeme|todo|example|env\(.*\))$/i.test(trimmed)) {
    return true
  }
  return false
}

const listTrackedFiles = () =>
  execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)

const failures = []

for (const relPath of listTrackedFiles()) {
  if (ignoredFiles.has(relPath)) continue
  if (!textExtensions.has(extname(relPath))) continue

  const absolutePath = join(repoRoot, relPath)
  const content = readFileSync(absolutePath, 'utf8')
  if (content.includes('\0')) continue

  for (const [label, pattern] of secretPatterns) {
    const match = pattern.exec(content)
    if (!match) continue
    const line = content.slice(0, match.index).split('\n').length
    failures.push(`${relative(repoRoot, absolutePath)}:${line} ${label}`)
  }

  const lines = content.split('\n')
  lines.forEach((lineText, index) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^#\n]*)/.exec(lineText)
    if (!match) return

    const [, name, value] = match
    if (!sensitiveEnvName(name)) return
    if (placeholderValue(value)) return

    failures.push(`${relative(repoRoot, absolutePath)}:${index + 1} non-empty sensitive env value`)
  })
}

if (failures.length > 0) {
  console.error('Possible committed secrets found:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('No committed secret patterns found.')
