# TD POS — Spec v5 (Meta-Index)

> The operative product spec for TD POS does not live in a single monolithic document.
> Instead, it is the union of the documents listed below. This file exists to make the surface explicit and stable so that `README.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `CODEX.md` can all link to one place.
>
> If you came here looking for "what is TD POS, what does it do, and what are the rules" — start with this page and follow the links.

## Release Posture

- **Current baseline:** v0.1 Scaffold Checkpoint.
- **Current build posture:** 0.1 through 0.9 lays the full mobile/web/backend scaffold. 0.9 is the concentrated testing, polish, visual QA, accessibility, and performance pass. v0.1alpha is the first pilot store after those gates, not before them.
- **Target:** v1.0 Public Launch — mobile + web dashboard + marketing site simultaneously.
- **No release date.** v1.0 is a quality bar; time to v1.0 is determined by readiness.
- **No partial release.** If any of the three surfaces is below the bar, v1.0 does not ship.

The full release philosophy, the Release Pact, and the Definition of Enterprise-Grade live in [road-to-1.0-enterprise-checklist.md](road-to-1.0-enterprise-checklist.md).

## What TD POS Is

TD POS is an offline-first, mobile-first SaaS POS and inventory management system built specifically for Philippine commerce — from sari-sari stores to enterprise franchise chains. The technical wedge is the tingi / canonical-pieces inventory model: every product stores stock as `stock_pieces` (an integer of the smallest sellable unit) and pack counts are derived via `divmod(stock_pieces, pieces_per_pack)`.

The product pitch is **"Tama ang stock mo. Lagi."** — your stock is correct, always.

## Canonical Product Tiers

The product has five canonical tiers. These are the only active subscription values in new code and database rows:

| Canonical Tier      | Public Name       | Segment                       | UI Source                                               | Billing    |
| ------------------- | ----------------- | ----------------------------- | ------------------------------------------------------- | ---------- |
| `tier_a_free`       | Tier A Free       | Sari-sari / micro-stall       | `UI/b_g4eU9LYiRKM/components/pos/tier-a-lite.tsx`       | Free       |
| `tier_b_pro`        | Tier B Pro        | Mini-mart / Alfamart-scale    | `UI/b_g4eU9LYiRKM/components/pos/tier-b-pro.tsx`        | Paid       |
| `tier_c_plus`       | Tier C Plus       | Convenience / 7-11-scale      | `UI/b_g4eU9LYiRKM/components/pos/tier-c-plus.tsx`       | Paid       |
| `tier_d_premium`    | Tier D Premium    | Supermarket                   | `UI/b_g4eU9LYiRKM/components/pos/tier-d-premium.tsx`    | Paid       |
| `tier_e_enterprise` | Tier E Enterprise | Mall / department-store chain | `UI/b_g4eU9LYiRKM/components/pos/tier-e-enterprise.tsx` | Enterprise |

`packages/shared/src/constants/index.ts` is the source of truth for `TIER_DEFINITIONS`, module unlocks, limits, surface unlocks, and upgrade paths. The legacy six-name model (`free`, `starter`, `growth`, `pro`, `business`, `enterprise`) exists only as migration input through `LEGACY_TIER_MAP`. The root `UI/` folder remains reference-only; implementation uses native Expo and Next components.

## Operative Spec Surfaces

The spec is composed of these documents. Read them in this order.

### 1. Release readiness, gates, and Definition of Enterprise-Grade

- [road-to-1.0-enterprise-checklist.md](road-to-1.0-enterprise-checklist.md) — the master release readiness checklist. Contains the Release Pact, Definition of Enterprise-Grade, Release Levels (mobile + web + marketing), every phase, and every gate.

### 2. Architecture decisions

- [architecture.md](architecture.md) — Architecture Decision Records (ADRs). Each major irreversible decision (monorepo, expo-sqlite over Drizzle, delta-based sync, canonical pieces, race-safe RPC, receipt namespacing) is recorded with context and consequences.

### 3. Data contract

- [database-schema.md](database-schema.md) — entity relationship diagram + table-by-table reference. Source of truth: `supabase/migrations/*.sql` and `apps/mobile/src/db/migrations/*.sql`.
- TypeScript row types: `packages/db/src/schema.ts`.
- Zod runtime validators: `packages/shared/src/validators/index.ts`.
- Tier and entitlement source of truth: `packages/shared/src/constants/index.ts`.

### 4. Procedural skill docs (one per package or domain)

`docs/skills/` is the canonical place where each integration is documented. Every package in the tech stack must have a skill doc that links to its official documentation, carries a verified version, and stamps a `Last verified:` date. The structure is mechanically enforced by `scripts/check-skill-docs.mjs` (DocGate-3) at the foundation gate. The count currently sits at **22**:

- **Domain (5):** `inventory-tingi-model.md`, `sync-engine.md`, `receipt-numbering.md`, `bir-compliance.md`, `supabase-rls.md`.
- **Mobile framework (9):** `react-19-patterns.md`, `expo-router-patterns.md`, `expo-sqlite-patterns.md`, `expo-file-system.md`, `zustand-mmkv-stores.md`, `supabase-auth-phone-otp.md`, `thermal-printer-integration.md`, `react-native-paper-theming.md`, `tanstack-query-offline.md`.
- **Web framework (2):** `nextjs-16-proxy-pattern.md`, `react-pdf-renderer.md`. The Tailwind 4 + shadcn/ui doc remains tracked by W0.2/W0.8 follow-ups.
- **Platform & infrastructure (4):** `postgresql-17-patterns.md`, `eas-build-deploy.md`, `background-sync-task.md`, `supabase-server-edge-functions.md`.
- **Cross-cutting (2):** `deprecations.md` (single-source deprecations table per DocGate-2), `expo-clipboard.md` (diagnostics support bundles per ADR-014).

### 5. Development setup

- [development-setup.md](development-setup.md) — required tools (Node 24, Bun 1.3.13, Supabase CLI), first-time setup, foundation gate.

### 6. Operations and support

- [operations/support-runbook.md](operations/support-runbook.md) — pilot support path, severity guide, top support scenarios, escalation packet, and single-owner support model.
- [operations/pilot-readiness.md](operations/pilot-readiness.md) — rollback plan, manual receipt fallback, support contact path, EAS Update policy, simulation checklist, and pilot stop conditions.

### 7. Per-agent context layers

These are not the spec itself; they are agent-facing summaries that point back here.

- `AGENTS.md` (universal)
- `CLAUDE.md` (Claude-specific)
- `GEMINI.md` (Gemini-specific)
- `CODEX.md` (OpenAI Codex-specific)

If any of these drift from the spec, they are wrong, not the spec. The Documentation Quality Gate (DocGate-2) requires the deprecations table to live in one file and be referenced — not duplicated — across these summaries.

## Anti-Goals (What This Spec Does Not Cover)

- Calendar dates. The spec deliberately contains no "ship by" dates. v1.0 is a quality bar.
- Final marketing copy. The Phase M scaffold now lives in `apps/marketing`, but launch copy, domain, analytics consent, and legal review remain separate acceptance work.
- Implementation details that change every release. Those live in code and skill docs.
- Speculative future features beyond Phase 11.5 (Enterprise Hardening) and the Post-1.0 expansion list.

## Wedge In One Sentence

> Every other POS gets the cashier UI right and the inventory math wrong. TD POS gets the inventory math right first.

If a feature, screen, or integration would compromise inventory correctness, offline reliability, idempotent sync, tenant isolation, or BIR-ready discipline — it does not ship. Not for v1.0, not ever.

## Pointers For Specific Questions

| If you want to know about...                 | Go to...                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Release pact, gates, phases, scorecards      | [road-to-1.0-enterprise-checklist.md](road-to-1.0-enterprise-checklist.md) |
| Why a specific architectural choice was made | [architecture.md](architecture.md)                                         |
| The shape of a database table                | [database-schema.md](database-schema.md) + `supabase/migrations/`          |
| How a specific package is used               | `docs/skills/<package>.md`                                                 |
| How to set up a clean dev environment        | [development-setup.md](development-setup.md)                               |
| What each AI agent should follow             | the agent-specific file at the repo root                                   |

## Contributing To The Spec

- Spec changes happen in pull requests.
- A spec change that contradicts the Release Pact is not merged.
- A skill doc that doesn't link to the official package documentation is not merged.
- A new package added without a skill doc is not merged.
- A v1.0-blocker added without an acceptance criterion is not merged.

The spec is the contract between owner, contributors, and AI agents. Treat it that way.
