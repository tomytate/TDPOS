import { resolve } from 'node:path'
import type { NextConfig } from 'next'

const repoRoot = resolve(process.cwd(), '../..')

const config: NextConfig = {
  // App Router only. Next 16 request pipeline lives in `proxy.ts`; see
  // docs/skills/nextjs-16-proxy-pattern.md and the deprecations table.
  // Turbopack root is explicit so lockfiles above this repo never confuse
  // Next's workspace-root inference during local builds.
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
  },
}

export default config
