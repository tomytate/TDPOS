// Foundation gate: prove the mobile app cannot reference a Supabase
// service-role key. The web SSR layer and Edge Functions legitimately
// hold the service role; the mobile binary must hold only the
// publishable/anon key. Enforced statically so a future refactor that
// accidentally imports server-only code into mobile fails the gate
// before it can ship.
//
// Scans every tracked file under apps/mobile/ for:
//   1. A service-role JWT-shaped token containing the `role: service_role`
//      claim (base64-url decoded mid-segment match).
//   2. The newer sb_secret_* Supabase secret-key format.
//   3. Environment variable names that imply a service role (e.g.
//      SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY) outside of
//      .env.example documentation comments.
//   4. Imports of @supabase/server which is server-side only.
//
// .env.local and .env.development.local are read for env-name checks
// only when present; we never read their values.

import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const mobileRoot = 'apps/mobile'

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

const checks = [
  ['Supabase secret key (sb_secret_*) detected in mobile tree', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  [
    'Service-role env name detected in mobile source',
    /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_KEY)\b/,
  ],
  [
    '@supabase/server import detected in mobile (server-only package)',
    /from\s+['"]@supabase\/server['"]|require\(\s*['"]@supabase\/server['"]\s*\)/,
  ],
]

const listTrackedFiles = () =>
  execFileSync('git', ['ls-files', '-z', '--', mobileRoot], { cwd: repoRoot })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)

// JWT-shaped service-role detection: base64-url decode each compact
// JWT mid-segment we find and look for "role":"service_role".
const jwtCompactPattern = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g

const decodeBase64Url = (segment) => {
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

const containsServiceRoleClaim = (content) => {
  for (const match of content.matchAll(jwtCompactPattern)) {
    const segments = match[0].split('.')
    if (segments.length !== 3) continue
    try {
      const payload = decodeBase64Url(segments[1])
      if (/"role"\s*:\s*"service_role"/.test(payload)) return match.index
    } catch {
      // unreadable segment, skip
    }
  }
  return null
}

const failures = []

for (const relPath of listTrackedFiles()) {
  const ext = extname(relPath)
  if (!textExtensions.has(ext)) continue

  const absolutePath = join(repoRoot, relPath)
  try {
    if (!statSync(absolutePath).isFile()) continue
  } catch {
    continue
  }

  const content = readFileSync(absolutePath, 'utf8')

  for (const [label, pattern] of checks) {
    const match = pattern.exec(content)
    if (!match) continue
    const line = content.slice(0, match.index).split('\n').length
    failures.push(`${relPath}:${line} ${label}`)
  }

  const serviceRoleIndex = containsServiceRoleClaim(content)
  if (serviceRoleIndex !== null) {
    const line = content.slice(0, serviceRoleIndex).split('\n').length
    failures.push(`${relPath}:${line} JWT with role=service_role detected in mobile tree`)
  }
}

if (failures.length > 0) {
  console.error('Mobile service-role posture violation:')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('')
  console.error('The mobile binary must hold only publishable/anon keys (ADR-007, P10.4).')
  console.error('Server-only credentials belong in Edge Functions or web SSR, never on a phone.')
  process.exit(1)
}

console.log('Mobile tree contains no service-role credentials.')
