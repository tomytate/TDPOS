# GEMINI.md — TD POS

> Google Gemini CLI project context. For universal agent context, see AGENTS.md.

## Project Overview

TD POS — offline-first, mobile-first SaaS POS for Philippine business.
Monorepo: Turborepo 2.9 + Bun. Mobile: Expo SDK 55. Web: Next.js 16. Backend: Supabase (PostgreSQL 17).
Build: EAS Build for iOS + Android. Deploy: EAS Submit to App Store + Google Play.
Full spec: `docs/spec-v5.md`

Five canonical tiers: `tier_a_free`, `tier_b_pro`, `tier_c_plus`, `tier_d_premium`, `tier_e_enterprise`. Use `TIER_DEFINITIONS` from `@tdpos/shared` for labels, modules, limits, UI references, and route gates. The older six subscription names are migration-only.

## Key Architectural Decisions

- **Offline-first:** SQLite is the local source of truth (`SQLiteProvider` + `useSQLiteContext`). Network is async side-effect via `expo-background-task`.
- **Canonical pieces model:** `stock_pieces` INTEGER, `pieces_per_pack` INTEGER. Display via `divmod`. Never store packs as separate field.
- **Delta-based inventory sync:** Send `-1`, not "new stock = 99". Prevents concurrent offline overwrite.
- **Idempotent RPCs:** Every mutation takes `client_operation_id` UUID. Server deduplicates via `applied_operations` with `INSERT...ON CONFLICT DO NOTHING RETURNING`.
- **Receipt namespacing:** `BRANCH-CASHIER-DATE-SEQUENCE` format. Per-device partition. Offline-safe.
- **Modules are opt-in:** Utang, loyalty, customer SMS — all default OFF. UI hidden when disabled.
- **PostgreSQL 17:** `gen_random_uuid()` built-in (no `uuid-ossp`), `JSON_TABLE` for batch processing, `MERGE RETURNING` for upserts.
- **Phone OTP only:** Supabase Auth with MMKV storage adapter. E.164 format (+639XX). No email/password.
- **EAS Build:** Development builds required (not Expo Go). `eas.json` defines profiles for dev/preview/production.
- **Five-tier scaffold:** Root `UI/` files are reference-only; implementation must use Expo/Next components and shared tier gates.

## Coding Standards

- TypeScript strict mode
- Single quotes, no semicolons, 2-space indent
- Functional patterns, no classes
- Zod 4: use `error:` param, never `message:`
- File naming: `kebab-case.ts`, `PascalCase` for React components
- Feature-oriented: `src/features/`
- Zustand stores: one per domain, MMKV persistence (NOT AsyncStorage)
- Expo Router file-based routing (NOT React Navigation)
- React Native Paper v5 MD3 (NOT v4 MD2)
- TanStack React Query v5 (NOT v3/v4 — `onSuccess` removed, `cacheTime` → `gcTime`)

## Critical Warnings

Single source of truth: [`docs/skills/deprecations.md`](docs/skills/deprecations.md). Read it before adding a dependency or writing auth/storage/routing/receipt code. DocGate-2 forbids duplicating the table in this file.

## Commands

```bash
bun install          # Install all
bun run dev          # Dev all (turbo)
bun run dev:mobile   # Expo only
bun run dev:web      # Next.js only
bun run dev:marketing # Marketing site only
bun run check:foundation # Full 15-stage gate
bun run check:secrets # Committed secret scanner
bun run check:sqlite-migrations # Local migration ordering
bun run check:supabase-rls # Supabase migration RLS coverage gate
bun run check:mobile-no-service-key # Mobile service-role containment gate
bun run check:expo-doctor # Expo native dependency health check
bun run check:mobile-bundle # Android Metro bundle/export check
bun run check:tier-ui-sources # Verify five tier UI references exist
bun run lint         # ESLint 10
bun run typecheck    # TS strict
bun run test         # All tests (144 across 28 files)
eas build --profile development --platform all   # Dev builds
eas build --profile production --platform all    # Store builds
eas submit --profile production --platform all   # Submit
```

## Skills Reference (27 docs in `docs/skills/`, DocGate-3 enforced)

Domain: `inventory-tingi-model`, `sync-engine`, `receipt-numbering`, `bir-compliance`, `supabase-rls`, `tier-entitlement-gating`
API/Framework: `react-19-patterns`, `expo-router-patterns`, `expo-sqlite-patterns`, `expo-file-system`, `expo-clipboard`, `zustand-mmkv-stores`, `supabase-auth-phone-otp`, `thermal-printer-integration`, `nextjs-16-proxy-pattern`, `react-pdf-renderer`, `react-native-paper-theming`, `tanstack-query-offline`, `zod-4-validation`, `i18n-localization`
Platform: `postgresql-17-patterns`, `eas-build-deploy`, `background-sync-task`, `supabase-server-edge-functions`, `monorepo-workspace`, `testing-patterns`

## Commit Format

`type(scope): description` — types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
