// DocGate-3 enforcer.
//
// Every file in docs/skills/ must:
//   1. Begin with a YAML frontmatter block containing `name:` and `description:`.
//   2. Contain a `## Sources` heading.
//   3. Contain a `Last verified:` line with an ISO date YYYY-MM-DD.
//
// Locks in the DocGate-3 work from 2026-05-09 so future PRs that add a new
// skill or tweak an old one cannot silently regress the official-source
// alignment rule.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const skillsDir = join(repoRoot, 'docs', 'skills')

const skillFiles = readdirSync(skillsDir)
  .filter((entry) => extname(entry) === '.md')
  .map((entry) => join(skillsDir, entry))
  .filter((path) => statSync(path).isFile())

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/
const NAME_RE = /^name:\s*\S+/m
const DESCRIPTION_RE = /^description:\s*\S/m
const SOURCES_HEADING_RE = /^##\s+Sources\b/m
const LAST_VERIFIED_RE = /Last verified:\s*(\d{4}-\d{2}-\d{2})/

const failures = []

for (const file of skillFiles) {
  const rel = relative(repoRoot, file)
  const content = readFileSync(file, 'utf8')

  const frontmatter = FRONTMATTER_RE.exec(content)
  if (!frontmatter) {
    failures.push(`${rel}: missing YAML frontmatter (--- ... ---)`)
    continue
  }

  const fmBody = frontmatter[1] ?? ''
  if (!NAME_RE.test(fmBody)) failures.push(`${rel}: frontmatter missing 'name:' field`)
  if (!DESCRIPTION_RE.test(fmBody))
    failures.push(`${rel}: frontmatter missing 'description:' field`)

  if (!SOURCES_HEADING_RE.test(content)) {
    failures.push(`${rel}: missing '## Sources' section (DocGate-3)`)
  }

  const verified = LAST_VERIFIED_RE.exec(content)
  if (!verified) {
    failures.push(`${rel}: missing 'Last verified: YYYY-MM-DD' line (DocGate-3)`)
  } else {
    const date = verified[1]
    if (date && Number.isNaN(Date.parse(date))) {
      failures.push(`${rel}: 'Last verified: ${date}' is not a parseable date`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Skill-doc gate failures (${failures.length}):`)
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log(`All ${skillFiles.length} skill docs satisfy DocGate-3.`)
