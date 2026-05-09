# CODEX.md — TD POS

> OpenAI Codex CLI project context. For universal agent context, see AGENTS.md.

## Project Overview

TD POS — offline-first, mobile-first SaaS POS for Philippine business.
Monorepo: Turborepo 2.9 + Bun. Mobile: Expo SDK 55. Web: Next.js 16. Backend: Supabase (PostgreSQL 17).
Build: EAS Build for iOS + Android. Deploy: EAS Submit to App Store + Google Play.

## Architecture Notes

- **Offline-first:** All writes go to local SQLite first (`SQLiteProvider` + `useSQLiteContext`). Sync is background via `expo-background-task`. UI never blocks on network.
- **Canonical pieces:** `stock_pieces` INTEGER is the source of truth. Packs derived via `divmod`.
- **Delta sync:** Inventory changes sent as deltas (`-1`), never absolute values. Idempotent via `client_operation_id`.
- **Race-safe dedup:** `INSERT...ON CONFLICT DO NOTHING RETURNING` on `applied_operations` table.
- **Immutable sales:** No UPDATE/DELETE on sales. Corrections via void/compensating entries.
- **PostgreSQL 17:** `gen_random_uuid()` is built-in (no `uuid-ossp`), `JSON_TABLE` available, `MERGE RETURNING` supported.
- **Auth:** Phone OTP only via Supabase Auth. MMKV storage, NOT AsyncStorage. E.164 format (+639XX).
- **UI:** React Native Paper v5 (MD3, NOT MD2). `MD3LightTheme`, NOT `DefaultTheme`.
- **Routing:** Expo Router file-based routing. `Stack.Protected` for auth guards. NOT React Navigation.
- **State:** Zustand 5 + MMKV (client). TanStack React Query v5 (server). NOT Redux.

## Style Guide

- TypeScript 6 strict mode (default)
- Single quotes, no semicolons, 2-space indent
- Functional patterns, no classes for state
- Zod 4: `error:` param (not `message:`)
- File naming: `kebab-case.ts`, `PascalCase` for components
- Feature-oriented: `src/features/{feature}/components|hooks|utils`
- Zustand stores: one per domain, persist with MMKV

## Workflow

```bash
bun install                    # Install deps
bun run dev                    # Start all (turbo)
bun run dev:mobile             # Expo only
bun run dev:web                # Next.js only
bun run lint                   # ESLint 9
bun run typecheck              # TS strict
bun run test                   # All tests
eas build --profile development --platform all  # Dev builds
eas build --profile production --platform all   # Store builds
eas submit --profile production --platform all  # Submit
```

## Critical Rules

The deprecation list lives in [`docs/skills/deprecations.md`](docs/skills/deprecations.md). Read it before writing or modifying any code path that touches the items in that file. The list is enforced mechanically by `scripts/check-forbidden-patterns.mjs` for the regex-detectable subset.

Always:

- Generate `client_operation_id` UUIDv4 for every sync queue entry (use `createClientOperationId()` from `@tdpos/shared`).
- Use `@supabase/server` `withSupabase()` in Edge Functions, never manual JWT or `_shared/supabase.ts` boilerplate.
- Run `bun run check:foundation` before committing.

## Skills Reference (20 docs in `docs/skills/`, DocGate-3 enforced)

Domain: `inventory-tingi-model`, `sync-engine`, `receipt-numbering`, `bir-compliance`, `supabase-rls`
API/Framework: `react-19-patterns`, `expo-router-patterns`, `expo-sqlite-patterns`, `expo-clipboard`, `zustand-mmkv-stores`, `supabase-auth-phone-otp`, `thermal-printer-integration`, `nextjs-16-proxy-pattern`, `react-native-paper-theming`, `tanstack-query-offline`
Platform: `postgresql-17-patterns`, `eas-build-deploy`, `background-sync-task`, `supabase-server-edge-functions`

## PR Format

- Commit: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- PR title: `[scope] Description`
