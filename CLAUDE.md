# CLAUDE.md — TD POS

> Claude-specific project context. For universal agent context, see AGENTS.md.

## Project Identity

TD POS v5.0 — offline-first, mobile-first SaaS POS for Philippine commerce.
Primary pitch: "Tama ang stock mo. Lagi." (Your stock is correct. Always.)
Full spec: `docs/spec-v5.md`

## Progressive Disclosure

Do NOT load these until the task requires them:

- `docs/spec-v5.md` — full product spec (20 sections)
- `docs/architecture.md` — ADRs and system design
- `docs/database-schema.md` — ER diagram and table reference

### Domain Skills

- `docs/skills/inventory-tingi-model.md` — canonical pieces model deep dive
- `docs/skills/sync-engine.md` — sync queue, idempotency, applied_operations
- `docs/skills/receipt-numbering.md` — BRANCH-CASHIER-DATE-SEQUENCE format
- `docs/skills/bir-compliance.md` — BIR language discipline and compliance
- `docs/skills/supabase-rls.md` — RLS policy patterns

### API/Framework Skills (Anti-Hallucination)

- `docs/skills/react-19-patterns.md` — React 19.2 components, hooks, effects, memoization, React Native/web boundaries
- `docs/skills/expo-router-patterns.md` — file-based routing, Stack.Protected, tabs
- `docs/skills/expo-sqlite-patterns.md` — SQLiteProvider, useSQLiteContext, async API
- `docs/skills/expo-clipboard.md` — manager-triggered clipboard support bundles, sanitized diagnostics
- `docs/skills/zustand-mmkv-stores.md` — Zustand 5 persist + MMKV adapter
- `docs/skills/supabase-auth-phone-otp.md` — phone OTP flow with MMKV storage
- `docs/skills/thermal-printer-integration.md` — REAL package name + Fabric status
- `docs/skills/nextjs-16-proxy-pattern.md` — proxy.ts replaces middleware.ts
- `docs/skills/react-native-paper-theming.md` — MD3 theme tokens, not MD2
- `docs/skills/tanstack-query-offline.md` — React Query v5 with offline-first patterns

### Platform & Infrastructure Skills

- `docs/skills/postgresql-17-patterns.md` — PG17 JSON_TABLE, gen_random_uuid, dropped extensions
- `docs/skills/eas-build-deploy.md` — iOS + Android builds, eas.json, app.config.ts, store submission
- `docs/skills/background-sync-task.md` — expo-background-task + sync processor implementation
- `docs/skills/supabase-server-edge-functions.md` — @supabase/server withSupabase, auth modes, context

## Claude-Specific Rules

### Package Verification

- ALWAYS verify package versions against npm before suggesting install commands
- NEVER fabricate package names — the spec v1.0 fabricated `react-native-thermal-printer-driver` which does not exist
- The real package is `@haroldtran/react-native-thermal-printer@1.2.0`
- Verify Fabric (New Architecture) compatibility claims — SDK 55 REQUIRES Fabric

### Code Generation Rules

The full deprecations table lives in [`docs/skills/deprecations.md`](docs/skills/deprecations.md). Read it before adding a dependency or generating auth/storage/routing/receipt code. DocGate-2 forbids duplicating that table here. The rules below are project-specific invariants that supplement (not replace) that table.

- All SQL migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- All state-mutating RPCs must take a `client_operation_id` (UUIDv4) parameter; generate via `createClientOperationId()` from `@tdpos/shared`.
- Receipt numbers always use `BRANCH-CASHIER-DATE-SEQUENCE` format (e.g. `QC01-C02-20260506-000123`).
- Stock is always `stock_pieces` (INTEGER) — never fractional, never in packs.
- Pack display is derived: `divmod(stock_pieces, pieces_per_pack)` → "X packs + Y pieces".
- Sales rows are immutable — no UPDATE (except `synced_at`), no DELETE, ever.

### Domain Knowledge

- **Tingi model:** every product stores stock as `stock_pieces` (smallest sellable unit). `pieces_per_pack` defines the relationship. Sale of 1 pack = `stock_pieces -= pieces_per_pack`. Sale of 1 piece = `stock_pieces -= 1`.
- **Utang** is an opt-in module (default OFF). Most businesses never enable it. Never show utang UI when module is disabled.
- **DAR-30** is the north star metric: one sari-sari store completes ≥5 sales/day on ≥25 of 30 consecutive days.
- **SAS (Stock Accuracy Score)** is the marketing weapon: measures system vs physical stock match rate.
- **End-of-Day Report** is the Free→Starter conversion trigger (automated SMS delivery).
- **BIR language:** NEVER use "BIR-compliant/certified/approved" — only "BIR-ready" until accredited.

### Sync Architecture

- Writes go to local SQLite first, queued in `sync_queue` with `client_operation_id`
- Sync pushes via `expo-background-task` to Supabase RPC `apply_inventory_delta`
- Server uses `INSERT...ON CONFLICT DO NOTHING RETURNING` for race-safe dedup
- Retries are idempotent — same `client_operation_id` returns cached result
- Negative stock guard: RPC refuses delta that would push `stock_pieces < 0`

## Quality Verification

After any code change, run:

```bash
bun run check:foundation
```

## Tech Stack Quick Reference (Verified May 10, 2026)

| Layer          | Package                                  | Version       |
| -------------- | ---------------------------------------- | ------------- |
| Framework      | expo                                     | 55.0.23       |
| Router         | expo-router                              | 55.x          |
| Local DB       | expo-sqlite                              | 55.x          |
| State (client) | zustand                                  | 5.0.13        |
| State (server) | @tanstack/react-query                    | 5.100.9       |
| Backend        | @supabase/supabase-js                    | 2.105.3       |
| UI             | react-native-paper                       | 5.15.2        |
| Storage        | react-native-mmkv                        | 4.3.1         |
| Printer        | @haroldtran/react-native-thermal-printer | 1.2.0         |
| Validation     | zod                                      | 4.4.3         |
| Language       | typescript                               | 6.0.3 / 5.9.3 |
| Node runtime   | node                                     | 24 LTS        |
| Web framework  | next                                     | 16.2.6        |
| CSS            | tailwindcss                              | 4.2.4         |
| SSR auth       | @supabase/ssr                            | 0.10.2        |
| Monorepo       | turbo                                    | 2.9.12        |
