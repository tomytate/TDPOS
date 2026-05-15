# AGENTS.md — TD POS

## Project Overview

TD POS is the operating system for Philippine business — a mobile-first, offline-capable SaaS POS and inventory management system. The primary pitch is **"Tama ang stock mo. Lagi."** (Your stock is correct. Always.) The technical wedge is the tingi/canonical-pieces inventory model — the one capability no international competitor handles correctly.

- **Spec version:** v5.0 (May 2026)
- **Platforms:** iOS, Android, Web Dashboard, Tablet
- **Architecture:** Offline-first Expo app + Supabase backend + Next.js 16 web dashboard
- **Monorepo:** Turborepo 2.9 + Bun
- **Database:** PostgreSQL 17 (via Supabase)
- **Build & Deploy:** EAS Build + EAS Submit (iOS App Store + Google Play)

## Product Tier Model

TD POS uses five canonical product tiers. New code must use these values only:

| Tier                | Public name       | Segment                       | Billing    |
| ------------------- | ----------------- | ----------------------------- | ---------- |
| `tier_a_free`       | Tier A Free       | Sari-sari / micro-stall       | Free       |
| `tier_b_pro`        | Tier B Pro        | Mini-mart / Alfamart-scale    | Paid       |
| `tier_c_plus`       | Tier C Plus       | Convenience / 7-11-scale      | Paid       |
| `tier_d_premium`    | Tier D Premium    | Supermarket                   | Paid       |
| `tier_e_enterprise` | Tier E Enterprise | Mall / department-store chain | Enterprise |

`packages/shared/src/constants/index.ts` owns `TIER_DEFINITIONS`, module unlocks, limits, UI reference paths, and upgrade targets. The old six-name subscription values are migration-only through `LEGACY_TIER_MAP`; do not add new features against them. Root `UI/` is visual/product reference only, not production code.

## Tech Stack (Verified May 14, 2026)

### Mobile (apps/mobile)

- Expo SDK 55 (RN 0.83.6, React 19.2) — released Feb 25, 2026
- expo-router 55.x (file-based routing, Stack.Protected, native tabs)
- expo-sqlite 55.x (async API: SQLiteProvider, useSQLiteContext — NOT legacy openDatabase)
- expo-background-task 55.x (background sync — NOT expo-background-fetch which is REMOVED)
- Zustand 5.0.13 (client state, persist with MMKV) + TanStack React Query 5.100.9 (server state)
- React Native Paper 5.15.2 (Material Design 3, NOT MD2)
- react-native-mmkv 4.3.1 (fast synchronous storage — NOT AsyncStorage)
- @haroldtran/react-native-thermal-printer 1.2.0 (BLE/USB/LAN — the ONLY verified printer package)
- Zod 4.4.3 (in `@tdpos/shared` and `@tdpos/db`; validation uses `error:` param — NOT `message:`)
- TypeScript strict mode (root/web/shared: 6.0.3; mobile: Expo SDK 55-compatible 5.9.3)

### Web Dashboard (apps/web)

- Next.js 16.2.6 (App Router, `proxy.ts` replaces `middleware.ts`)
- TailwindCSS 4.3.0 + shadcn/ui
- @react-pdf/renderer 4.5.1
- @supabase/ssr 0.10.3 (`getClaims()` not `getSession()`)

### Backend

- Supabase: PostgreSQL 17, Auth (phone OTP), Realtime, Storage, Edge Functions, RLS, Cron, pgvector
- @supabase/supabase-js 2.105.4
- @supabase/server (public beta, May 6 2026) — Edge Function auth/context (`withSupabase`)
- @supabase/ssr 0.10.3 — web dashboard cookie auth (`getClaims`)
- `gen_random_uuid()` is built-in PG13+ — NO `uuid-ossp` extension needed
- Claude API via Edge Function (AI insights)

### Shared

- Turborepo 2.9.12 (`tasks` key in turbo.json, NOT `pipeline` which is deprecated)
- Bun (package manager + runtime, lockfile: `bun.lock` text format, NOT `bun.lockb`)
- Node 24 LTS for local tooling (Expo SDK 55 minimum: Node 20.19.x; Node 20 is EOL)
- ESLint 10 (flat config: eslint.config.mjs)
- Prettier 3

### Build & Deploy

