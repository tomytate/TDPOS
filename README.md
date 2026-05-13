# TD POS

> The operating system for Philippine business.

**"Tama ang stock mo. Lagi."** — Your stock is correct. Always.

TD POS is a mobile-first, offline-capable SaaS POS and inventory management system built specifically for Philippine commerce. From sari-sari stores to enterprise franchise chains. The technical wedge is the tingi/canonical-pieces inventory model — the one capability no international competitor handles correctly.

## Release Posture

- **Current baseline:** v0.8 Scaffold Complete — all five tier surfaces implemented, 116 tests passing, 13-stage foundation gate green.
- **Next real milestone:** v0.9 — full test suite (screenshot parity, accessibility, performance), hosted Supabase staging, EAS dev builds, physical-device airplane-mode sale.
- **Then:** v0.1alpha — first pilot store.
- **Target:** v1.0 Public Launch — mobile + web dashboard + marketing site simultaneously.
- **No release date.** v1.0 is a quality bar; time to v1.0 is determined by readiness.
- **No partial release.** If any of the three surfaces is below the bar, v1.0 does not ship.

The full release pact and the Definition of Enterprise-Grade live in [docs/road-to-1.0-enterprise-checklist.md](docs/road-to-1.0-enterprise-checklist.md). The operative spec index is [docs/spec-v5.md](docs/spec-v5.md).

## Product Tiers

TD POS now uses five canonical product tiers, single-sourced in `@tdpos/shared`:

| Canonical Tier      | Public Name       | Segment                       | Billing    | UI Reference                                            |
| ------------------- | ----------------- | ----------------------------- | ---------- | ------------------------------------------------------- |
| `tier_a_free`       | Tier A Free       | Sari-sari / micro-stall       | Free       | `UI/b_g4eU9LYiRKM/components/pos/tier-a-lite.tsx`       |
| `tier_b_pro`        | Tier B Pro        | Mini-mart / Alfamart-scale    | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-b-pro.tsx`        |
| `tier_c_plus`       | Tier C Plus       | Convenience / 7-11-scale      | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-c-plus.tsx`       |
| `tier_d_premium`    | Tier D Premium    | Supermarket                   | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-d-premium.tsx`    |
| `tier_e_enterprise` | Tier E Enterprise | Mall / department-store chain | Enterprise | `UI/b_g4eU9LYiRKM/components/pos/tier-e-enterprise.tsx` |

The root `UI/` folder is a reference canvas only. Production implementation uses Expo and Next components, with `scripts/check-tier-ui-sources.mjs` verifying that every tier definition points at an existing source file. Legacy values (`free`, `starter`, `growth`, `pro`, `business`, `enterprise`) are migration inputs only and normalize into the A-E model.

## Tech Stack (Verified May 11, 2026)

| Layer              | Technology                                                                    | Version |
| ------------------ | ----------------------------------------------------------------------------- | ------- |
| **Mobile**         | Expo SDK 55 (React Native 0.83.6, React 19.2)                                 | SDK 55  |
| **Web Dashboard**  | Next.js 16 (App Router, `proxy.ts`)                                           | 16.2.6  |
| **Backend**        | Supabase (PostgreSQL 17, Auth, Realtime, Edge Functions)                      | PG 17   |
| **Database**       | PostgreSQL 17 — `gen_random_uuid()` built-in, `JSON_TABLE`, `MERGE RETURNING` | 17      |
| **State (client)** | Zustand 5 + MMKV (synchronous, no hydration flash)                            | 5.0.13  |
| **State (server)** | TanStack React Query v5 (offline-first)                                       | 5.100.9 |
| **UI**             | React Native Paper v5 (Material Design 3)                                     | 5.15.2  |
| **Validation**     | Zod 4 (`z.uuid()`, `z.int()`, `z.e164()` top-level)                           | 4.4.3   |
| **Auth**           | Supabase Phone OTP + MMKV storage                                             | —       |
| **Edge Functions** | @supabase/server (`withSupabase` — auto JWT, context, CORS)                   | beta    |
| **Printer**        | @haroldtran/react-native-thermal-printer (BLE/USB/LAN)                        | 1.2.0   |
| **Build & Deploy** | EAS Build + EAS Submit (App Store + Google Play)                              | —       |
| **Monorepo**       | Turborepo 2.9 + Bun                                                           | 2.9.12  |
| **Language**       | TypeScript strict (root/web/shared TS 6; mobile Expo-compatible TS 5.9)       | mixed   |

## Quick Start

See [Development Setup](docs/development-setup.md) for the full local toolchain and foundation gate.

```bash
# Use Node 24, then install dependencies
nvm use

# Install dependencies
bun install

# Start mobile development
bun run dev:mobile

# Start web dashboard
bun run dev:web

# Start marketing site scaffold
bun run dev:marketing

# Start everything
bun run dev

# Local Supabase (PostgreSQL 17)
bunx supabase start
bunx supabase db push
```

## Build & Deploy (iOS + Android)

```bash
# Development builds (includes dev client)
eas build --profile development --platform all

# Production builds (store submission)
eas build --profile production --platform all

