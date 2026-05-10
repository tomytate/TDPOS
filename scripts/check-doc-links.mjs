// DocGate-1: Markdown link integrity checker.
// Walks every committed .md file and verifies every relative link target exists.
// Skips absolute URLs (http, https, mailto), pure anchors, and image links to assets that
// are not yet committed. Anchor fragments are stripped before existence checks so
// links like `[label](path/file.md#section)` only validate the file portion.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const ignoredDirs = new Set([
  '.claude',
  '.claude-flow',
  '.expo',
  '.git',
  '.next',
  '.turbo',
  'android',
  'build',
  'coverage',
  'dist',
  'ios',
  'node_modules',
])

const markdownFiles = []

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (ignoredDirs.has(entry)) continue
      walk(fullPath)
      continue
    }
    if (stat.isFile() && extname(fullPath) === '.md') {
      markdownFiles.push(fullPath)
    }
  }
}

walk(repoRoot)

// Inline link: [label](url) — but not images ![alt](url). Skip images for now (asset paths
// are often placeholders early in the project).
const inlineLink = /(^|[^!])\[([^\]]*?)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

// Reference link definitions: [label]: url
const refLink = /^\[([^\]]+)\]:\s*(\S+)/gm

// External-protocol detection: URL begins with `<scheme>:` where the scheme is letters,
// digits, `+`, `.`, or `-`. Covers http, https, mailto, tel, ftp, etc.
const isExternal = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url)
const isAnchorOnly = (url) => url.startsWith('#')

const failures = []

for (const file of markdownFiles) {
  const relPath = relative(repoRoot, file)
  const content = readFileSync(file, 'utf8')
  const fileDir = dirname(file)

  const seen = new Set()
  const candidates = []

  let match
  while ((match = inlineLink.exec(content)) !== null) {
    candidates.push({ url: match[3], index: match.index + match[1].length })
  }
  while ((match = refLink.exec(content)) !== null) {
    candidates.push({ url: match[2], index: match.index })
  }

  for (const { url, index } of candidates) {
    if (seen.has(url)) continue
    seen.add(url)

    if (isExternal(url) || isAnchorOnly(url)) continue

    const [pathOnly] = url.split('#')
    if (!pathOnly) continue

    const target = resolve(fileDir, pathOnly)
    if (!existsSync(target)) {
      const lineNum = content.slice(0, index).split('\n').length
      failures.push(`${relPath}:${lineNum}  → ${url}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken markdown links (${failures.length}):`)
  for (const f of failures) console.error(`- ${f}`)
  process.exit(1)
}

console.log(`No broken markdown links across ${markdownFiles.length} files.`)