- EAS Build for iOS + Android (NOT `expo build` which was removed in 2023)
- EAS Submit for App Store + Google Play
- EAS Update for OTA updates (no native rebuild)
- Development builds required (NOT Expo Go for production testing)

## Essential Commands

```bash
bun install                    # Install all workspace deps
bun run dev                    # Start all apps in parallel (via turbo)
bun run dev:mobile             # Expo dev server only
bun run dev:web                # Next.js dev server only
bun run dev:marketing          # Marketing site scaffold only
bun run build                  # Build all
bun run check:foundation       # Full 15-stage foundation gate
bun run check:secrets          # Scan for committed secrets
bun run check:sqlite-schema    # Local SQLite schema drift check
bun run check:sqlite-migrations # Local migration ordering gate
bun run check:supabase-rls     # Supabase migration RLS coverage gate
bun run check:patterns         # Forbidden pattern scanner
bun run check:expo-doctor      # Expo native dependency health check
bun run check:mobile-bundle    # Android Metro bundle/export check
bun run check:tier-ui-sources  # Verify five tier UI references exist
bun run lint                   # ESLint 10 across workspace
bun run typecheck              # TypeScript strict check
bun run test                   # Run all tests
bun run test:mobile            # Mobile tests only
bunx expo start                # Direct Expo CLI
bunx supabase start            # Local Supabase (PG17)
bunx supabase db push          # Push migrations
eas build --profile dev --platform all   # Dev builds
eas build --profile production --platform all  # Store builds
eas submit --profile production --platform all # Submit to stores
```

## Architecture Rules

1. **Offline-first is non-negotiable.** Every cashier-facing screen works with zero internet. All writes go to local SQLite first via `SQLiteProvider` + `useSQLiteContext`. Sync is a background concern via `expo-background-task`.
2. **Inventory uses canonical pieces only.** `stock_pieces` is an INTEGER. Pack counts are derived via `divmod(stock_pieces, pieces_per_pack)`. Never store fractional stock.
3. **Delta-based inventory sync.** Never send absolute stock values. Always send deltas (e.g. `-1`). This prevents concurrent offline sales from overwriting each other.
4. **Every state-mutating RPC takes a `client_operation_id` (UUIDv4).** The server deduplicates via `applied_operations` table with race-safe `INSERT...ON CONFLICT DO NOTHING RETURNING` pattern.
5. **RLS on every table, no exceptions.** Use `auth.uid()` pattern: `business_id = (SELECT business_id FROM users WHERE id = auth.uid())`.
6. **Sales are immutable.** No UPDATE (except `synced_at`), no DELETE. Corrections use void/compensating entries.
7. **Receipt numbers use `BRANCH-CASHIER-DATE-SEQUENCE` format.** Per-device namespace partitioning. Physically uncollidable offline.
8. **Modules are opt-in, default OFF.** Utang, loyalty, customer SMS, etc. UI for disabled modules must be completely hidden.
9. **Tier source of truth is shared.** Mobile, web, Supabase, and marketing must read from `TIER_DEFINITIONS`; do not fork tier labels, limits, module unlocks, or route gates.

## Coding Conventions

- TypeScript strict mode — do NOT set `strict: false`
- Single quotes, no semicolons, 2-space indent
- Functional patterns, no classes for state
- Zod 4: use `error:` param, not `message:` (deprecated in Zod 4)
- File naming: `kebab-case.ts` for files, `PascalCase` for React components
- Feature-oriented architecture in `src/features/`
- Zustand stores: one per domain (`cart-store.ts`, `auth-store.ts`), persist with MMKV
- MMKV for persistent client state (auth tokens, settings)
- expo-sqlite for structured data (products, sales, sync queue)

## Critical Deprecations

The canonical deprecations table lives in [`docs/skills/deprecations.md`](docs/skills/deprecations.md). Read it before adding any dependency, changing any auth/storage/routing call, or writing user-facing receipt copy. Do not duplicate the table here — DocGate-2 enforces single-source.

## BIR Language Discipline

The canonical wording rules live in [`docs/skills/bir-compliance.md`](docs/skills/bir-compliance.md), and regex-detectable forbidden patterns live in [`docs/skills/deprecations.md`](docs/skills/deprecations.md). Do not duplicate the phrase table here; DocGate-2 keeps BIR wording single-sourced.