# Submit to App Store + Google Play
eas submit --profile production --platform all

# OTA update (no native rebuild)
eas update --branch production --message "fix: receipt alignment"
```

> ⚠️ **Never use `expo build`** — classic build was removed in 2023. Use EAS Build exclusively.

## Project Structure

```
TDPOS/
├── apps/mobile/             # Expo SDK 55 (iOS + Android + Tablet)
├── apps/web/                # Next.js 16 owner dashboard (auth, reporting, exports, guarded management scaffolds)
├── apps/marketing/          # Next.js 16 public site scaffold (pricing, privacy, terms)
├── packages/shared/         # Shared types, validators, constants, BIR copy
├── packages/db/             # Database schema types + re-exported Zod validators
├── packages/typescript-config/
├── packages/eslint-config/
├── supabase/                # PG17 migrations (15), Edge Functions (3), seed
├── docs/                    # Spec, architecture (17 ADRs), schema reference
│   └── skills/              # 22 anti-hallucination skill docs (DocGate-3 enforced)
└── UI/                      # Suki POS design canvas (reference only)
```

## Key Principles

1. **Offline-first** — every cashier-facing screen works with zero internet. Writes go to SQLite first, sync is background via `expo-background-task`.
2. **Inventory in canonical pieces** — `stock_pieces` INTEGER is the source of truth. Packs derived via `divmod`. No fractional stock.
3. **Delta-based sync** — send `-1` not "stock = 99". No data loss from concurrent offline sales. Idempotent via `client_operation_id`.
4. **BIR-ready** — designed to Philippine tax specification. Never say "BIR-compliant" until accredited.
5. **Modules are opt-in** — utang, loyalty, SMS — all default OFF. UI hidden when disabled.
6. **Tier definitions are shared** — UI surfaces, modules, limits, and upgrade paths come from `TIER_DEFINITIONS`.
7. **PostgreSQL 17** — `gen_random_uuid()` built-in (no extensions), `JSON_TABLE` for batch sync, `MERGE RETURNING` for upserts.
8. **EAS Build only** — development builds required (not Expo Go). EAS Submit for App Store + Google Play.

## AI Agent Documentation

This project includes comprehensive anti-hallucination documentation for AI coding agents:

| File        | Agent         | Purpose                                                         |
| ----------- | ------------- | --------------------------------------------------------------- |
| `AGENTS.md` | All agents    | Universal project context, full tech stack, deprecation table   |
| `CLAUDE.md` | Claude        | Progressive disclosure, domain knowledge, code generation rules |
| `CODEX.md`  | OpenAI Codex  | Architecture notes, 17 critical rules, style guide              |
| `GEMINI.md` | Google Gemini | Key decisions, deprecation-source pointer, coding standards     |

### Skills (22 procedural docs in `docs/skills/`, DocGate-3 enforced)

**Domain (5):** `inventory-tingi-model`, `sync-engine`, `receipt-numbering`, `bir-compliance`, `supabase-rls`

**Mobile framework (9):** `react-19-patterns`, `expo-router-patterns`, `expo-sqlite-patterns`, `expo-file-system`, `zustand-mmkv-stores`, `supabase-auth-phone-otp`, `thermal-printer-integration`, `react-native-paper-theming`, `tanstack-query-offline`

**Web framework (2):** `nextjs-16-proxy-pattern`, `react-pdf-renderer`

**Platform & Infrastructure (4):** `postgresql-17-patterns`, `eas-build-deploy`, `background-sync-task`, `supabase-server-edge-functions`

**Cross-cutting (2):** `deprecations` (single-source deprecations table per DocGate-2), `expo-clipboard` (diagnostics support bundles per ADR-014)

## Documentation

- [Spec v5 (meta-index)](docs/spec-v5.md) — entry point. Lists every operative spec doc.
- [Road to 1.0 / Enterprise-Grade Checklist](docs/road-to-1.0-enterprise-checklist.md) — Release Pact, Definition of Enterprise-Grade, every phase and gate.
- [Support Runbook](docs/operations/support-runbook.md) — pilot support path, top support scenarios, and incident escalation packet.
- [Pilot Readiness Plan](docs/operations/pilot-readiness.md) — rollback plan, manual receipt fallback, support contact path, simulation checklist, and EAS Update guardrails.
- [Architecture Decisions](docs/architecture.md)
- [Database Schema](docs/database-schema.md)
- [Development Setup](docs/development-setup.md)
- [Suki POS Integration Tasks](docs/suki-pos-integration-tasks.md) — historical Tier A work-package provenance; current blockers live in the spec/checklist/ADR set.

## Development

```bash
bun run check:foundation # Full foundation gate
bun run check:secrets # Verify no committed secret patterns
bun run check:tier-ui-sources # Verify every tier points at an existing UI reference
bun run check:expo-doctor # Expo native dependency health check
bun run check:mobile-bundle # Android Metro bundle/export check
bun run lint        # ESLint 10 (flat config)
bun run typecheck   # TypeScript strict
bun run test        # All tests
```

Always run before committing:

```bash
bun run check:foundation
```

## License

Proprietary — TomyTate Studios © 2026
