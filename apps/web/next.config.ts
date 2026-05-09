import type { NextConfig } from 'next'

const config: NextConfig = {
  // App Router only. Next 16 request pipeline lives in `proxy.ts`; see
  // docs/skills/nextjs-16-proxy-pattern.md and the deprecations table.
  // No experimental flags — keep the surface boring until v0.5.
  reactStrictMode: true,
}

export default config