## Skills Reference (27 procedural docs in `docs/skills/`)

### Domain Skills

- `inventory-tingi-model.md` — canonical pieces, pack derivation, delta sync
- `sync-engine.md` — sync_queue, applied_operations, race-safe idempotency
- `receipt-numbering.md` — BRANCH-CASHIER-DATE-SEQUENCE, offline-safe
- `bir-compliance.md` — BIR language discipline, tiered strategy, EOPT
- `supabase-rls.md` — RLS patterns, audit immutability, tenant isolation
- `tier-entitlement-gating.md` — A-E tier gates, surface access, module unlocks, entitlement cache

### API/Framework Skills (Anti-Hallucination)

- `react-19-patterns.md` — React 19.2 component, hooks, effects, memoization, React Native/web boundaries
- `expo-router-patterns.md` — file-based routing, Stack.Protected, tabs
- `expo-sqlite-patterns.md` — SQLiteProvider, useSQLiteContext, async API
- `expo-file-system.md` — SDK 55 `Paths` API for disk metadata and local file operations
- `expo-clipboard.md` — manager-triggered clipboard support bundles, sanitized diagnostics
- `zustand-mmkv-stores.md` — Zustand 5 persist + MMKV adapter
- `supabase-auth-phone-otp.md` — phone OTP flow, MMKV storage, PH phone validation
- `thermal-printer-integration.md` — REAL package name, Fabric status, ESC/POS
- `nextjs-16-proxy-pattern.md` — proxy.ts replaces middleware.ts, getClaims
- `react-pdf-renderer.md` — server-side PDF reports and BIR-ready exports
- `react-native-paper-theming.md` — MD3 color tokens, typography variants
- `tanstack-query-offline.md` — React Query v5 offline patterns, v3→v5 migration
- `zod-4-validation.md` — Zod 4 error: param, top-level validators, project schemas
- `i18n-localization.md` — centralized translations, Tagalog/English, BIR wording guards

### Platform & Infrastructure Skills

- `postgresql-17-patterns.md` — PG17 JSON_TABLE, gen_random_uuid, dropped extensions
- `eas-build-deploy.md` — EAS Build profiles, app.config.ts, store submission
- `background-sync-task.md` — expo-background-task, sync processor, iOS config
- `supabase-server-edge-functions.md` — @supabase/server withSupabase, auth modes, context
- `monorepo-workspace.md` — Turborepo 2.9 + Bun workspace, cross-package imports, turbo.json
- `testing-patterns.md` — bun:test, bun:sqlite in-memory DB, pure function testing, §14 specs

## Testing Requirements

Always run `bun run check:foundation` before committing. Current: 147 tests across 28 files (26 mobile + 2 shared).

Six required Phase 1 tests (§14 of spec):

1. Tingi inventory math (sell 7 from 12-sachet pack → 5 remaining)
2. Inventory delta concurrency (two offline branches, both sell 1 of 2)
3. Negative stock guard (sale exceeding stock → `pending_sync_review`)
4. Idempotency replay (same `client_operation_id` twice → one decrement)
5. Receipt number collision (two offline devices, no collisions)
6. TOCTOU race (100 concurrent calls, same op_id → exactly one decrement)

## Repository Structure

```
TDPOS/
├── apps/mobile/          # Expo SDK 55 (iOS + Android + Tablet)
│   └── src/db/           # 9 local SQLite migrations (v1–v9)
├── apps/web/             # Next.js 16 dashboard + guarded management scaffolds
├── apps/marketing/       # Next.js 16 public site scaffold
├── packages/shared/      # Shared types, validators, constants, data retention
├── packages/db/          # Database schema types
├── packages/typescript-config/
├── packages/eslint-config/
├── scripts/              # 11 scripts (foundation gate, secrets, patterns, RLS)
├── supabase/             # PG17 migrations (16+), Edge Functions (4), seed
├── docs/                 # Spec, architecture (19 ADRs), schema reference
│   └── skills/           # 27 procedural skill docs (shared by ALL agents)
└── UI/                   # Suki POS design canvas (reference only)
```

## PR & Commit Guidelines

- Commit format: `type(scope): description` (e.g. `feat(sales): add tingi cart calculation`)
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Always run lint + test before pushing
- PR title: `[scope] Description`
