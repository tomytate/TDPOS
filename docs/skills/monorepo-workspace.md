---
name: monorepo-workspace
description: Use this skill when working with the Turborepo workspace, adding packages, configuring turbo.json, managing cross-package imports, or running workspace scripts. Agents commonly hallucinate npm/yarn/pnpm patterns instead of Bun.
version: 1.0.0
---

# Monorepo & Workspace Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate `npm run`, `yarn workspace`, or `pnpm -r` commands. TD POS uses **Bun** as the package manager and **Turborepo 2.9** for task orchestration. Also, `turbo.json` uses the `tasks` key, NOT `pipeline` (deprecated in Turbo 2.x).

## Package Manager: Bun

```bash
# ✅ CORRECT
bun install              # Install all deps
bun add zod              # Add to current package
bun run dev              # Run turbo dev task
bunx supabase start      # Run CLI tool

# ❌ WRONG
npm install              # Wrong package manager
yarn add zod             # Wrong package manager
npx supabase start       # Use bunx, not npx
```

### Lockfile

The project uses `bun.lock` (text format), NOT `bun.lockb` (legacy binary). The text format is reviewable in PRs.

## Workspace Structure

```
TDPOS/
├── apps/
│   ├── mobile/          # @tdpos/mobile — Expo SDK 55
│   ├── web/             # @tdpos/web — Next.js 16
│   └── marketing/       # @tdpos/marketing — Next.js 16
├── packages/
│   ├── shared/          # @tdpos/shared — types, validators, constants
│   ├── db/              # @tdpos/db — database schema types
│   ├── typescript-config/ # Shared tsconfig bases
│   └── eslint-config/   # Shared ESLint flat config
├── turbo.json           # Task definitions
└── package.json         # Root workspace config
```

## Cross-Package Imports

```typescript
// In apps/mobile or apps/web:
import { TIER_DEFINITIONS, splitStock } from '@tdpos/shared'
import type { Business, Product } from '@tdpos/db'

// In package.json:
"dependencies": {
  "@tdpos/shared": "workspace:*",
  "@tdpos/db": "workspace:*"
}
```

## turbo.json Configuration

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",  // NOT turbo.build
  "tasks": {                                        // NOT pipeline
    "build": { "dependsOn": ["^build"] },
    "dev": { "persistent": true, "cache": false },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

## Common Tasks

```bash
bun run dev              # All apps in parallel
bun run dev:mobile       # Expo only
bun run dev:web          # Next.js only
bun run dev:marketing    # Marketing only
bun run build            # Build all (dependency-ordered)
bun run typecheck        # TypeScript strict across all
bun run lint             # ESLint 10 across all
bun run test             # All tests (bun:test)
bun run check:foundation # Full 15-stage pre-commit gate
```

## Adding a New Package

```bash
mkdir packages/my-package
cd packages/my-package
cat > package.json << 'EOF'
{
  "name": "@tdpos/my-package",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
EOF
bun install  # Re-link workspace
```

## TypeScript Configuration

- **Root/web/shared:** TypeScript 6.0.3 (strict)
- **Mobile:** TypeScript 5.9.3 (Expo SDK 55 compatible)
- Shared config bases in `packages/typescript-config/`

## ESLint Configuration

- ESLint 10 with flat config (`eslint.config.mjs`)
- Shared config in `packages/eslint-config/`
- Rules enforced: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, no `console.log`

## Node Version

- Node 24 LTS (pinned via `.nvmrc` and `.node-version`)
- `source scripts/use-toolchain.sh` ensures correct version before CI tasks
- Expo SDK 55 minimum: Node 20.19.x, but Node 20 is EOL — project uses 24

## Sources

- Turborepo: `turbo@2.9.12`, `turbo.json` in repo root
- Bun: `bun.lock` (text format)
- Official Turborepo docs: <https://turbo.build/repo/docs>
- Official Bun docs: <https://bun.sh/docs>
- Implementation: `turbo.json`, `package.json`, `packages/*/package.json`
- Last verified: 2026-05-15
