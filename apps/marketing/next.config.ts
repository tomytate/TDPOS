import { resolve } from 'node:path'
import type { NextConfig } from 'next'

const repoRoot = resolve(process.cwd(), '../..')

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
  },
}

export default config
