import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const roots = ['apps', 'packages', 'supabase']
const extraFiles = ['.env.example', 'eas.json', 'eslint.config.mjs', 'package.json', 'turbo.json']
const ignoredDirs = new Set([
  '.expo',
  '.next',
  '.turbo',
  'android',
  'build',
  'coverage',
  'dist',
  'ios',
  'node_modules',
])
const extensions = new Set([
  '.cjs',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
])

const checks = [
  ['legacy SQLite API', /SQLite\.openDatabase/],
  ['removed Expo background fetch', /expo-background-fetch/],
  ['Next.js middleware file', /middleware\.ts/],
  ['Supabase SSR getSession auth check', /getSession\s*\(/],
  ['AsyncStorage persistence', /AsyncStorage/],
  ['fabricated thermal printer package', /react-native-thermal-printer-driver/],
  ['Turborepo pipeline key', /"pipeline"\s*:/],
  ['removed Expo newArchEnabled flag', /newArchEnabled/],
  ['Paper v4 DefaultTheme', /\bDefaultTheme\b/],
  ['React Query cacheTime', /\bcacheTime\s*:/],
  ['React Query query onSuccess', /\bonSuccess\s*:/],
  ['legacy Supabase anon env key', /\b(?:EXPO_PUBLIC_|NEXT_PUBLIC_)?SUPABASE_ANON_KEY\b/],
  ['classic Expo build command', /\bexpo build(?::(?:ios|android))?\b/],
  ['unneeded uuid extension', /uuid-ossp/],
  ['BIR compliance claim before accreditation', /BIR-(?:compliant|certified|approved)/i],
  ['Official Receipt wording before accreditation', /Official Receipts?/],
  ['Sales Invoice wording without qualifier', /\bSales Invoice\b/],
]

const files = []

const collect = (absolutePath) => {
  const stats = statSync(absolutePath)

  if (stats.isDirectory()) {
    const name = absolutePath.split('/').at(-1)
    if (name && ignoredDirs.has(name)) return

    for (const child of readdirSync(absolutePath)) {
      collect(join(absolutePath, child))
    }
    return
  }

  if (stats.isFile() && extensions.has(extname(absolutePath))) {
    files.push(absolutePath)
  }
}

for (const root of roots) {
  collect(join(repoRoot, root))
}

for (const file of extraFiles) {
  files.push(join(repoRoot, file))
}

const failures = []

for (const file of files) {
  const relativePath = relative(repoRoot, file)
  const content = readFileSync(file, 'utf8')

  for (const [label, pattern] of checks) {
    const match = pattern.exec(content)
    if (!match) continue

    const line = content.slice(0, match.index).split('\n').length
    failures.push(`${relativePath}:${line} ${label}`)
  }
}

if (failures.length > 0) {
  console.error('Forbidden foundation patterns found:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('No forbidden foundation patterns found.')
