# TD POS Road to 1.0 / Enterprise-Grade Checklist

> Current baseline: **v0.8 Scaffold Complete**.
> Target: **v1.0 Public Launch** — enterprise-grade from day one, mobile + web dashboard + marketing site simultaneously.
> No release date. v1.0 is a quality bar; time to v1.0 is determined by readiness.

This file is the release readiness checklist for TD POS. It is intentionally detailed. A task is not "done" because code exists; it is done only when the acceptance criteria, verification evidence, and release gate are satisfied.

## Release Philosophy

TD POS must earn trust in the boring parts first: inventory correctness, offline reliability, idempotent sync, tenant isolation, receipt numbering, and recovery from failure. Beautiful screens matter, but they sit on top of those guarantees.

The product's wedge is:

- **Tingi / canonical-pieces inventory**: `stock_pieces` is always the source of truth.
- **Offline-first cashier workflow**: every sale works with zero internet.
- **Delta sync**: remote inventory updates are deltas, never absolute stock writes.
- **Idempotent operations**: every mutation has a `client_operation_id`.
- **BIR-ready discipline**: never claim "BIR-compliant/certified/approved" until accredited.

## Release Pact

This is the explicit commitment between owner and team. Every contributor (human or AI) must read it before opening a PR.

> **TD POS v1.0 is not a date — it is a quality bar.**
>
> Day-one release ships mobile + web dashboard + marketing site simultaneously. No partial release. No "soft launch with mobile only." If a single component is below the bar, v1.0 does not ship. We do not pre-announce a release date.
>
> Time to v1.0 is determined by readiness, not the other way around. We do not lower the bar to hit a deadline. We do not skip the boring correctness work.
>
> Every dependency is documented against its official source. Every architectural decision has an ADR. Every package has a skill doc. Every screen has tests, accessibility labels, and an empty/loading/error state. Every data path has tenant isolation, idempotency, and rollback. Every user-facing surface has EN + TL.
>
> "Enterprise-grade from day one" is the bar — see Definition of Enterprise-Grade below.

### Operating Rules That Follow From The Pact

- [ ] No public-facing release before all three surfaces (mobile, web dashboard, marketing site) hit the bar.
- [ ] No "v1.0-rc" or "soft launch" announcements; the next public version IS v1.0.
- [ ] No deferring scope to v1.1 to hit v1.0 — if it's enterprise-required, it is in v1.0.
- [ ] No code change merges with a failing foundation gate, lint, or test.
- [ ] No documentation drift between code and docs at merge time.
- [ ] No skill doc without a verified link to the official package documentation.
- [ ] No package added without a corresponding skill doc and a deprecation-check entry.
- [ ] No screen shipped without EN + TL strings, accessibility labels, and empty/loading/error states.
- [ ] No mutating RPC without a `client_operation_id` parameter.
- [ ] No table without RLS.
- [ ] No BIR-compliant/certified/approved language anywhere except in docs explicitly warning against it.

## Checkpoint: 2026-05-10 Five-Tier Scaffold

Current operating direction from the owner:

- [x] Stop polishing individual surfaces early. From `0.1` through `0.9`, prioritize laying the full mobile/web/backend scaffold.
- [x] Concentrate full testing, polish, visual QA, accessibility, performance, and tier-by-tier acceptance at `0.9`.
- [x] Treat `v0.1alpha` as the first real pilot store **after** `0.9`, not as the next tag after a single Tier A flow.
- [x] Model the product as five canonical tiers, driven by the root `UI/` reference canvas but implemented with native Expo and Next components.

Five canonical tiers:

| Tier                | Public name       | Segment                       | Billing    | UI reference                                            |
| ------------------- | ----------------- | ----------------------------- | ---------- | ------------------------------------------------------- |
| `tier_a_free`       | Tier A Free       | Sari-sari / micro-stall       | Free       | `UI/b_g4eU9LYiRKM/components/pos/tier-a-lite.tsx`       |
| `tier_b_pro`        | Tier B Pro        | Mini-mart / Alfamart-scale    | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-b-pro.tsx`        |
| `tier_c_plus`       | Tier C Plus       | Convenience / 7-11-scale      | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-c-plus.tsx`       |
| `tier_d_premium`    | Tier D Premium    | Supermarket                   | Paid       | `UI/b_g4eU9LYiRKM/components/pos/tier-d-premium.tsx`    |
| `tier_e_enterprise` | Tier E Enterprise | Mall / department-store chain | Enterprise | `UI/b_g4eU9LYiRKM/components/pos/tier-e-enterprise.tsx` |

What is now scaffolded:

- [x] `@tdpos/shared` owns `SubscriptionTier`, `LegacySubscriptionTier`, `TierSurface`, `TIER_DEFINITIONS`, `LEGACY_TIER_MAP`, module defaults, tier limits, and surface unlocks.
- [x] Supabase migrations normalize old tier strings into A-E canonical values and add entitlement guard helpers.
- [x] Mobile auth/bootstrap caches tier, module state, entitlement expiry, and limits locally for offline gating.
- [x] Mobile has tier-aware subscription/upgrade/surface shell routes, plus Tier A cashier flow remains the always-available free path.
- [x] Web management surfaces render tier-aware locked scaffolds and use shared entitlement helpers for export gating.
- [x] `scripts/check-tier-ui-sources.mjs` is part of `check:foundation`, so every `uiSource` in `TIER_DEFINITIONS` must point at an existing root `UI/` file.

Fact-check notes from this checkpoint:

- [x] Official docs still align with the architecture: Expo SDK 55, Next.js 16 `proxy.ts`, Supabase SSR `getClaims()`, TanStack Query v5 `gcTime`, and FlashList v2 no item-size estimate prop.
- [x] `bun outdated --recursive` shows newer npm versions for several React Native packages, but those are intentionally held to Expo SDK 55-compatible versions. This is not classified as tech debt while `expo-doctor` and the Android bundle export pass.
- [!] Local shell drift observed during this checkpoint: `node --version` returned `v25.9.0`, while the project baseline is Node 24 LTS. Run `nvm use` before release checks or CI-parity work.

## Definition of Enterprise-Grade

A surface (mobile, web, backend) meets the bar when **every** row below is `[x]`. v1.0 ships when every surface is at the bar.

### EG-1 Reliability

- [ ] Mobile cashier flow works in airplane mode end-to-end (sale → checkout → receipt → next sale).
- [ ] Local SQLite writes are durable before any UI shows "success."
- [ ] Sync queue is fully drainable; no orphaned rows after a network partition + recovery cycle.
- [ ] Every mutation is idempotent: replaying any `client_operation_id` produces the same result as the first call.
- [ ] App restart in any state (mid-sale, mid-sync, mid-OTP) recovers without data loss.
- [ ] Process kill / battery cut during checkout leaves either a complete sale or no sale — never a partial one.
- [ ] Web dashboard reads are consistent with the mobile view to the second the sync queue last drained.

### EG-2 Security

- [ ] RLS enabled on every Supabase table; tenant A cannot read tenant B at any layer.
- [ ] Mobile bundle contains only publishable/anon keys, never service-role.
- [ ] Edge Functions use `@supabase/server` `withSupabase()`; no hand-rolled JWT.
- [ ] Web dashboard uses `getClaims()`; no `getSession()`.
- [ ] All mutating Edge Functions take `client_operation_id` and dedup via `applied_operations`.
- [x] No secrets in commits; committed-secret scan is part of the foundation gate.
- [ ] Threat model documented: device theft, lost phone, malicious cashier, compromised cashier device, hostile network.
- [ ] Rate limits configured per tenant on Edge Functions.

### EG-3 Privacy (Philippine DPA / RA 10173)

- [ ] Data retention table covers every PII surface (phones, customer names, utang ledger, audit log, sync_queue).
- [ ] Disabled modules wipe their cached PII from device.
- [ ] Owner can export all tenant data via one Edge Function call.
- [ ] Customer-erasure path documented (PII fields blanked, transaction records retained per BIR).
- [ ] Privacy notice surfaced in app + web dashboard with consent timestamp recorded.
- [ ] No PII in crash/error logs without privacy review.

### EG-4 Performance

- [ ] Mobile cold launch < 2.5 s on a low-end Android (₱5k device target).
- [ ] First sale screen interactive < 1.5 s after launch.
- [ ] Add-to-cart tap latency < 100 ms on the same device.
- [ ] Checkout transaction commits to SQLite < 250 ms for a 5-line cart.
- [ ] 500 SKU product grid scrolls at 60fps.
- [ ] Web dashboard Largest Contentful Paint < 2.5 s on a fresh browser session.
- [ ] Background sync batch finishes within 30 s for a queue of 100 rows on a 3G connection.

### EG-5 Accessibility

- [ ] Every interactive element has an `accessibilityLabel` (mobile) or accessible name (web).
- [ ] Touch targets ≥ 48 dp.
- [ ] Cart total + change due use `accessibilityLiveRegion`.
- [ ] Decorative charts hidden from screen readers.
- [ ] VoiceOver and TalkBack complete the cashier flow without a sighted user.
- [ ] Web dashboard meets WCAG 2.2 AA equivalent (contrast, keyboard, focus, headings, alt text).

### EG-6 Documentation

- [ ] Every package in the tech stack has a skill doc in `docs/skills/` with a verified link to its official documentation source.
- [ ] Every architectural decision has an ADR in `docs/architecture.md`.
- [ ] Every Supabase migration is idempotent and re-runnable.
- [ ] Every Edge Function has a docstring describing its inputs, outputs, and dedup contract.
- [ ] Every public screen has at least one test or a documented "manual test plan" entry.
- [ ] CLAUDE.md, AGENTS.md, GEMINI.md, CODEX.md stay in sync; the deprecations table is single-source (one file, others reference).
- [x] README.md links resolve. No broken `docs/spec-v5.md` references; `check:doc-links` walks all markdown files in the foundation gate.
- [ ] Suki integration doc reflects current state or is archived as historical.

### EG-7 Operations

- [x] Diagnostics screen in the mobile app (manager+ only): sync queue health, app version, schema version, device identity, free disk, MMKV size, and support bundle copy exist.
- [x] "Bundle support package" action copies diagnostics + recent sync errors for support email.
- [x] Public runbook covers: sync stuck, printer offline, lost device, change branch/cashier code, restore on new phone. (`docs/operations/support-runbook.md`.)
- [/] Web dashboard has a sync health view (per-device queue depth, last seen). Last-seen device rows and sanitized queue-count snapshots are scaffolded; production heartbeat cadence and device-management UX remain pending.
- [x] On-call rotation defined or single-owner explicit (small team is fine; ambiguity is not). (`docs/operations/support-runbook.md` declares the pilot single-owner model.)
- [x] Incident response template ready in `.github/`. (`.github/ISSUE_TEMPLATE/incident.md`.)

### EG-8 Compliance

- [ ] BIR copy is centralized in one constants file; no "BIR-compliant/certified/approved" phrases.
- [ ] EOPT (RA 11976) invoice schema present in DB even if accreditation is deferred.
- [ ] BIR-ready data export passes a manual RDO-acceptance dry run.
- [ ] Accreditation flip is one constant change (`BIR_RECEIPT_FOOTER`, `BIR_RECEIPT_NOTE`).

### EG-9 Testing

- [ ] All six §14 required tests pass in CI: tingi math, delta concurrency, negative stock guard, idempotency replay, receipt collision, TOCTOU race.
- [ ] Local test suite includes: cart math, change calc, module visibility, helper utilities.
- [ ] Server-side tests run against a Postgres 17 container, not against production.
- [ ] At least one integration test per non-trivial Edge Function.
- [ ] Mobile smoke test: app boots, signs in, completes one sale, displays receipt.
- [ ] Web smoke test: dashboard boots, signs in, displays last 24h of sales.

### EG-10 Localization

- [ ] EN + TL strings on every cashier-facing surface.
- [ ] EN + TL strings on every owner-facing surface (mobile + web).
- [ ] EOD SMS template in EN + TL.
- [ ] Receipt copy can render TL when the store opts in.

### EG-11 Quality of Life

- [ ] Every screen has empty, loading, and error states.
- [ ] Error messages are actionable and avoid technical jargon ("device not paired" beats "branch_id is null").
- [ ] Every destructive action has a confirmation step.
- [x] No `console.log` in production builds. `scripts/check-forbidden-patterns.mjs` now rejects `console.log(...)` under app/package/Supabase source roots while still allowing CLI checker output in `scripts/`.
- [ ] No `__DEV__`-only branches that ship to production users.
- [ ] No demo-mode shortcut visible in production builds.

### EG-12 Marketing And Brand

- [ ] Marketing site live on a stable domain.
- [ ] Marketing site uses approved BIR language only.
- [/] Pricing page reflects current tier model. The public dashboard `/pricing` route and `apps/marketing/pricing` scaffold render the five canonical tiers from `TIER_DEFINITIONS`; stable-domain launch remains open.
- [/] Privacy policy + terms of service published before launch. Draft scaffold pages exist in `apps/marketing`; legal review remains open.
- [ ] Support contact path documented and reachable.
- [ ] App Store + Play Store listings approved with screenshots from real builds.

## Status Legend

- [ ] Not started
- [/] In progress
- [x] Done
- [!] Blocked
- [~] Needs review / partially done

## Release Levels

TD POS releases on three parallel tracks. v1.0 ships only when every track meets the bar in Definition of Enterprise-Grade.

### Mobile Track (apps/mobile)

| Version    | Name                   | Meaning                                                                                |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `0.1`      | Scaffold Foundation    | Repo, docs, schema, five-tier source of truth, design references, shared packages.     |
| `0.2`      | App Bootstrap          | Expo app boots locally with providers, routing, DB init, theme, and tooling.           |
| `0.3`      | Data Contract Hardened | Database/RLS/schema/helpers are safe enough to build features against.                 |
| `0.4`      | Offline Sale MVP       | Cashier can complete a Tier A sale offline with stock, receipt, and sync queue writes. |
| `0.5`      | Tier A Free UX         | Tier A Free cashier flow reaches parity with the design direction.                     |
| `0.6`      | Entitlement Sync       | Tier/module state syncs and gates surfaces offline using cached entitlements.          |
| `0.7`      | Tier B/C Shells        | Tier B Pro and Tier C Plus routes/screen shells exist and are gated.                   |
| `0.8`      | Tier D/E Shells        | Tier D Premium and Tier E Enterprise shells plus web tier/pricing management exist.    |
| `0.9`      | Test + Polish Gate     | Full test coverage, visual QA, accessibility, performance, and tier acceptance.        |
| `0.1alpha` | First Pilot Store      | A real store starts only after the `0.9` gates are satisfied and evidence is recorded. |

### Web Dashboard Track (apps/web)

| Version | Name                     | Meaning                                                                                           |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `W0.1`  | Web Foundation           | Next.js 16 + App Router + `proxy.ts` + Supabase SSR + shared theme tokens + Tailwind 4 set up.    |
| `W0.3`  | Auth Shell               | Phone-OTP-backed sign-in shared with mobile, protected dashboard route, `getClaims()` everywhere. |
| `W0.5`  | Read-Only Dashboard      | Products, sales, inventory views read directly from Supabase with tenant RLS.                     |
| `W0.7`  | Reporting & Exports      | Daily/weekly/monthly sales, payment mix, BIR-ready CSV/PDF exports.                               |
| `W0.8`  | Management               | Product CRUD, branch/user management, module toggles, sync health, audit log view.                |
| `W0.9`  | Web Production Candidate | Pilot-ready dashboard with the same correctness, security, and accessibility bars as mobile.      |

### Marketing Site Track

| Version | Name                 | Meaning                                                                                                 |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `M0.1`  | Marketing Foundation | Brand site scaffold (Next.js or static). Approved BIR language only. Privacy + ToS drafts in place.     |
| `M0.5`  | Pricing & Pitch      | Pricing tiers reflect the cost strategy; pitch copy aligned with "Tama ang stock mo. Lagi."             |
| `M0.9`  | Launch-Ready Site    | Final domain, TLS, analytics consent, support contact path, App/Play Store badges live on a hidden URL. |

### Combined Release

| Version | Name          | Meaning                                                                                                                                                                                                 |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1.0`   | Public Launch | Mobile + Web Dashboard + Marketing Site go live the same day. Every Definition of Enterprise-Grade bar met. Pilot evidence recorded for both mobile and web. No partial release. No pre-announced date. |

> Time order is implied (mobile and web tracks run in parallel; marketing site is mostly final-mile). What's NOT implied is a calendar — every level ships when its acceptance is met, not before.

## Bootstrap Cost Strategy

TD POS starts as a founder-budget product. The rule is simple:

> Use free tiers and local tooling until real sales, pilot commitments, or hard production limits justify upgrading.

Do not pay for infrastructure because it feels more “serious.” Pay when it protects customers, prevents data loss, unlocks required builds, or supports revenue that already exists.

Pricing changes over time. Before any paid upgrade, re-check the official pricing page and record the decision in this file.

### Cost Principles

- [ ] Default to free tier for every external service during `v0.1` to `v0.4`.
- [ ] Prefer local development over hosted usage when possible.
- [ ] Prefer usage caps/spend caps where available.
- [ ] Do not add a paid product unless it has an owner, a purpose, and a cancellation rule.
- [ ] Do not add a paid product only for “nice to have” dashboards before the first pilot.
- [ ] Do not add enterprise features that force enterprise infrastructure before revenue.
- [ ] Upgrade only when one of these is true:
  - [ ] A paying customer depends on it.
  - [ ] A pilot store would lose data or trust without it.
  - [ ] Free limits are blocking development or release.
  - [ ] Security/compliance requires the paid tier.
  - [ ] Manual work costs more than the subscription.
- [ ] Review infrastructure spend monthly once any paid plan is enabled.
- [ ] Keep a “cancel if unused for 30 days” rule for non-critical subscriptions.

### Free-First Stack

| Product                             | Start Plan              | Why It Is Enough Early                                                                                                                                                                                               | Upgrade Trigger                                                                                                                                         |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase                            | Free                    | Enough for schema, auth experiments, local/pilot sync, and early backend development. Current official pricing lists Free with unlimited API requests, 50k MAU, 500 MB DB, 1 GB file storage, and 2 active projects. | Upgrade when production pilot needs no project pausing, backups/support, more DB/storage/egress, or when the first paying stores depend on the backend. |
| Expo / EAS                          | Free                    | Enough for limited low-priority builds and free updates while iterating. Most dev work should run locally or in development builds.                                                                                  | Upgrade when build queue/limits slow release work, internal distribution needs reliability, or production builds become routine.                        |
| GitHub Actions                      | Free allocation         | Enough for early CI if jobs stay small and mostly Linux.                                                                                                                                                             | Upgrade or optimize when monthly minutes/storage are regularly exhausted.                                                                               |
| Sentry                              | Developer / Free        | Enough for solo-dev error monitoring during pilot if event volume is low.                                                                                                                                            | Upgrade when multiple team members need access, integrations are required, or production error volume exceeds free allocation.                          |
| PostHog                             | Free                    | Enough for early analytics if event capture is intentionally small. Current official pricing includes a generous free tier and product-level billing limits.                                                         | Upgrade only after analytics drives decisions for active stores or usage exceeds free limits.                                                           |
| Vercel / web hosting                | Free/Hobby if used      | Web dashboard is post-mobile-core, so hosted web should stay free until dashboard matters.                                                                                                                           | Upgrade when dashboard has paying users, custom team workflow, or usage/commercial limits require it.                                                   |
| SMS provider                        | None at first           | SMS is a module/conversion feature, not required for offline sale MVP.                                                                                                                                               | Enable only when customer SMS or EOD SMS creates measurable value.                                                                                      |
| AI provider                         | None at first           | AI insights are Phase 3+, not required for v1.0 offline POS.                                                                                                                                                         | Enable after real sales data exists and AI insights can support retention or upsell.                                                                    |
| Error logs / analytics alternatives | Local/simple logs first | Early debugging can start with local logs and sync diagnostics.                                                                                                                                                      | Add paid observability when support needs exceed manual diagnosis.                                                                                      |

### Supabase Upgrade Policy

Start on Supabase Free while building and validating. Upgrade to Pro only when at least one paid/pilot condition is true.

- [ ] Keep local Supabase as the default for development.
- [ ] Use hosted Supabase Free for staging/pilot only when needed.
- [ ] Avoid storing unnecessary logs/blobs in Supabase during Free phase.
- [ ] Keep product images small and defer Storage-heavy workflows.
- [ ] Track DB size monthly.
- [ ] Track MAU monthly.
- [ ] Track file storage monthly.
- [ ] Track egress monthly.
- [ ] Track function/RPC usage monthly.
- [ ] Upgrade to paid Supabase before production if project pausing, backups, or support risk customer trust.
- [ ] Upgrade immediately if a real store depends on hosted sync and Free limits are close.
- [ ] Keep spend cap/usage protections enabled where available.
- [ ] Document the date, reason, and expected monthly cost before upgrading.

Supabase paid upgrade decision record:

- [ ] Date:
- [ ] Plan:
- [ ] Trigger:
- [ ] Expected monthly cost:
- [ ] Stores/customers depending on it:
- [ ] Cancel/downgrade condition:
- [ ] Official pricing checked:

### Expo / EAS Upgrade Policy

Stay on EAS Free while builds are occasional. Do not pay just because the app is serious; pay when build reliability or distribution speed becomes a release bottleneck.

- [ ] Use local Expo dev server for JavaScript iteration.
- [ ] Use development builds for native-module testing.
- [ ] Batch native dependency changes to reduce build count.
- [ ] Avoid unnecessary rebuilds for pure JS/design changes.
- [x] Use EAS Update only after update strategy is documented. (`docs/operations/pilot-readiness.md` defines the channel/rollback guardrails and says not to enable OTA for pilot builds until `expo-updates` and the channel plan are intentional.)
- [ ] Upgrade EAS when build queues block testing or release work.
- [ ] Upgrade EAS when preview/production build cadence becomes regular.

EAS paid upgrade decision record:

- [ ] Date:
- [ ] Plan:
- [ ] Trigger:
- [ ] Build frequency:
- [ ] Expected monthly cost:
- [ ] Cancel/downgrade condition:
- [ ] Official pricing checked:

### Observability Upgrade Policy

Early product stability matters, but paid observability should follow actual risk.

- [x] Start with local sync diagnostics. (`getSyncHealth(db)` + `useSyncHealth()` summarize queue depth, reviewable rows, retry counts, last successful sync, and latest error.)
- [ ] Add an in-app diagnostics screen before paying for complex observability.
- [ ] Use Sentry free/developer only when mobile crash reports become useful.
- [ ] Keep event volume low by filtering noisy/non-actionable events.
- [ ] Do not send receipt contents, customer phone numbers, or sensitive store data to logs.
- [ ] Use PostHog free only for a small set of business events:
  - [ ] app_opened
  - [ ] sale_started
  - [ ] sale_completed
  - [ ] checkout_failed
  - [ ] sync_succeeded
  - [ ] sync_failed
  - [ ] receipt_printed
- [ ] Avoid session replay until privacy policy and consent are ready.
- [ ] Set product-level billing limits where available.

### Paid Upgrade Milestones

| Milestone                  | Maximum Spend Target | Allowed Paid Products                                               |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| `v0.1` Scaffold Foundation | `$0/mo`              | None. Local only.                                                   |
| `v0.2` App Bootstrap       | `$0/mo`              | None unless build tooling is blocked.                               |
| `v0.3` Data Contract       | `$0/mo`              | None. Use local Supabase.                                           |
| `v0.4` Offline Sale MVP    | `$0/mo`              | None required.                                                      |
| `v0.5` Tier A UX           | `$0/mo` preferred    | EAS paid only if native build limits block progress.                |
| `v0.6` Sync Beta           | `$0-$25/mo` target   | Supabase Pro only if hosted sync is needed for pilot.               |
| `v0.7` Printer Beta        | `$0-$25/mo` target   | Same as above; printer hardware may be the main cost.               |
| `v0.8` Tier D/E Shells     | `$0-$50/mo` target   | Supabase/EAS only if CI/build/pilot requires it.                    |
| `v0.9` Test + Polish Gate  | Revenue-backed       | Supabase Pro, EAS paid, Sentry/PostHog only with pilot need.        |
| `1.0` Production           | Revenue-backed       | Paid services allowed when tied to paying stores and support needs. |

### Revenue-Backed Upgrade Rule

Before any recurring paid plan, answer:

- [ ] What customer/store/release does this paid plan protect?
- [ ] What breaks if we do not upgrade?
- [ ] Can local tooling or free tier handle this for another month?
- [ ] Is there a spending cap?
- [ ] Who checks usage every month?
- [ ] What metric tells us the plan is worth it?
- [ ] What condition triggers downgrade/cancellation?

### Monthly Cost Review

Run this review once any paid service is enabled.

- [ ] Supabase usage reviewed.
- [ ] EAS usage reviewed.
- [ ] GitHub Actions usage reviewed.
- [ ] Error monitoring usage reviewed.
- [ ] Analytics usage reviewed.
- [ ] SMS spend reviewed.
- [ ] AI/API spend reviewed.
- [ ] Any unused product canceled.
- [ ] Any product nearing limit has a mitigation plan.
- [ ] Monthly total recorded:

## Global Non-Negotiables

- [ ] Every cashier-facing screen works without internet.
- [ ] Every local write is durable before showing success.
- [ ] Every state-mutating local operation produces a `client_operation_id`.
- [ ] Every state-mutating remote operation accepts and deduplices `client_operation_id`.
- [ ] Inventory writes are deltas only.
- [ ] No code path stores fractional stock.
- [ ] `stock_pieces` remains an integer everywhere.
- [ ] Pack/piece display is derived via `divmod(stock_pieces, pieces_per_pack)`.
- [ ] Sales are immutable after creation, except allowed sync metadata.
- [ ] Receipt numbers use `BRANCH-CASHIER-DATE-SEQUENCE`.
- [ ] Disabled modules are fully hidden, not merely disabled.
- [ ] RLS is enabled on every Supabase table.
- [ ] BIR language uses “BIR-ready,” “provisional receipt,” and similar safe wording only.
- [ ] No deprecated stack choices: no Expo Go for production testing, no `expo-background-fetch`, no legacy `SQLite.openDatabase()`, no Next.js `middleware.ts`, no Zod `message:` param.

## Current State: v0.8 Scaffold Complete

### What Exists

#### Root + tooling

- [x] Root monorepo scaffold exists.
- [x] Root `package.json` has Turborepo scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `format`, `db:*`, `mobile:*`, `check:secrets`, `check:tier-ui-sources`, `check:expo-doctor`, `check:mobile-bundle`, `check:foundation`).
- [x] `turbo.json` uses `tasks`, not deprecated `pipeline`. Schema URL is `https://turborepo.dev/schema.json`.
- [x] TypeScript base config exists (`packages/typescript-config/base.json`, `target: esnext`, `strict`, `noUncheckedIndexedAccess`).
- [x] ESLint 10 flat config exists (`eslint.config.mjs` with TS-ESLint, react-hooks, prettier).
- [x] Prettier config exists (`.prettierrc`, `.prettierignore`).
- [x] `.gitignore` covers node_modules, build outputs, native folders, env files, OS files.
- [x] `.nvmrc` and `.node-version` pin current LTS Node 24.
- [x] `.env.example` uses publishable-key naming, no anon key.
- [x] PR template (`.github/PULL_REQUEST_TEMPLATE.md`) lists the foundation gate and BIR/RLS rules.
- [x] CI workflow (`.github/workflows/foundation.yml`) runs the same foundation gate on Bun 1.3.13.
- [x] Foundation gate scripts: committed-secret scan, forbidden patterns, local SQLite schema drift, tier UI source existence, markdown links, and skill-doc structure.

#### Workspace packages

- [x] `packages/shared` exists with types, constants, five-tier definitions, Zod 4 validators (product/saleItem/inventoryDelta/PH phone/tier entitlement), and tested utilities (formatMoney, splitStock, displayStock, piecesForSaleUnit, generateReceiptNumber, isValidReceiptNumber, normalizePhPhone, isValidPhPhone).
- [x] `packages/db` exists with `DbProduct`, `DbSale`, `DbSaleItem`, `DbCategory`, `DbInventoryLog`, `DbCustomer`, `DbSyncQueueRow`, `DbAppliedOperation`, `DbAuditLog`, `DbBranch`, `DbBusiness`, `DbUser`.
- [x] `packages/typescript-config` exposes `base`, `react-native`, `nextjs` configs.
- [x] `packages/eslint-config` package shell exists.

#### Mobile app

- [x] `apps/mobile/package.json` with Expo SDK 55 dependency set (printer, MMKV, sqlite, audio, haptics, camera, FlashList v2, Reanimated 4, gesture-handler, SVG, vector icons).
- [x] `app.config.ts` with iOS/Android bundles, BLE/camera permissions, `UIBackgroundModes`, `BGTaskSchedulerPermittedIdentifiers`, Bluetooth strings, `expo-build-properties` setting min/compile/target SDK.
- [x] `babel.config.js` (`babel-preset-expo` + module-resolver + reanimated plugin), `metro.config.js` (default Expo).
- [x] `tsconfig.json` extends react-native config and adds `@/*` path; `tsconfig.test.json` adds Bun types.
- [x] Root provider stack: `GestureHandlerRootView` → `SQLiteProvider` → `QueryClientProvider` → `PaperProvider` → `Stack` with dual `Stack.Protected` guards.
- [x] Route shells: `(auth)/sign-in.tsx`, `(auth)/verify-otp.tsx`, `(app)/(tabs)/index.tsx` (sale), `(app)/(tabs)/inventory.tsx`, `(app)/(tabs)/reports.tsx`, `(app)/checkout.tsx`, `(app)/receipt.tsx`, `(app)/scanner.tsx`, root `index.tsx` redirect.
- [x] Services: `services/storage.ts` (single MMKV + Zustand adapter), `services/query-client.ts` (5min stale, 30min gc, retry 2, no refetchOnFocus), `services/supabase.ts` (publishable-key, MMKV auth storage, `autoRefreshToken`, `persistSession`, no URL detection).
- [x] Zustand stores with MMKV persist: `stores/auth-store.ts` (user/business/role/branch/cashier/store/TIN + cached tier entitlements), `stores/cart-store.ts` (CartItem with line totals, partialize items only), `stores/settings-store.ts` (modules, language, themeMode, all modules default OFF).
- [x] Local DB: `db/init.ts`, `db/schema.ts` (LOCAL_SCHEMA_SQL), `db/migrations/001_initial_schema.sql` (products, categories, sales, sale_items, sync_queue, receipt_sequence, customers, inventory_logs, settings, schema_version with PRAGMA WAL + foreign_keys ON, idempotent CREATE IF NOT EXISTS), `runLocalMigrations()` v2 for local Tier B `shift_sessions`, and v3 for local Tier C `manager_approval_requests`.
- [x] Theme + design tokens: `constants/colors.ts` (teal/amber/ink/semantic/categoryBg) with passing test, `constants/theme.ts` (MD3 light + dark + `useAppTheme`).
- [x] i18n: `i18n/translations.ts` (29 EN + 29 TL keys, `useT()` reads from settings store).
- [x] Feature hooks: `features/products/hooks/use-products.ts` (filter by `category_id`, sort by name), `features/products/hooks/use-categories.ts` (with product counts), `features/reports/hooks/use-daily-sales.ts` (hourly bucket, payment mix, totals).
- [x] Hooks: `hooks/use-haptics.ts` (`tapLight`, `tapMedium`, `selection`, `success`, `error`).
- [x] Tier scaffold: subscription/upgrade screens, tier-aware surface shells, locked-surface card, and entitlement refresh after sync.

#### Web app

- [x] Next.js 16 app exists with phone OTP auth, protected dashboard layout, read-only overview, reporting ranges, CSV/PDF exports, sync/audit views, pricing page, and guarded management scaffolds.
- [x] Web tier gating uses shared entitlement definitions for Products, Branches, Users, Modules, Sync, Audit, and Exports.

#### Supabase

- [x] `supabase/config.toml` (PG17, port 54321/54322, phone auth enabled).
- [x] `supabase/migrations/20260508000000_initial_schema.sql` covers users, businesses, branches, categories, products, customers, sales (UNIQUE business_id+receipt_number), sale_items, receipts, inventory_logs, payments, utang_payments, audit_logs (with immutability trigger), applied_operations, and tier entitlement columns.
- [x] `supabase/migrations/20260510000000_tier_normalization.sql` normalizes legacy subscription strings into the five canonical tiers.
- [x] `supabase/migrations/20260510000001_entitlement_guards.sql` adds server-side entitlement helper functions.
- [x] RLS enabled on every Supabase table. SELECT/INSERT/UPDATE policies follow `auth.uid()` pattern; child tables (sale_items, receipts, payments, utang_payments) isolate via parent.
- [x] `apply_inventory_delta` SECURITY DEFINER RPC with race-safe `INSERT...ON CONFLICT DO NOTHING RETURNING`, tenant guard, `in_progress`/`completed`/`failed` lifecycle, negative-stock fallback, `replayed: true` on cached result.
- [x] `supabase/seed.sql` with sample sari-sari business + 6 tingi products (shampoo, yosi, kape, noodles, kendi, drinks).

#### Reference

- [x] `docs/skills/` contains the 22 procedural docs (domain, framework, infra, cross-cutting).
- [x] Suki POS UI reference exists under `UI/` (reference-only — used as design/product source, not copied into RN/Next code). `check:tier-ui-sources` verifies the five tier files exist.

### Resolved And Remaining Gaps

#### Resolved

- [x] `apps/mobile/package.json` now exists.
- [x] `apps/web` now exists as a real Next.js 16 dashboard with reporting/export and guarded management scaffolds.
- [x] Mobile app runtime entry point now exists through Expo Router.
- [x] `apps/mobile/app/_layout.tsx` now exists with the full provider stack.
- [x] Expo config (`app.config.ts`) and EAS config (`eas.json`) now exist.
- [x] RLS gaps in the initial Supabase migration have been patched (every table is covered).
- [x] Shared helper tests and a mobile token smoke test now exist.
- [x] `bun.lock` now exists and was generated with Bun `1.3.13`.
- [x] CI workflow exists and runs the same foundation gate.
- [x] Foundation forbidden-pattern scanner and SQLite-drift checker exist.
- [x] All Zustand stores, services, theme tokens, and i18n exist.
- [x] All Tier A route shells exist (auth, app/tabs, checkout, receipt, scanner) and compile.
- [x] Five-tier scaffold exists across shared constants, Supabase migrations, mobile entitlement cache, mobile surface shells, and web surface guards.

#### Remaining

- [x] Bun is installed as a direct shell command when `scripts/use-toolchain.sh` is sourced; interactive zsh also sees `bun`.
- [x] Supabase CLI is installed (`2.98.2`).
- [x] EAS CLI runner is available through `bunx`; no hidden global install required.
- [!] Docker is not installed/running in this shell, so local Supabase containers cannot start yet.
- [!] Supabase local phone login warns when no SMS provider is configured; hosted staging needs a provider/test-number strategy before real OTP closes.
- [x] `docs/spec-v5.md` exists as the project spec meta-index.
- [/] Supabase Edge Function folders exist. `apply-inventory-delta`, `create-sale`, and `eod-report` report scaffold are implemented; deployment evidence and SMS delivery remain planned.
- [/] Tier A vertical: sale → checkout → receipt now writes a real `db.withTransactionAsync` transaction with sync-queue rows. Inventory and reports tabs now render local SQLite data; scanner uses `expo-camera` CameraView with local SKU lookup, with physical-device scan evidence still pending.
- [/] Sync processor exists with foreground AppState trigger, background-task registration, auth guard, shared executor, and a local sync-health query. Real Supabase staging verification is still pending.
- [ ] No printer integration exists.
- [x] `createClientOperationId()` helper exists (`@tdpos/shared`) and is used by checkout.
- [x] Sale-row + sync-queue payload Zod validators exist (`saleSchema`, `syncQueueEnvelopeSchema` discriminated union).
- [x] SQLite seed helper for development products/categories exists (`db/seed-dev.ts`, gated on `__DEV__`).
- [/] `app/(auth)/sign-in.tsx` still ships a demo-mode shortcut for local development. Production builds hide the button, a `DEMO MODE` banner is shown in dev, and the real phone-OTP flow already lands under P7.1.
- [x] Git repo initialized; first commit `f4bb457` on `main` with full v0.1 foundation. Pushed to `github.com/tomytate/TDPOS`. Subsequent commits land PDF export, reporting ranges, EAS link, and dep refresh (4 commits ahead of origin at audit time).
- [x] Hosted Supabase project provisioned at `ukrftgwpaidsusxqrlnc.supabase.co`. Three migrations applied (initial schema + immutability triggers + `create_sale_atomic`). Phone-auth provider enabled with at least one test OTP for development.
- [x] EAS project linked (`a9cf7f75-…` hardcoded in `apps/mobile/app.config.ts` with `EAS_PROJECT_ID` env override). Android development build now passes locally and in EAS cloud from commit `fcb333e`.
- [!] **Security note — publishable-key exposure 2026-05-10.** The original publishable key was pasted in chat by the owner and is treated as compromised. Rotation pending; tracked at the top of P0.1. RLS protects data so blast radius is limited, but the project should not run with a known-leaked key beyond the immediate rotation window.

### v0.1 Exit Criteria

- [x] This roadmap exists in `docs/`.
- [x] Project owner agrees that current release, if tagged, is `v0.1`.
- [x] First implementation milestone is selected: foundation-first Expo/Supabase bootstrap.
- [ ] Missing external docs such as `screen-specs.md` are either copied into repo or explicitly ignored.

## Phase 0: Project Control Tower

Purpose: make the repo controllable before building features.

### P0.1 Source Control And Hygiene

- [x] Initialize or restore Git repo metadata if missing.
- [x] Confirm default branch name (`main`).
- [x] Add a clean `.gitignore` policy for generated files.
- [x] Stop ignoring `bun.lock`; lockfile must be committed.
- [x] Keep `UI/` as reference-only unless deliberately migrated.
- [x] Decide whether to commit `UI/b_g4eU9LYiRKM/tsconfig.tsbuildinfo`; preferred: ignore/remove generated build info.
- [x] Add `docs/spec-v5.md` if available.
- [ ] Copy any external planning docs into `docs/` if they are required for implementation.
- [ ] **Rotate the publishable Supabase key** (`sb_publishable_a8lkOLXp...`) — pasted in the project chat 2026-05-10 and considered compromised. Replace value in `apps/web/.env.local` and `apps/mobile/.env.local`; verify with `grep -r 'a8lkOLXp' apps/ docs/ packages/ supabase/ scripts/ 2>/dev/null` returning empty. Rotate via Supabase Dashboard → Settings → API → Roll publishable key. Tracked here because hygiene rules belong in source control.

Acceptance:

- [x] `git status` works.
- [x] Generated artifacts are ignored.
- [x] Project-critical docs live in the repo.
- [ ] No known-leaked secret remains in any tracked or local environment file.

### P0.2 Local Toolchain

- [x] Install Bun matching `packageManager` as a direct shell command.
- [x] Install or document Node version. Preferred: Node 24 LTS; Expo SDK 55 requires Node 20.19.x minimum.
- [x] Add `.nvmrc` or `.node-version`.
- [x] Install Supabase CLI.
- [x] Install EAS CLI or document `bunx eas-cli`.
- [x] Add `bun run check:toolchain` doctor so local version drift is mechanical.
- [x] Add `scripts/use-toolchain.sh` to prepend Homebrew Node 24 and user-space Bun paths without overwriting the host's global Node.
- [x] Verify `bun --version` (`1.3.13` through `source scripts/use-toolchain.sh`; interactive zsh also sees Bun).
- [x] Verify `node --version` (`v24.15.0` through `source scripts/use-toolchain.sh`; host `/usr/local/bin/node` remains v25.9.0 and is intentionally not force-linked over).
- [x] Verify `supabase --version` (`2.98.2`).
- [x] Verify `eas --version` or `bunx eas-cli --version` (`bunx` runner available through Bun 1.3.13).

Acceptance:

- [x] New developer can install dependencies from a clean checkout.
- [x] Tooling versions are documented.
- [x] No task requires a hidden global install without docs.

### P0.3 Workspace Scripts

- [x] Ensure root scripts work once apps are added:
      `dev`, `dev:mobile`, `dev:web`, `build`, `lint`, `typecheck`, `test`.
- [x] Add `format` script.
- [x] Add `clean` script that does not delete user files.
- [x] Add `db:start`, `db:stop`, `db:reset`, `db:push`, and `db:seed` scripts when Supabase CLI is ready.
- [x] Add `mobile:ios`, `mobile:android`, and `mobile:start` scripts.

Acceptance:

- [ ] Root commands are the only commands needed for normal work.
- [ ] Scripts do not depend on undocumented directories.

## Phase 1: App Bootstrap, v0.2

Purpose: the app boots, has providers, can open SQLite, and can render a placeholder route.

### P1.1 Mobile Package

- [x] Create `apps/mobile/package.json`.
- [x] Set package name to `@tdpos/mobile`.
- [x] Add `main` entry compatible with Expo Router.
- [x] Add scripts:
      `dev`, `start`, `ios`, `android`, `web`, `lint`, `typecheck`, `test`, `clean`.
- [x] Add Expo SDK 55 dependency.
- [x] Add Expo Router 55 dependency.
- [x] Add React 19.2 and React Native 0.83.6.
- [x] Add `expo-sqlite`.
- [x] Add `expo-background-task`.
- [x] Add `expo-task-manager`.
- [x] Add React Native Paper v5.
- [x] Add Zustand v5.
- [x] Add React Query v5.
- [x] Add React Native MMKV.
- [x] Add Supabase JS v2.
- [x] Add `@haroldtran/react-native-thermal-printer`.
- [x] Add `@shopify/flash-list`.
- [x] Add `expo-image`.
- [x] Add `expo-haptics`.
- [x] Add `expo-audio`.
- [x] Add `expo-camera`.
- [x] Add `expo-linear-gradient`.
- [x] Add `react-native-svg`.
- [x] Add `react-native-reanimated`.
- [x] Add `react-native-gesture-handler`.
- [x] Add local package deps: `@tdpos/shared` and `@tdpos/db`.

Acceptance:

- [x] `bun install` produces `bun.lock`.
- [x] No deprecated packages are introduced.
- [x] Mobile package can be discovered by Turborepo.

### P1.2 Mobile Config

- [x] Add `apps/mobile/app.config.ts`.
- [x] Add app name `TD POS`.
- [x] Add slug.
- [x] Add scheme `tdpos`.
- [x] Add bundle identifier.
- [x] Add Android package name.
- [x] Add `expo-router` plugin.
- [x] Add `expo-sqlite` plugin.
- [x] Add `expo-background-task` plugin.
- [x] Add Bluetooth permission strings.
- [x] Add camera permission strings.
- [x] Add iOS `UIBackgroundModes: ['processing']` and `BGTaskSchedulerPermittedIdentifiers`.
- [x] Do not set removed `newArchEnabled` flag.
- [x] Add `eas.projectId` and Expo owner in dynamic `app.config.ts`. Project linked to EAS ID `a9cf7f75-51ec-45f1-82c3-a73a1db75483`.
- [x] Add environment variable usage for Supabase URL/key.

Acceptance:

- [x] `expo config` resolves without fatal errors.
- [x] Native capabilities needed for printer, camera, background task are declared.

### P1.3 Metro, Babel, TypeScript

- [x] Add `apps/mobile/tsconfig.json`.
- [x] Extend repo TypeScript config.
- [x] Add path alias `@/*` for mobile source.
- [x] Add package alias compatibility for `@tdpos/shared` and `@tdpos/db`.
- [x] Add `babel.config.js` with Expo preset.
- [x] Add Reanimated plugin in correct position.
- [x] Add `metro.config.js` if workspace resolution requires it.
- [x] Confirm TypeScript strict mode stays enabled.

Acceptance:

- [ ] TypeScript can resolve mobile paths.
- [ ] Expo bundler can resolve workspace packages.

### P1.4 Root Provider Stack

- [x] Create `apps/mobile/app/_layout.tsx`.
- [x] Wrap app with `GestureHandlerRootView`.
- [x] Wrap app with `SQLiteProvider databaseName="tdpos.db"`.
- [x] Pass `initializeDatabase` to `SQLiteProvider.onInit`.
- [x] Wrap app with `QueryClientProvider`.
- [x] Wrap app with `PaperProvider`.
- [x] Use Expo Router `Stack`.
- [x] Use `Stack.Protected` only after auth shell is ready.
- [x] Use Paper’s built-in portal support via `PaperProvider`.
- [x] Avoid adding external `PortalProvider` unless a separate portal library is installed.
- [x] Switch theme using `useColorScheme()` plus settings override.

Acceptance:

- [ ] App renders a placeholder screen.
- [ ] SQLite initializes without crashing.
- [ ] Paper theme is applied.

### P1.5 Database Init

- [x] Create `apps/mobile/src/db/init.ts`.
- [x] Import or embed migration text safely.
- [x] Execute `PRAGMA journal_mode = WAL`.
- [x] Execute `PRAGMA foreign_keys = ON`.
- [x] Execute `001_initial_schema.sql`.
- [x] Record migration version.
- [x] Make repeated initialization idempotent.
- [x] Add a local seed helper for development only. (`apps/mobile/src/db/seed-dev.ts`, gated on `__DEV__`, idempotent — only seeds when `products` is empty.)

Acceptance:

- [ ] App can create a fresh local DB.
- [ ] App can reopen existing local DB.
- [ ] Migration can run repeatedly without destructive effects.

### P1.6 Theme And Design Tokens

- [x] Create `apps/mobile/src/constants/colors.ts`.
- [x] Add teal scale from Suki CSS.
- [x] Add amber scale from Suki CSS.
- [x] Add ink scale from Suki CSS.
- [x] Add semantic colors: green, red, blue.
- [x] Add category background map.
- [x] Create `apps/mobile/src/constants/theme.ts`.
- [x] Use `MD3LightTheme`.
- [x] Use `MD3DarkTheme`.
- [x] Use `configureFonts()`.
- [x] Map `primary` to teal.
- [x] Map `tertiary` to amber.
- [x] Map `secondary` to success green.
- [x] Export `useAppTheme`.
- [x] Update `docs/skills/react-native-paper-theming.md` if it still shows old green as the project theme.

Acceptance:

- [ ] Screens can import one theme source.
- [ ] Design token values match `UI/b_g4eU9LYiRKM/app/globals.css`.

## Phase 2: Data Contract Hardening, v0.3

Purpose: the schema and shared helpers are trustworthy before business flows are implemented.

### P2.1 Supabase RLS Coverage

- [x] Enable RLS on `users`.
- [x] Enable RLS on `businesses`.
- [x] Enable RLS on `branches`.
- [x] Enable RLS on `categories`.
- [x] Enable RLS on `products`.
- [x] Enable RLS on `customers`.
- [x] Enable RLS on `sales`.
- [x] Enable RLS on `sale_items`.
- [x] Enable RLS on `receipts`.
- [x] Enable RLS on `inventory_logs`.
- [x] Enable RLS on `payments`.
- [x] Enable RLS on `utang_payments`.
- [x] Enable RLS on `audit_logs`.
- [x] Enable RLS on `applied_operations`.
- [x] Add tenant-safe SELECT policies for all tenant-visible tables.
- [x] Add tenant-safe INSERT policies where direct client inserts are allowed.
- [x] Add tenant-safe UPDATE policies only where updates are allowed.
- [x] Do not add DELETE policies for immutable/audit-critical tables.

Acceptance:

- [x] Script or manual query shows no table missing RLS.
- [ ] Tenant A cannot read Tenant B data.
- [ ] Child tables are isolated via parent relationships where they do not have `business_id`.

### P2.2 Migration Idempotency

- [x] Use `CREATE TABLE IF NOT EXISTS`.
- [x] Use `CREATE INDEX IF NOT EXISTS`.
- [x] Make constraints idempotent or wrap safely.
- [x] Make triggers idempotent by dropping/replacing safely.
- [x] Avoid extension setup that is unnecessary in PG17.
- [x] Confirm no `uuid-ossp`.
- [x] Confirm `gen_random_uuid()` usage is valid.

Acceptance:

- [ ] Migration can be applied to a clean database.
- [ ] Migration can be re-run in local dev without failing.

### P2.3 Immutability And Audit

- [x] Add trigger to prevent DELETE on `sales`. (`prevent_sales_mutation` in `20260509000000_immutability_triggers.sql`)
- [x] Add trigger or policy guard to prevent unauthorized UPDATE on `sales` (allow `synced_at` only).
- [x] Audit log immutability trigger exists (`prevent_audit_mutation` on `audit_logs`).
- [x] Allow `sales.synced_at` update only if needed; reject all other column updates by trigger.
- [x] Prevent UPDATE/DELETE on `sale_items`. (`prevent_sale_items_mutation`)
- [x] Prevent UPDATE/DELETE on `inventory_logs`. (`prevent_inventory_logs_mutation`)
- [ ] Decide immutability rules for `payments` and `receipts`.
- [ ] Add compensating/void strategy document covering:
  - [ ] Void = new compensating sale row with `status = 'voided'` and a reference to the original `sale_id`.
  - [ ] Inventory restore via positive `apply_inventory_delta` keyed by a fresh `client_operation_id`.
  - [ ] Receipt sequence does NOT skip; void produces a separate void receipt referencing the original.
  - [ ] Void requires owner or manager role; cashier can request only.
  - [ ] Void window: configurable per business (default same calendar day, end-of-day cutoff).

Acceptance:

- [ ] Attempted mutation of immutable rows fails.
- [ ] Void/correction path is documented and exercised by an integration test.

### P2.4 Shared Helpers

- [x] Add `formatMoney(value)` using `en-PH`.
- [x] Add `displayStock(stockPieces, piecesPerPack, unitLabel?)`.
- [x] Add `splitStock(stockPieces, piecesPerPack)` returning packs and loose pieces.
- [x] Add `piecesForSaleUnit(qty, wasSoldAs, piecesPerPack)`.
- [x] Add `generateReceiptNumber(branchCode, cashierCode, date, sequence)`.
- [x] Add `isValidReceiptNumber(receiptNumber)`.
- [x] Add `normalizePhPhone(input)`.
- [x] Add `isValidPhPhone(input)`.
- [x] Add `createClientOperationId()` helper. Implemented in `@tdpos/shared` using `globalThis.crypto.randomUUID` with a portable RFC 4122 v4 fallback. Used by checkout and per-line inventory delta queueing.
- [x] Add `formatReceiptDate(date)` helper for `YYYYMMDD` from device-local time. (Tested.)
- [x] Add tests for each helper.

Acceptance:

- [ ] UI and sync code use shared helpers rather than duplicate logic.
- [ ] Tests prove pack/piece math.

### P2.5 Package Validators

- [x] Add Zod validators for product rows. (`productSchema` in `packages/shared/src/validators/index.ts`)
- [x] Add Zod validators for sale rows. (`saleSchema`)
- [x] Add Zod validators for sale item rows. (`saleItemSchema`)
- [x] Add Zod validators for sync queue payloads. (`syncQueueEnvelopeSchema` discriminated union: INSERT sales | DELTA products.)
- [x] Add Zod validators for inventory deltas. (`inventoryDeltaSchema`)
- [x] Add Zod validators for Philippine phone numbers. (`phPhoneSchema` using `z.e164`)
- [x] Use Zod 4 `error:` or shorthand strings.
- [x] Avoid deprecated `message:` param.
- [ ] Re-export validators from `@tdpos/db` so server-side code can import the same schemas.

Acceptance:

- [ ] Invalid payloads fail before being queued.
- [ ] Runtime validation protects sync boundaries.
- [ ] Same schema used on local checkout, sync queue, and Edge Function entry points.

## Phase 3: Local State And Services

Purpose: create the app services that every screen depends on.

### P3.1 MMKV Storage

- [x] Create `apps/mobile/src/services/storage.ts`.
- [x] Export exactly one `storage = createMMKV()`.
- [x] Export `mmkvStorage` adapter for Zustand.
- [x] Export Supabase-compatible MMKV adapter or keep it in `supabase.ts`.
- [x] Do not use AsyncStorage.

Acceptance:

- [ ] Zustand stores persist synchronously.
- [ ] Auth session can persist without hydration flash.

### P3.2 Query Client

- [x] Create `apps/mobile/src/services/query-client.ts`.
- [x] Set default `staleTime` to 5 minutes.
- [x] Set default `gcTime` to 30 minutes.
- [x] Set `retry` to 2.
- [x] Set `refetchOnWindowFocus` to false.
- [ ] Add network awareness later with NetInfo if dependency is added.
- [x] Do not use removed React Query v5 `onSuccess` on queries.

Acceptance:

- [ ] Query hooks share one client.
- [ ] No `cacheTime` appears in code.

### P3.3 Supabase Client

- [x] Create `apps/mobile/src/services/supabase.ts`.
- [x] Use `@supabase/supabase-js` v2.
- [x] Use `EXPO_PUBLIC_SUPABASE_URL`.
- [x] Use `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the mobile client.
- [x] Use MMKV auth storage.
- [x] Set `autoRefreshToken: true`.
- [x] Set `persistSession: true`.
- [x] Set `detectSessionInUrl: false`.
- [ ] Add auth state listener integration with auth store.

Acceptance:

- [ ] Phone OTP session persists after app restart.
- [ ] No Firebase/auth-helper patterns appear.

### P3.4 Auth Store

- [x] Create `apps/mobile/src/stores/auth-store.ts`.
- [x] Store `userId`.
- [x] Store `businessId`.
- [x] Store `role`.
- [x] Store `branchId`.
- [x] Store `branchCode`.
- [x] Store `branchName`.
- [x] Store `cashierCode`.
- [x] Store store name/address/TIN if needed for receipts.
- [x] Add `setAuth`.
- [x] Add `setDevice`.
- [x] Add `clearAuth`.
- [x] Persist only stable auth/device fields.

Acceptance:

- [ ] Receipt generation has branch/cashier identity offline.
- [ ] Protected routes can use auth state.

### P3.5 Settings Store

- [x] Create `apps/mobile/src/stores/settings-store.ts`.
- [x] Import `DEFAULT_MODULE_STATE`.
- [x] Store `modules`.
- [x] Store `language: 'en' | 'tl'`.
- [x] Store `themeMode: 'system' | 'light' | 'dark'`.
- [x] Add `toggleModule`.
- [x] Add `setLanguage`.
- [x] Add `setThemeMode`.
- [x] Persist settings only.
- [x] Keep all modules default OFF.

Acceptance:

- [ ] Utang UI is hidden while module is OFF.
- [ ] Language can switch without code edits.

### P3.6 Cart Store

- [x] Create `apps/mobile/src/stores/cart-store.ts`.
- [x] Define `CartItem`.
- [x] Track `productId`.
- [x] Track `name`.
- [x] Track `qty`.
- [x] Track `unitPrice`.
- [x] Track `wasSoldAs`.
- [x] Track `piecesPerPack`.
- [x] Track `categoryId`.
- [x] Track `imageUri`.
- [x] Track `lineTotal`.
- [x] Store `paymentMethod`.
- [x] Store `tendered`.
- [x] Store `lastSaleResult`.
- [x] Add `addItem`.
- [x] Add `removeItem`.
- [x] Add `updateQty`.
- [x] Add `setPaymentMethod`.
- [x] Add `setTendered`.
- [x] Add `setLastSaleResult`.
- [x] Add `clear`.
- [x] Persist cart items only.
- [x] Do not persist tendered/payment state.
- [ ] Use `useShallow` whenever selecting multiple values in screens.

Acceptance:

- [ ] Cart survives app restart before checkout.
- [ ] Payment state does not leak into next sale.
- [ ] Pack item line totals and pieces sold are correct.

## Phase 4: Offline Sale MVP, v0.4

Purpose: build the core business loop before polishing every screen.

### P4.1 Product Query

- [x] Create `apps/mobile/src/features/products/hooks/use-products.ts`.
- [x] Query SQLite via `useSQLiteContext()`.
- [x] Use `DbProduct` from `@tdpos/db`.
- [x] Filter by `category_id`, not nonexistent `category`.
- [x] Filter `is_active = 1`.
- [x] Sort by name or sales priority.
- [x] Use query key `['products', categoryId ?? 'all']`.
- [x] Use React Query v5 object syntax.
- [x] Use `gcTime`.
- [x] Do not use `onSuccess`.

Acceptance:

- [ ] Products render from local SQLite with no network.

### P4.2 Category Query

- [x] Create `useCategories()`.
- [x] Query local `categories`.
- [x] Include product counts if needed for chips.
- [ ] Add synthetic “All” category in UI, not DB.

Acceptance:

- [ ] Category chips match available local data.

### P4.3 Sale Screen MVP

- [x] Create route `apps/mobile/app/(app)/(tabs)/index.tsx`.
- [x] Render products from `useProducts()`.
- [x] Add products to cart. (Pressable card → `cartStore.addItem` + light haptic.)
- [x] Show cart total.
- [x] Show item count.
- [x] Show piece count.
- [x] Navigate to checkout. (Charge button → `/(app)/checkout` + medium haptic.)
- [x] Add basic loading state. (`ActivityIndicator` while `isPending`.)
- [x] Add empty state.
- [x] Add accessibility labels. (Per-tile `accessibilityLabel` and `accessibilityRole="button"`.)
- [x] Category filter chips. (All + per-category with product counts.)
- [x] Low-stock visual cue on tile.
- [ ] Move the product grid to FlashList v2 once the SKU count justifies it.
- [ ] Replace placeholder cart-add sound with the real audio file (P5.2).

Acceptance:

- [ ] Cashier can add products offline. (Verifiable on device — local SQLite is the source of truth.)
- [x] Cart total is correct. (Computed from line totals; covered by checkout integration tests.)

### P4.4 Checkout Transaction

- [x] Create route `apps/mobile/app/(app)/checkout.tsx`.
- [x] Extract checkout to a pure function (`apps/mobile/src/features/sales/lib/execute-checkout.ts`) so it is unit-testable against `bun:sqlite` via the `AsyncSqliteLike` interface.
- [x] Validate cart is not empty.
- [x] Validate selected payment method.
- [x] Validate tendered amount for cash.
- [x] Use sale id == `client_operation_id` for local idempotency. Same op id returns the existing receipt with `replayed: true`.
- [x] Generate `client_operation_id` via `createClientOperationId()` from `@tdpos/shared`.
- [x] Generate local date `YYYYMMDD` via `formatReceiptDate()`.
- [x] Read/update `receipt_sequence` inside transaction with `ON CONFLICT (branch_code, cashier_code, date) DO UPDATE`.
- [x] Generate receipt number via `generateReceiptNumber()`.
- [x] Use `db.withTransactionAsync()`.
- [x] Insert `sales`.
- [x] Insert `sale_items`.
- [x] Update `products.stock_pieces = stock_pieces - piecesSold`.
- [x] Guard local negative stock with a pre-flight check that returns `insufficient_stock` and writes nothing.
- [x] Insert `inventory_logs` (one per item, type `sale`, negative `pieces_delta`).
- [x] Insert `sync_queue` row for sale creation.
- [x] Insert `sync_queue` row for each inventory delta with its own `client_operation_id`.
- [x] Queue the `sales` sync row before product `DELTA` rows so remote replay order matches the sale → stock dependency.
- [x] Update `receipt_sequence`.
- [x] If Utang is enabled and selected, set `payment_method = 'cash'` and `is_utang = 1`. (Wired in `executeCheckout`; UI exposes only Cash + GCash today because the utang module is OFF by default.)
- [x] Do not invent `payment_method = 'utang'`. (Type-checked: `PaymentMethod` has no `'utang'` variant.)
- [x] Store last sale result on the cart store.
- [x] Navigate to receipt.

Acceptance:

- [x] If any write fails, the whole sale rolls back. (Pre-flight stock check; transaction rollback path covered by `insufficient_stock` test.)
- [x] If sale succeeds, local stock and receipt are consistent. (Covered by §14 #1 integration test.)
- [ ] Sale succeeds without internet. (Verifiable on device — no network calls in `executeCheckout`.)

### P4.5 Receipt Screen MVP

- [x] Create route `apps/mobile/app/(app)/receipt.tsx`.
- [x] Show sale success state.
- [x] Show receipt number (`BRANCH-CASHIER-DATE-SEQUENCE` format from `lastSaleResult`).
- [x] Show total.
- [x] Show tendered amount (cash only).
- [x] Show change (cash only).
- [x] Show line items.
- [x] Show BIR-ready safe footer using the centralized `BIR_RECEIPT_FOOTER`/`BIR_RECEIPT_NOTE` constants from `@tdpos/shared`.
- [x] Add New Sale action.
- [x] Clear cart only after `lastSaleResult` is set. (Cart is cleared in checkout _after_ `setLastSaleResult` succeeds, before navigating to receipt.)
- [x] Render an empty/no-recent-sale fallback if a user lands on `/receipt` directly.

Acceptance:

- [ ] Cashier sees enough information to handwrite/print receipt if printer is unavailable. (Receipt screen now contains store name, address, TIN, receipt number, items, totals, and tendered/change.)

### P4.6 Offline MVP Gate

- [ ] Put device in airplane mode.
- [ ] Open app.
- [ ] Add at least two products.
- [ ] Checkout with cash.
- [ ] Confirm receipt number format.
- [ ] Confirm local stock decremented.
- [ ] Confirm sync queue row exists.
- [ ] Restart app.
- [ ] Confirm data persists.

Gate result:

- [ ] v0.4 can be tagged only after this passes on a physical development build or simulator with equivalent SQLite behavior.

## Phase 5: Tier A Cashier Experience, v0.5

Purpose: make the MVP feel like the intended Suki/TD POS cashier product.

### P5.1 Shared UI Components

- [ ] `money.tsx`: peso formatting, tabular numbers, accessibility label.
- [ ] `chip-row.tsx`: horizontal Paper chips, active state.
- [ ] `product-glyph.tsx`: `expo-image` plus category fallback.
- [ ] `kpi-card.tsx`: compact metric card.
- [ ] `eyebrow.tsx`: compact section label.
- [ ] `spark-bar.tsx`: SVG mini bar chart.
- [ ] `skeleton-loader.tsx`: custom Reanimated skeleton.
- [ ] `status-chip.tsx`: live/low/sync status.
- [ ] `empty-state.tsx`: operational empty states.
- [ ] `screen-shell.tsx`: consistent safe-area and background handling if useful.

Acceptance:

- [ ] UI components are reusable and do not duplicate business logic.
- [ ] Components are mobile-native, not copied DOM/CSS from `UI/`.

### P5.2 Sale Screen Polish

- [ ] Teal app bar.
- [ ] Store/branch subtitle.
- [ ] Search action placeholder or working search.
- [ ] Category chips.
- [ ] FlashList product grid.
- [ ] No `estimatedItemSize`.
- [ ] Product tile accessibility label.
- [ ] Product image fallback.
- [ ] Price badge.
- [ ] Cart bar in teal-800.
- [ ] Amber Charge button.
- [ ] Haptic on product add.
- [ ] Cart-add sound.
- [ ] Skeleton grid.
- [ ] Empty category state.

Acceptance:

- [ ] 500 SKU grid scrolls smoothly.
- [ ] No text overlaps on small devices.

### P5.3 Checkout Screen Polish

- [ ] Payment cards: Cash, GCash, Utang only if module enabled.
- [ ] Selected payment visual state.
- [ ] Denomination grid.
- [ ] Hide denomination grid for Utang.
- [ ] Change due live region.
- [ ] Cancel button.
- [ ] Confirm button.
- [ ] Haptic on payment select.
- [ ] Haptic on denomination tap.
- [ ] Success haptic on confirm.
- [ ] Error haptic on validation failure.
- [ ] Sale-success sound.
- [ ] Error sound.

Acceptance:

- [ ] Cashier can complete checkout with one hand.
- [ ] Utang cannot appear when module is OFF.

### P5.4 Receipt Screen Polish

- [ ] Dark teal success screen.
- [ ] Animated checkmark.
- [ ] Thermal receipt visual.
- [ ] Torn edge SVG.
- [ ] Monospace receipt section.
- [ ] Store name/address/TIN from auth/store settings.
- [ ] Receipt number in full format.
- [ ] Line items align with tabular numbers.
- [ ] BIR-ready language only.
- [ ] SMS button placeholder.
- [ ] Print button placeholder until printer integration.
- [ ] New Sale primary action.

Acceptance:

- [ ] Receipt screen can be used as fallback if printer fails.

### P5.5 Inventory Screen

- [x] Route `apps/mobile/app/(app)/(tabs)/inventory.tsx`.
- [x] KPI header: stock value, low items, out of stock.
- [x] Category/filter chips.
- [x] Product list from SQLite.
- [x] Stock display via `divmod`.
- [x] Low stock badge.
- [ ] Low stock row background.
- [ ] Spark bar decorative chart.
- [ ] Restock button placeholder.
- [ ] Skeleton list.
- [x] Accessibility label for low badge.

Acceptance:

- [x] Inventory never displays fractional stock.
- [x] Low stock rules use `reorder_point_pieces`.

### P5.6 End-of-Day Screen

- [x] Route `apps/mobile/app/(app)/(tabs)/reports.tsx`.
- [x] Create `useDailySales(dateStr)`.
- [x] Query `sales.total_amount`, not nonexistent `total`.
- [x] Use SQLite `created_at` as unix seconds, not milliseconds.
- [x] Aggregate hourly sales.
- [x] Aggregate payment mix.
- [x] Include sale count.
- [x] Include item count from `sale_items`.
- [x] Render gross sales.
- [ ] Render hourly SVG chart.
- [x] Render payment mix bar.
- [~] Include Utang in mix only if module enabled or if data exists and user has permission. (Current report includes existing Utang rows; permission polish remains with modules.)

Acceptance:

- [x] EOD works offline from local sales data.

### P5.7 Scanner Modal

- [x] Route `apps/mobile/app/(app)/scanner.tsx` exists.
- [x] Use `expo-camera` `CameraView` with EAN/UPC/code barcode settings.
- [x] Request camera permissions and show a product-tile fallback while permission is unavailable.
- [x] Lookup scanned SKU/product id in local SQLite and add one piece through the existing cart store.
- [ ] Prove scanning on a physical development build with real product barcodes.
- [x] Support EAN-13.
- [x] Support UPC-A.
- [x] Support Code 128.
- [x] Throttle scan handling.
- [x] Lookup product by `sku`.
- [x] Add product to cart.
- [ ] Play scan beep.
- [x] Haptic on successful scan.
- [x] Show permission denied fallback.

Acceptance:

- [ ] Barcode scan adds a product without network.

### P5.8 i18n

- [x] Create `apps/mobile/src/i18n/translations.ts`.
- [x] Add English keys.
- [x] Add Tagalog keys.
- [x] Add `useT()` hook.
- [x] Read language from settings store.
- [~] Avoid hard-coded user-facing strings in Tier A screens where practical. (Tab labels, sale, checkout, receipt, inventory, reports placeholders are translated; auth screens still hard-code.)

Acceptance:

- [ ] Core sale flow can switch EN/TL on a real device build.

## Phase 6: Sync Beta, v0.6

Purpose: local operations safely reach Supabase without double-applying.

### P6.1 Sync Queue Contract

- [ ] Define sync queue payload types.
- [ ] Define operation types.
- [ ] Confirm each payload includes `client_operation_id`.
- [ ] Confirm inventory payload uses `delta`.
- [ ] Confirm sale payload includes immutable sale and items.
- [ ] Confirm retry fields are updated locally.

Acceptance:

- [ ] Every queued row is self-sufficient for retry.

### P6.2 Foreground Sync Processor

- [x] Create `apps/mobile/src/services/sync-processor.ts`.
- [x] Open/read unsynced queue rows.
- [x] Process oldest first (`ORDER BY created_at ASC, id ASC`).
- [x] Limit batch size (default 50, configurable).
- [x] Handle `DELTA`.
- [x] Handle sale creation (`INSERT` to `sales`).
- [x] Mark `synced_at` on success and clear `last_error`.
- [x] Increment `retry_count` on failure.
- [x] Store `last_error`.
- [x] Skip rows above max retries (default 10).
- [x] Validate every payload with the shared `syncQueueEnvelopeSchema` Zod discriminated union before calling the network. Invalid envelopes are bumped to `retry_count = 999` with `invalid_envelope:` so they never auto-retry.
- [x] Defer rows when the server returns `concurrent_in_progress` without bumping `retry_count`.
- [x] Mark rows reviewable (`retry_count = 999`, `pending_sync_review:` last_error) when the server returns `ok: false` for a non-transient reason such as `insufficient_stock_or_not_found`.
- [x] Return `{ total, synced, failed, deferred, reviewable }`.

Acceptance:

- [x] Running processor twice does not double-apply inventory. (Verified by `sync-processor.test.ts` "defers concurrent_in_progress" + "marks reviewable" + the existing local-idempotency executeCheckout test.)
- [ ] Wire to real Supabase project at runtime under P7 (auth pairing).

### P6.3 Background Sync

- [x] Create `sync-task.ts`.
- [x] Define task at module top level.
- [x] Use `expo-background-task`.
- [x] Do not use `expo-background-fetch`.
- [x] Create `register-sync.ts`.
- [x] Register background task on app startup. (`useBackgroundSyncRegistration()` runs from root `_layout.tsx` and unregisters when signed out.)
- [x] Add foreground AppState sync trigger. (`SyncTriggerEffect` runs on mount/active only when Supabase is configured and `authStore.userId` exists.)
- [x] Add dev-only manual trigger. (`triggerBackgroundSyncForTesting()` wraps `BackgroundTask.triggerTaskWorkerForTestingAsync()` and returns `false` outside dev.)
- [x] Foreground and background sync share the same executor. (`runSyncQueueOnce(db)` prevents route drift.)
- [x] Foreground/background overlap does not double-run. (`createSyncRunner` now uses a module-level lock; covered by `sync-runner.test.ts`.)

Acceptance:

- [/] Sync can run when app returns to foreground. Code path is wired; staging Supabase verification is blocked on P7 auth pairing.
- [/] Background task is registered in development build. Code path is wired; physical-device development build verification is pending because background tasks cannot be proven by local unit tests alone.

### P6.4 Supabase RPC / Edge Functions

- [x] Implement or wrap `apply_inventory_delta`. (`supabase/migrations/20260508000000_initial_schema.sql` defines the RPC; `supabase/functions/apply-inventory-delta/index.ts` is the HTTP wrapper that validates the payload before calling it.)
- [x] Ensure RPC uses `INSERT...ON CONFLICT DO NOTHING RETURNING`. (Verified in the migration — `INSERT INTO applied_operations ... ON CONFLICT (business_id, client_operation_id) DO NOTHING RETURNING true`.)
- [x] Return cached result for replayed completed operations. (RPC returns `existing_result || jsonb_build_object('replayed', true)` for completed/failed prior ops.)
- [x] Return retry response for concurrent in-progress operations. (RPC returns `{ ok: false, reason: 'concurrent_in_progress', retry_after_ms: 500 }`.)
- [x] Return failed result for negative stock. (RPC returns `{ ok: false, reason: 'insufficient_stock_or_not_found' }` and stores it in applied_operations as `failed`.)
- [x] Implement sale creation sync path. (`supabase/functions/create-sale/index.ts` validates the payload and delegates to `create_sale_atomic(p_payload)`, which commits `sales` + `sale_items` together and returns replay for duplicate sale ids.)
- [x] Use `@supabase/server` for Edge Functions. (`withSupabase({ auth: 'user' }, ...)` in both functions; verified against <https://supabase.com/blog/introducing-supabase-server> on 2026-05-09.)
- [x] Do not hand-roll JWT verification.
- [x] Do not create `_shared/supabase.ts` boilerplate.
- [x] Mobile-side wiring helper: `apps/mobile/src/services/sync-callables.ts` (`createSyncCallables(supabase)`) routes `applyInventoryDelta` → `supabase.rpc('apply_inventory_delta')` and `createSale` → `supabase.functions.invoke('create-sale', { body })`. Adapter is structurally compatible with `@supabase/supabase-js` v2 client. 4 unit tests (`sync-callables.test.ts`).
- [x] Remote sale creation is atomic. (`supabase/migrations/20260509000001_create_sale_atomic.sql` creates `create_sale_atomic`; inventory deltas remain separate race-safe operations.)

Acceptance:

- [x] Same operation id sent twice produces one mutation. (RPC race-safe pattern + Edge Function idempotency check on `sales.id` and `applied_operations` primary key.)
- [x] Tenant checks happen inside security-definer RPCs. (`apply_inventory_delta` reads `auth.uid()`'s `business_id`; `create_sale_atomic` validates business, branch, user, customer, and product ownership before inserting.)
- [ ] End-to-end verification against a real Supabase project blocked on P7 auth pairing.

### P6.5 Conflict Handling

- [x] Negative stock remote conflict marks local sync_queue row reviewable. (Sync processor sets `retry_count = 999` with `pending_sync_review:insufficient_stock_or_not_found`.)
- [ ] UI exposes sync issues to manager/owner. (P10.3 Diagnostics screen.)
- [x] Failed rows retain full error details. (`last_error` column populated; not cleared on retry, only on success.)
- [ ] Retry does not lose original payload.
- [ ] Manual review flow is documented.

Acceptance:

- [ ] Conflicts are visible and recoverable.

## Phase 7: Auth And Onboarding

Purpose: stores can log in, identify branch/cashier, and operate offline after setup.

### P7.1 Phone OTP

- [x] Create sign-in route. (`apps/mobile/app/(auth)/sign-in.tsx` — real phone form with Paper TextInput, normalize → validate → `supabase.auth.signInWithOtp()`, `__DEV__`-only demo fallback button.)
- [x] Validate Philippine phone numbers. (Uses `isValidPhPhone` from `@tdpos/shared` — same validator as web login screen.)
- [x] Normalize `09XX` to `+639XX`. (`normalizePhPhone` from `@tdpos/shared`.)
- [x] Send OTP with Supabase. (`supabase.auth.signInWithOtp({ phone })`.)
- [x] Create OTP verification route. (`apps/mobile/app/(auth)/verify-otp.tsx` — 6-digit Paper TextInput, `keyboardType="number-pad"`, `autoComplete="one-time-code"`, max length 6.)
- [x] Verify OTP. (`supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.)
- [x] Persist session in MMKV. (`mmkvSupabaseStorage` adapter in `services/supabase.ts`; `autoRefreshToken: true`, `persistSession: true`.)
- [x] Load user/business/branch metadata. New `services/auth-bootstrap.ts` fetches `users` + first active `branches` + `businesses` rows after every `INITIAL_SESSION` / `SIGNED_IN` event and populates `auth-store`. Returns a discriminated union so the auth screen can render `account_not_provisioned` / `business_not_assigned` / `no_branches_configured` / `query_failed` errors. Branch code derived from name initials, cashier code from last 2 hex of user_id.
- [x] Wire `useAuthStateListener()` in `_layout.tsx` so `onAuthStateChange` (which fires `INITIAL_SESSION` immediately on subscribe with the cached session) drives store hydration without a forbidden direct session-fetch call.
- [x] Tests: 7 unit tests in `services/auth-bootstrap.test.ts` covering happy path, role fallback, missing user, missing business, missing branch, query error, and non-fatal business-metadata failure.

Acceptance:

- [ ] User can sign in with phone OTP. (Verifiable end-to-end against the staging Supabase project once the leaked publishable key is rotated.)
- [ ] App stays signed in after restart. (Same gate.)

### P7.2 Device / Cashier Setup

- [ ] Assign or fetch `branchCode`.
- [ ] Assign or fetch `cashierCode`.
- [/] Store device identity locally. Branch/cashier live in `auth-store`; install ID persists in MMKV via `getOrCreateInstallId()`. Real server-issued device registration still pending.
- [ ] Prevent checkout without branch/cashier code.
- [/] Document how new devices get a code. Install id is generated locally and heartbeats into `business_devices`; human pairing/code UX remains pending.

Acceptance:

- [ ] Receipt namespace is physically uncollidable offline.

### P7.3 Initial Data Sync

- [ ] Download products.
- [ ] Download categories.
- [ ] Download customers if enabled/allowed.
- [ ] Store in SQLite.
- [ ] Support app restart after initial sync.
- [ ] Show “ready for offline sales” state.

Acceptance:

- [ ] After setup, device can sell offline.

## Phase 8: BIR-Ready Receipts And Printer, v0.7

Purpose: receipts are legally careful, readable, and printable.

### P8.1 Receipt Copy Discipline

- [ ] Use “BIR-ready receipt format.”
- [ ] Use “Provisional receipt” where appropriate.
- [ ] Do not use “BIR-compliant.”
- [ ] Do not use “BIR-certified.”
- [ ] Do not use “BIR-approved.”
- [ ] Do not use “Official Receipt” until legally allowed.
- [ ] Add copy scan to PR checklist.

Acceptance:

- [ ] Grep finds forbidden language only inside docs warning against it.

### P8.2 Receipt Fields

- [ ] Store name.
- [ ] Store address.
- [ ] TIN if available.
- [ ] Receipt number.
- [ ] Date/time.
- [ ] Cashier/device code.
- [ ] Line item description.
- [ ] Quantity as sold.
- [ ] Unit price.
- [ ] Line subtotal.
- [ ] Total.
- [ ] Payment method.
- [ ] Tendered.
- [ ] Change.
- [ ] Footer.
- [ ] TD POS branding.

Acceptance:

- [ ] Screen and printed receipt contain the same core data.

### P8.3 Printer Integration

- [ ] Verify `@haroldtran/react-native-thermal-printer` installation.
- [ ] Device-test transitive `react-native-ping` peer range warning from the printer package before enabling print UI.
- [ ] Build printer service.
- [ ] Initialize BLE printer.
- [ ] List devices.
- [ ] Connect to device.
- [ ] Save selected printer.
- [ ] Format ESC/POS text.
- [ ] Print receipt.
- [ ] Handle printer unavailable.
- [ ] Handle print retry.
- [ ] Add fallback “show receipt” behavior.

Acceptance:

- [ ] Physical test print succeeds on Android.
- [ ] Physical test print succeeds on iOS or iOS limitation is documented.

## Phase 9: Correctness Tests, v0.8

Purpose: prove the product’s core promises.

### P9.1 Required Phase 1 Tests

- [x] Tingi inventory math:
      sell 7 from a 12-sachet pack, remaining `stock_pieces = 5`. (`execute-checkout.test.ts`, `bun:sqlite` integration.)
- [ ] Delta concurrency:
      two offline branches both sell 1 of 2, final server stock = 0. (Requires Postgres test environment — server-side path.)
- [~] Negative stock guard:
  sale exceeding stock becomes `pending_sync_review`. (Local pre-flight refuses the write today; the `pending_sync_review` server-state mapping lands when the sync processor does.)
- [x] Idempotency replay (local):
      same `client_operation_id` twice through `executeCheckout` produces one sale row, one stock decrement, and `replayed: true` on the second call. The server-side replay test still requires Postgres.
- [x] Receipt collision:
      two cashier codes × 5 sales each on the same date yield 10 unique receipt numbers.
- [ ] TOCTOU race:
      100 concurrent calls with same op id cause exactly one decrement. (Postgres-side; covered by `apply_inventory_delta` design but not yet asserted in CI.)

Acceptance:

- [/] Three of six tests pass in CI today (the local-only subset). The remaining three require a Supabase PG17 test container — track under P9.4.

### P9.2 Local Unit Tests

- [x] `displayStock`.
- [x] `splitStock`.
- [x] `piecesForSaleUnit`.
- [x] `generateReceiptNumber`.
- [x] `isValidReceiptNumber`.
- [x] `createClientOperationId` produces RFC 4122 v4 UUIDs and unique values.
- [x] `formatReceiptDate` returns `YYYYMMDD` from device-local components.
- [x] cart line totals (covered indirectly by the §14 #1 integration test).
- [x] cash change calculation (covered by `executeCheckout` `change` field tests).
- [ ] module visibility logic (utang gating once the UI exposes it).

Acceptance:

- [x] Business math can be changed only with tests failing first. (13 shared tests + 5 mobile checkout integration tests.)

### P9.3 Local Integration Tests

- [ ] SQLite migration initializes.
- [ ] Checkout transaction inserts sale/items.
- [ ] Checkout transaction decrements stock.
- [ ] Checkout transaction writes sync queue.
- [ ] Checkout transaction rolls back on failure.
- [ ] Receipt sequence increments.

Acceptance:

- [ ] Offline sale persistence is covered.

### P9.4 Database Tests

- [ ] Apply migrations to local Supabase.
- [ ] Verify RLS exists on every table.
- [ ] Verify tenant isolation.
- [ ] Verify immutable triggers.
- [ ] Verify `apply_inventory_delta` idempotency.
- [ ] Verify negative stock guard.
- [ ] Verify stale in-progress behavior.

Acceptance:

- [ ] Database behavior is tested outside the app.

## Phase 10: Production Candidate, v0.9

Purpose: prepare for pilot stores.

### P10.1 CI/CD

- [x] Add GitHub Actions workflow.
- [x] Run install.
- [x] Run typecheck.
- [x] Run lint.
- [x] Run tests.
- [x] Run migration validation if feasible.
- [ ] Cache Bun dependencies.
- [ ] Protect main branch with CI.

Acceptance:

- [ ] Broken code cannot merge without an explicit override.

### P10.2 EAS Builds

- [x] Add `eas.json`.
- [x] Add development profile.
- [x] Add preview profile.
- [x] Add production profile.
- [x] Configure iOS simulator dev build.
- [x] Link mobile app to an EAS project. `npx eas-cli@latest init --id a9cf7f75-51ec-45f1-82c3-a73a1db75483` now exits successfully from `apps/mobile`.
- [x] Configure Android internal build.
- [x] Configure production app bundle.
- [ ] Separate local/staging/prod env vars.
- [ ] Document credential setup.

Acceptance:

- [x] Team can produce a reproducible dev build.
- [ ] Team can produce a preview build for pilot users.

### P10.3 Observability

- [ ] Add app error logging plan.
- [x] Add local sync-health query. (`apps/mobile/src/features/diagnostics/lib/sync-health.ts`; 2 unit tests cover empty and mixed queue states.)
- [x] Add sync error logs. Latest `sync_queue.last_error` is surfaced by `getSyncHealth`; the support bundle includes the most recent sync errors without raw payloads.
- [x] Add local diagnostics screen. (`app/(app)/diagnostics.tsx`, linked from Reports for owner/manager roles only.)
- [x] Show unsynced queue count.
- [x] Show failed sync count.
- [x] Show last successful sync time.
- [x] Show reviewable sync count.
- [x] Show app version, local schema version, install ID, branch/cashier identity, role, MMKV byte size, and MMKV key count.
- [x] Copy sanitized support bundle. (`support-bundle.ts` excludes raw queue payloads, shortens operation ids, and sanitizes obvious phone/email strings.)
- [ ] Add crash reporting when approved.
- [ ] Add privacy review for logs.

Acceptance:

- [x] Support can diagnose “my sale did not sync” without opening SQLite manually. The diagnostics screen exposes queue health and the support bundle carries recent sanitized sync errors; the runbook defines the triage path.

### P10.4 Security And Privacy

- [ ] Document stored local data.
- [ ] Document customer data handling.
- [ ] Document phone auth flow.
- [x] Ensure secrets are not committed. `scripts/check-secrets.mjs` scans tracked text/code/config files for real-looking service-role, JWT, private-key, GitHub, Anthropic, and payment-secret material.
- [ ] Ensure service role keys are never in mobile app.
- [ ] Review RLS policies.
- [ ] Review Edge Function auth modes.
- [ ] Review logs for PII.

Acceptance:

- [ ] Mobile app contains publishable/anon keys only.
- [ ] Tenant isolation is validated.

### P10.5 Accessibility

- [ ] Product tiles have labels.
- [ ] Cart total changes are announced politely.
- [ ] Change due is announced assertively.
- [ ] Buttons have roles.
- [ ] Decorative charts are hidden from screen readers.
- [ ] Touch targets are at least 48dp.
- [ ] VoiceOver full sale flow works.
- [ ] TalkBack full sale flow works.

Acceptance:

- [ ] A cashier can complete the core flow with screen reader enabled.

### P10.6 Performance

- [ ] Cold launch measured.
- [ ] First sale screen render measured.
- [ ] Product grid scroll tested with 500 SKUs.
- [ ] Checkout transaction duration measured.
- [ ] Receipt render measured.
- [ ] Image cache behavior tested.
- [ ] Background sync batch duration measured.
- [ ] Low-end Android phone tested.

Acceptance:

- [ ] Cashier flow feels instant on target low-cost devices.

### P10.7 Pilot Readiness

- [ ] Choose one pilot store.
- [ ] Create pilot data.
- [ ] Train cashier.
- [ ] Train owner/manager.
- [x] Prepare rollback plan. (`docs/operations/pilot-readiness.md`.)
- [x] Prepare manual receipt fallback. (`docs/operations/pilot-readiness.md`.)
- [/] Prepare support contact path. Pilot path and response goals are documented in `docs/operations/{pilot-readiness,support-runbook}.md`; public support email/domain remains Phase M.
- [ ] Run one full day simulation.
- [ ] Run one real pilot day.
- [ ] Reconcile physical vs system stock.

Acceptance:

- [ ] One pilot day completes without data loss.

## Phase 11: v1.0 Combined Launch Gate

Purpose: decide whether TD POS is safe to call v1.0. Per the Release Pact, v1.0 ships only when **every** sub-gate below is `[x]`. There is no partial release. There is no "ship mobile, then web later." There is no calendar pressure.

### P11.1 Mobile Core Product Gate

- [ ] Cashier can sign in via real phone OTP (no demo-mode shortcut).
- [ ] Device has branch/cashier identity.
- [ ] Products are available offline.
- [ ] Cashier can complete sale offline.
- [ ] Receipt number is generated offline.
- [ ] Stock decrements locally.
- [ ] Sync queue records mutation.
- [ ] App can restart before sync without losing sale.
- [ ] App can reconnect and sync.
- [ ] Duplicate sync does not duplicate mutation.
- [ ] Negative stock conflict is visible.
- [ ] Receipt can be printed or displayed.
- [ ] End-of-day totals are available locally.

### P11.2 Web Dashboard Gate

- [ ] Owner can sign in via the same phone OTP path as mobile.
- [ ] Read-only dashboard reflects latest synced state for the tenant.
- [ ] Reports (daily/weekly/monthly) work and export CSV + PDF.
- [ ] Product, branch, user, module management all work.
- [/] Sync health view shows per-device queue depth and last seen. Web `/sync` reads `business_devices` for status, last-seen timestamps, and sanitized queue counts from mobile foreground heartbeat. Production heartbeat cadence and stale-device rules remain pending.
- [ ] Audit log view is accessible to owner/manager.
- [ ] Tenant A cannot see tenant B at any layer (RLS verified).
- [ ] WCAG 2.2 AA equivalent across every screen.
- [ ] LCP < 2.5 s on a fresh browser session (cold cache).
- [ ] No `getSession()` in any code path.
- [ ] No `middleware.ts`; only `proxy.ts`.

### P11.3 Marketing Site Gate

- [ ] Site live on stable domain with TLS.
- [ ] Approved BIR language only.
- [ ] Privacy policy + Terms of Service published.
- [ ] Pricing page reflects current tier model.
- [ ] App Store + Play Store badges live (or documented as Day-One pending).
- [ ] Support contact path live and reachable.
- [ ] Analytics consent banner working.

### P11.4 Engineering Gate

- [ ] `bun run typecheck` passes for every workspace.
- [ ] `bun run lint` passes for every workspace.
- [ ] `bun run test` passes for every workspace.
- [ ] All six §14 required tests pass: tingi math, delta concurrency, negative stock guard, idempotency replay, receipt collision, TOCTOU race.
- [ ] CI is green on the latest main commit.
- [ ] EAS production builds pass for both iOS and Android.
- [ ] Web production build passes.
- [ ] Supabase migrations apply cleanly to a fresh PG17 instance.
- [ ] Forbidden-patterns scan finds nothing.
- [ ] No known critical security issue.
- [ ] No known data-loss bug.
- [ ] No `__DEV__`-only branches reachable in production builds.

### P11.5 Documentation Gate

- [ ] Documentation Quality Gate (DocGate-1 through DocGate-6) all `[x]`.
- [x] `docs/spec-v5.md` resolves to a real meta-index.
- [ ] Every package has a skill doc with verified official-source link.
- [ ] Every architectural choice has an ADR.
- [ ] CLAUDE.md / AGENTS.md / GEMINI.md / CODEX.md stay in sync via single-source references.
- [x] Public runbook covers the top 10 support scenarios. (`docs/operations/support-runbook.md`.)
- [ ] Suki integration doc reconciled (live or archived).

### P11.6 Operations Gate

- [ ] Pilot store completed at least one full reconciliation day with no manual database repair.
- [ ] Web dashboard pilot completed at least one full owner-monitoring day.
- [/] Support process is defined and tested with a real ticket. Defined in `docs/operations/support-runbook.md`; real-ticket test pending pilot.
- [x] On-call rotation defined or single-owner explicit.
- [x] Incident response template ready.
- [ ] Diagnostics screen ships in mobile.
- [ ] Sync health view ships in web.

### P11.7 Business Gate

- [ ] Pricing/tier for v1.0 is defined and live on the marketing site.
- [ ] Store onboarding steps are documented and tested by a non-engineer.
- [ ] Owner understands and accepts BIR-ready (not BIR-accredited) posture.
- [ ] Manual fallback process exists and is tested.
- [ ] Pilot feedback has been reviewed and critical issues are closed.

### P11.8 Definition of Enterprise-Grade

- [ ] EG-1 Reliability — every row `[x]`.
- [ ] EG-2 Security — every row `[x]`.
- [ ] EG-3 Privacy — every row `[x]`.
- [ ] EG-4 Performance — every row `[x]`.
- [ ] EG-5 Accessibility — every row `[x]`.
- [ ] EG-6 Documentation — every row `[x]`.
- [ ] EG-7 Operations — every row `[x]`.
- [ ] EG-8 Compliance — every row `[x]`.
- [ ] EG-9 Testing — every row `[x]`.
- [ ] EG-10 Localization — every row `[x]`.
- [ ] EG-11 Quality of Life — every row `[x]`.
- [ ] EG-12 Marketing And Brand — every row `[x]`.

### P11.9 Final v1.0 Definition

TD POS v1.0 can ship when **all** of the following are true on the same day:

1. A sari-sari store can run a full day of cashier sales offline, reconnect later, sync without duplicate or lost inventory changes, print or display BIR-ready provisional receipts, and reconcile stock without manual database repair.
2. The store's owner can monitor that day from the web dashboard, export a BIR-ready report, and manage products/branches/users without touching the database.
3. The marketing site is live, accurate, and uses approved BIR language only.
4. Every Definition of Enterprise-Grade row is `[x]`.
5. Every doc gate is `[x]`.
6. No critical or high-severity issue is open.

If any one of these is false, v1.0 does not ship. There is no exception.

## Phase 11.5: Enterprise Hardening (v1.0 GATE — not optional)

Purpose: every row in this phase blocks v1.0. Per the Release Pact, "enterprise-grade from day one" means these items must land **before** v1.0 ships, not after a pilot. The earlier framing ("between pilot and multi-store") was wrong; pilot is still required, but pilot evidence with these items missing does not unlock v1.0.

### P11.5.1 Local Database Versioning

- [x] Add a forward-migrator that reads `schema_version`, applies missing migrations in order, and writes one row per applied version. `runLocalMigrations()` now owns mobile SQLite startup.
- [ ] Migration files numbered `00X_*.sql` with a Bun script that runs them on a fresh DB.
- [ ] Drift checker (`scripts/check-local-sqlite-schema.mjs`) extended to enforce migration ordering, not only the v1 string.
- [x] Test: open an old DB created from `001_initial_schema.sql`, run app, confirm future migrations apply once and never again. Covered by `apps/mobile/src/db/migrations.test.ts`.
- [ ] Document a downgrade rule: ship-only-forward; downgrades require export + reinstall.

### P11.5.2 Clock Skew And Receipt Date Safety

- [ ] Decide the canonical sale clock: device wall-clock at the moment of `db.withTransactionAsync` start.
- [ ] Capture `device_local_time` AND `device_timezone` AND `synced_server_time_at_last_handshake` per sale.
- [ ] Reject device clocks that are >24h ahead/behind last server handshake from issuing new receipts; show "Set device time" prompt instead.
- [ ] Server stores both `device_local_time` and server-side `received_at` so reports can detect skew.
- [ ] Receipt `DATE` segment uses local sale date — not server date — to keep receipts unambiguous offline.
- [ ] Document the skew tolerance in the ops runbook so support can explain "why my receipt date is yesterday."

### P11.5.3 Cycle Count And Stock Adjustment

- [ ] Inventory screen exposes a "Stock take" entry (manager+ only).
- [ ] Stock take produces an `inventory_logs` row with `type = 'adjustment'` and a positive or negative `pieces_delta`.
- [ ] Adjustment requires a `reason` enum: `count_correction`, `damage`, `theft`, `expiry`, `other` (free text).
- [ ] Stock take goes through `apply_inventory_delta` so the same idempotent path covers physical counts.
- [ ] Stock Accuracy Score (SAS) compares last stock take vs current `stock_pieces`. Used as the marketing metric in CLAUDE.md.

### P11.5.4 Refund / Void Workflow

- [ ] Receipt screen exposes a "Void this sale" path (manager+ only) within the configured void window.
- [ ] Void writes a compensating sale row (see P2.3) and inventory delta row, both with fresh `client_operation_id`.
- [ ] Past-day correction uses a separate "Stock adjustment" path that does NOT modify any sale row.
- [ ] Void receipt prints with "VOID — refers to <original receipt #>" header.
- [ ] EOD totals subtract voids correctly and surface a void count separately.

### P11.5.5 Subscription / Module Validation Offline

- [x] On successful auth/bootstrap and sync refresh, cache `subscription_tier`, `module_state`, `entitlements_valid_until`, and limits locally.
- [x] Sale path remains fully available offline regardless of subscription status (cashier flow must not block).
- [/] Manager/owner gates (utang ledger, multi-branch, exports) check cached entitlements. Web export gating, mobile locked-surface shells, and a 7-day stale-entitlement fail-closed helper exist; the full `0.9` test pass still needs to prove every surface uses it.
- [/] Free tier limits have shared defaults, DB columns, server helper functions, and guarded web Server Action scaffolds for product/branch/user creation. Real mutation RPCs and the `0.9` test pass still need to prove enforcement end to end.

### P11.5.6 Data Privacy (Philippine DPA / RA 10173)

- [/] Data retention table: `DATA_RETENTION_POLICIES` in `@tdpos/shared` lists current PII surfaces, local retention, server retention, module linkage, and disabled-module cleanup; mobile `/privacy` renders it. Final legal review can still amend wording/windows.
- [/] Disabled modules wipe their cached PII. Mobile `ModulePrivacyCleanupEffect` and sync-time entitlement refresh clear or narrow local `customers` rows when `utang`, `customer_sms`, or `loyalty` turn off; full module-by-module proof lands in the 0.9 test pass.
- [/] Right-to-export: `tenant-data-export` returns one owner-only JSON export for tenant-scoped tables and records an idempotent `tenant.exported` audit marker through `record_tenant_export(uuid)`. Hosted Supabase exercise, UI trigger, and file packaging remain pending.
- [/] Right-to-erasure for end customers: `erase_customer_pii(uuid, text)` blanks customer PII, zeroes loyalty/utang scaffold balances, keeps transaction references intact for required record retention, and writes a sanitized audit entry. UI wiring and hosted Supabase exercise remain pending.
- [/] No PII (names, phone numbers, addresses) is ever sent to crash/error logging without the privacy review on P10.4. Mobile service warnings and web management audit-log warning paths now use `warnSafe()`, which logs only an error class/kind plus safe metadata and never raw error messages or payloads; broader observability review remains pending.
- [/] Privacy notice surface; mobile `/privacy` scaffold records a local acknowledgement timestamp in MMKV and is reachable from Diagnostics. Final settings placement, legal copy, and server-side consent audit remain pending.

### P11.5.7 Backup, Restore, And Disaster Recovery

- [ ] Document Supabase backup posture per plan (Free = no backups, Pro = PITR). Decide which plan v1.0 ships on.
- [ ] Mobile-side: an "export local data" diagnostic that produces a compressed JSON dump of products, sales, sale_items, sync_queue.
- [ ] Restore-from-server bootstrap: fresh device install pulls products/categories and gets a clean SQLite from scratch.
- [/] Lost-device runbook: device deactivation, sync-queue replay, receipt sequence reservation transfer to a new device. Process is documented in `docs/operations/support-runbook.md`; device-management implementation remains pending.
- [x] EAS Update rollback plan: every release has a known-good prior update channel pinned for fast revert. `docs/operations/pilot-readiness.md` documents rollback to previous update, rollback to embedded update, and the rule that pilot builds do not use OTA until the update channel plan is explicit.

### P11.5.8 EOD SMS Automation (Tier A → Tier B Conversion Trigger)

- [/] Edge Function `eod-report` computes tenant-scoped EOD totals for authenticated preview or future secret-mode cron. Nightly Supabase Cron wiring and SMS delivery remain pending.
- [ ] When SMS module is enabled, sends an EOD summary to the owner's phone via the chosen SMS provider.
- [ ] Failure path: send-once-per-night with a 3-retry budget; daily diagnostics surface failures.
- [ ] Cost guard: SMS spend cap configured per business (per the Cost Principles in this doc).
- [ ] Conversion metric: track Tier A Free businesses that opt into SMS and become Tier B Pro within 30 days.

### P11.5.9 Support Diagnostics And Runbook

- [x] In-app diagnostics screen (manager+ only) showing: app version, schema version, last successful sync, unsynced queue count, failed sync count, device id, free disk, MMKV size. Screen, sync-health metrics, app version, schema version, install ID, branch/cashier identity, free/total disk via `expo-file-system` `Paths`, MMKV size, and support bundle copy exist.
- [x] One-tap "Bundle support package" action that copies the diagnostics text and the most recent N sync errors to clipboard for support email.
- [x] Public runbook covering: sync stuck, receipt printer not connecting, lost device, change branch/cashier code, restore data on new phone.
- [/] Support contact path documented (email + response SLA appropriate for the tier). Pilot support channel and response goals are documented; public email/domain remains Phase M.

### P11.5.10 Concurrency And Capacity Limits

- [ ] Document concurrent device count per Supabase plan (Free vs Pro) and the Edge Function rate ceiling we expect at pilot scale.
- [ ] Enforce a per-business concurrency cap on `apply_inventory_delta` to prevent a runaway loop from exhausting connection pool.
- [x] Per-device sync batch size cap; large queues drained over multiple cycles, not one giant request. `processSyncQueue()` clamps every cycle to `MAX_SYNC_BATCH_SIZE = 50`; `sync-processor.test.ts` covers requested small batches and oversized caller requests.
- [ ] Load test script that simulates N stores × M cashiers × K sales/hour against a staging Supabase project.

### P11.5.11 Receipt Hardening

- [ ] Re-print last receipt: cashier can re-show the latest sale's receipt screen even after navigating away.
- [ ] Print receipt for any past sale within the void window from the EOD screen.
- [ ] BIR-ready footer copy is centralized in one constant so accreditation language can flip in one place.
- [ ] Receipt PDF generator (uses store name/address/TIN and the stored receipt rows) — used by exports and by the web dashboard later.

### P11.5.12 Doc Repair (Critical Cleanup)

- [x] Fix the `docs/spec-v5.md` references in `README.md`, `CLAUDE.md`, `GEMINI.md`, and this checklist. `docs/spec-v5.md` exists as the operative meta-index and `check:doc-links` verifies the links.
- [x] Audit `docs/suki-pos-integration-tasks.md` against the current code. It is now explicitly frozen as a historical Tier A provenance doc; active blockers live in this checklist, `docs/spec-v5.md`, and ADRs.
- [x] Move the BIR language list out of `AGENTS.md` and `CLAUDE.md` into a single skill so changes happen once.
- [ ] Remove the dev-only demo-mode shortcut in `app/(auth)/sign-in.tsx` before pilot. The real phone-OTP flow already exists; this remaining row is about eliminating the local escape hatch for external users.

## Phase W: Web Dashboard (parallel mainline track)

Purpose: the web dashboard is no longer a post-1.0 expansion. It is co-equal with the mobile track and gates v1.0. Day-one launch ships mobile and web simultaneously.

### W0.1 Web Foundation

- [x] Replace the placeholder `apps/web/package.json` with a real Next.js 16 dependency list (`next@16.2.6`, `react@19.2.6`, `@supabase/ssr@^0.10.2`, workspace deps `@tdpos/db` + `@tdpos/shared`).
- [x] App Router only — no Pages Router. (`apps/web/src/app/*`.)
- [x] `proxy.ts` with named export `proxy()`. (`apps/web/proxy.ts`.) NEVER `middleware.ts`.
- [x] `@supabase/ssr` 0.10.x with `getClaims()` only. (`src/lib/supabase/{proxy,server,client}.ts`.) NEVER `getSession()`.
- [x] `tsconfig.json` extends `@tdpos/typescript-config/nextjs.json`. Adds `@/*` path alias to `./src/*`.
- [x] Workspace deps: `@tdpos/shared`, `@tdpos/db`.
- [x] Add `apps/web/dev`, `build`, `start`, `lint`, `typecheck`, `clean` scripts (no test yet — added in W0.5).
- [ ] Run `bun install` to materialize the new dependencies in `bun.lock`. (Operational; not run in this turn — `bun.lock` will be regenerated.)
- [ ] CI foundation gate covers web typecheck and lint (turbo will pick them up automatically once `bun install` runs).
- [x] Skill doc: `docs/skills/nextjs-16-proxy-pattern.md` reviewed against current code.
- [ ] New skill doc: `docs/skills/tailwindcss-4-shadcn.md` (lands with W0.2 styling).
- [ ] Tailwind 4 + shadcn/ui (lands with W0.2; the W0.1 foundation deliberately uses inline styles to keep the auth flow visible without a styling stack on the critical path).

Acceptance:

- [/] `bun --filter @tdpos/web run dev` starts a Next.js 16 dev server. (Will run after `bun install`.)
- [/] `bun --filter @tdpos/web run typecheck` passes. (Will pass once dependencies install — code is type-correct against `next@16` + `@supabase/ssr@0.10` + React 19.)

### W0.3 Auth Shell

- [x] Sign-in page using phone OTP. Validation shared with mobile via `normalizePhPhone` + `isValidPhPhone` from `@tdpos/shared`.
- [x] Server action that calls `supabase.auth.signInWithOtp({ phone })` then redirects to `/verify-otp?phone=...`.
- [x] Verify-OTP page with server action calling `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- [x] `proxy.ts` enforces dashboard route protection via `getClaims()`; redirects unauthenticated requests to `/login`, redirects authenticated users away from `/login` and `/verify-otp`.
- [x] Cookie auth configured per `@supabase/ssr` 0.10.x with `cookies.getAll/setAll`.
- [x] Sign-out clears cookies and redirects via a Server Action on the dashboard layout.
- [x] No demo path in web (production posture from day one — unlike mobile, web has no `__DEV__` shortcut).
- [x] Defense-in-depth: dashboard layout re-checks `getCurrentClaims()` server-side even though `proxy.ts` already enforced.

Acceptance:

- [ ] Owner can sign in with phone OTP and see the empty dashboard shell. (Pending real Supabase project.)
- [ ] Unauthenticated requests to `/dashboard/*` redirect to sign-in. (Pending end-to-end test against staging.)
- [ ] Tenant isolation verified by RLS at the Supabase layer. (Pending staging.)

### W0.5 Read-Only Dashboard

- [x] Topbar shell with branch identity + sign-out (lives in `(dashboard)/layout.tsx`; sidebar deferred to W0.7 when more views land).
- [/] Products view: low-stock list lands on the dashboard home (`getLowStockProducts`); standalone `/products` page deferred to W0.8.
- [/] Sales view: recent-receipts list lands on the dashboard home (`getRecentSales`); paginated `/sales` view deferred to W0.7 with reporting.
- [/] Inventory view: low-stock-only slice on the dashboard home; full per-product view deferred to W0.8.
- [/] Sync health view: per-device queue depth, last seen, failures. Web `/sync` includes `business_devices` rows for device status, last seen, and queue-count snapshots. Mobile foreground sync upserts those counts from local SQLite without payloads.
- [x] Empty/loading/error states on every read-only card. The dashboard renders a friendly "Supabase env unconfigured" notice instead of crashing when keys are missing.
- [ ] EN + TL strings via the same source as mobile (deferred — web copy stays English-only until W0.7 when the report PDF needs both languages).
- [x] RLS-protected Server Component query module in `apps/web/src/lib/queries/dashboard.ts`: sales summary, low stock, recent receipts, branch breakdown, cashier breakdown, and top sellers. `import 'server-only'` hard-stops accidental client imports.
- [x] Dashboard home is an `async` Server Component running the read-only query set via `Promise.all`, formatting via the shared `formatMoney` + `displayStock` + `splitStock` helpers from `@tdpos/shared`.
- [x] Tabular numbers, divide-y lists, brand-token palette throughout — uses the same teal/amber/ink theme as mobile.

Acceptance:

- [/] Owner can read the same data the cashier wrote without manual queries. (Code path is correct; pending real Supabase project for end-to-end verification.)
- [ ] Tenant A cannot read tenant B at any layer. (Verified by RLS in the migration; needs a Postgres test under §14 to lock in.)

### W0.7 Reporting & Exports

- [x] Daily report (gross sales, payment mix, item count, hourly histogram). The Overview accepts `?date=YYYY-MM-DD&range=today` and runs a single query that aggregates gross, payment mix, and 24-bucket hourly gross in one pass; an inline SVG histogram highlights the peak hour in amber against teal hourly bars. Defaults to today's local date.
- [x] Weekly + monthly aggregates. The Overview now accepts `?range=week` and `?range=month`, computes Monday→Sunday or calendar-month windows from the selected anchor date, and passes the same `{ from, to }` window into summary, branch, cashier, top-seller, CSV, and PDF paths. Exports use `from`/`to` dates from the selected reporting window.
- [x] Per-cashier and per-branch breakdowns. Per-branch: `getPerBranchBreakdown(range)` joins `sales` → `branches(name, region)`, grouped + sorted, rendered with a teal share bar. Per-cashier: `getPerCashierBreakdown(range)` joins `sales` → `users(phone, role)` and surfaces only the **last 4 digits of the phone** (`tailPhone`) per ADR-014's privacy posture — owners reconcile against staff records, full E.164 never leaves the database. Both render side-by-side in a 2-column grid on the Overview.
- [x] Top-sellers breakdown. `getTopProductsBreakdown(range, limit=10)` joins `sale_items` → `products(name, unit_label)` and uses `sales!inner ( created_at )` to RLS-cascade the reporting window through the parent sale. Surfaces top 10 products by gross with `pieces_sold` formatted as the product's `unit_label` (sachet, stick, bottle, etc.). Owner sees the period's revenue drivers at a glance.
- [x] CSV export of sales — RFC 4180 line-item CSV with BIR-ready columns. Route Handler at `GET /api/exports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD` (defense-in-depth `getCurrentClaims()` check, 400/401/503 error envelope, `text/csv` with `Content-Disposition: attachment`). Pure builder at `apps/web/src/lib/csv/build-sales-csv.ts` quotes per RFC 4180 and emits `\r\n` line endings. Defaults to today's local date when params omitted; rejects inverted ranges with 400.
- [x] Dashboard download button calls the export via plain `<a download>` so it works without JavaScript.
- [x] PDF export using `@react-pdf/renderer` with the BIR-ready receipt format applied. Route Handler: `GET /api/exports/sales/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`, Node runtime, defense-in-depth `getCurrentClaims()` check, RLS-scoped `getSalesForExport()`, `renderToBuffer`, `application/pdf`, `Cache-Control: private, no-store`.
- [x] Audit log view (read-only, filtered by tenant). Server Component at `/audit`, query at `apps/web/src/lib/queries/audit-log.ts`. Surfaces field _names_ of changed columns only (`beforeKeys`, `afterKeys` derived from `Object.keys`); never values — preserves the ADR-014 privacy posture. RLS scopes per-tenant; the `prevent_audit_mutation` trigger from the initial migration enforces immutability at the database, so the page is read-only by construction.
- [ ] Stock Accuracy Score view (system vs last cycle count).
- [/] Sync health view. Server Component at `/sync`, query at `apps/web/src/lib/queries/sync-health.ts`. Reads `applied_operations` (RLS-scoped) and surfaces: completed (24h), in_progress (any age), stuck (`status='in_progress' AND applied_at < now()-60s`), failed (24h), last `applied_at`, last 10 failure rows with their `reason` label only, and latest `business_devices` rows with status, last seen, and sanitized local queue counts. Tone-coded banner: green/healthy, amber/review, red/action-needed. Production heartbeat cadence and stale-device rules remain pending.

Acceptance:

- [/] Owner can produce a 30-day sales CSV today (typecheck + lint green; end-to-end pending real Supabase project).
- [/] Owner can produce a 30-day sales PDF. Code path exists and shares the CSV query; end-to-end export remains pending real Supabase staging data.
- [ ] BIR-ready export passes a manual RDO acceptance dry run.

### W0.8 Management

> Status: scaffolded with real guarded writes, not complete full CRUD. Management pages, tier-aware locked actions, Zod-validated Server Actions, server-side limit guard calls, Supabase mutations, audit-log inserts, and `revalidatePath()` calls exist for the first create/update flows. Update/delete/bulk workflows, hosted Supabase exercise, and pilot-owner UX remain pending.

- [/] Product CRUD with bulk import CSV. Product create action writes to `products` behind `web.products`, Zod validation, product limit guard, RLS, and audit logging; edit/delete/bulk import pending.
- [/] Category CRUD. Category create action writes to `categories` behind the product-management gate with Zod validation, RLS, and audit logging; edit/delete pending.
- [/] Branch CRUD with branch-code uniqueness checked across tenant. Branch create action writes to `branches` behind `web.branches`, branch limit guard, RLS, and audit logging; edit/delete and code reservation pending.
- [/] User CRUD (cashier, manager, owner) with role assignment. Invite action writes to `pending_invites` behind `web.users`, combined user+invite limit guard, RLS, and audit logging; revoke/role-change/deactivate pending.
- [/] Device management. `/devices` route, `web.devices` tier surface, registered-device table, max-device limit display, sanitized queue counts, guarded status update action, RLS, and audit logging exist; richer lost-device replacement flow pending.
- [/] Module toggles (utang, customer SMS, loyalty, multi-branch, etc.) — with confirmation step. Module action persists `businesses.module_state` behind `web.modules`, with Zod validation, RLS, and before/after audit logging; mobile now clears/narrows local customer caches when customer-facing modules are turned off.
- [ ] EOD SMS configuration (provider, schedule, opt-in customers).
- [x] Subscription tier display + upgrade path scaffold (no in-app payment yet).

Acceptance:

- [ ] Owner can configure a new branch + cashier without touching the database.
- [/] Toggling utang OFF clears local cached PII on next mobile sync. Code path exists through sync-time entitlement refresh and the mounted `ModulePrivacyCleanupEffect`; physical-device evidence and 0.9 coverage remain pending.

### W0.9 Web Production Candidate

> Status: every line below is **gated on real users + a real host**. Code-side groundwork (defense-in-depth auth, RLS, no-PII surfacing, brand-token theme, `server-only` boundaries) is in place from W0.1 → W0.7. The W0.9 acceptance bars exist to prove those things hold under real traffic; they cannot be demonstrated synthetically.

- [ ] Same correctness, security, accessibility, and performance bars as mobile.
- [ ] WCAG 2.2 AA equivalent across every screen. (Pre-work shipped: every form has labels, every interactive control has focus rings, every alert uses `role="status"` or `role="alert"`. Full audit pending Lighthouse + axe runs against a deployed build.)
- [ ] LCP < 2.5 s on a fresh browser session. (Pre-work shipped: zero client-side data fetching on the Overview, single `Promise.all` per page, no large client bundles. Numeric verification pending deploy.)
- [ ] Vercel/host deploy pipeline matches the mobile EAS pipeline in maturity. (Foundation gate covers typecheck + lint + format + doc-link integrity; CI/CD to a host pending the host decision.)
- [ ] Pilot store owner does one full day of monitoring + reconciliation from the dashboard.

Acceptance:

- [ ] Web dashboard does not block any v1.0 quality bar.

### Phase W Closure Status

- W0.1 Foundation — ✅ done.
- W0.2 Styling — ✅ done.
- W0.3 Auth Shell — ✅ done.
- W0.5 Read-Only Dashboard — ✅ done; date-range support added in W0.7.
- W0.7 Reporting & Exports — ✅ daily/weekly/monthly report (incl. hourly pattern), CSV/PDF export, audit log, sync health. Open: Stock Accuracy Score (needs cycle-count schema).
- W0.8 Management — scaffolded with tier-aware guarded create/update actions and audit logging; full edit/delete/bulk workflows pending.
- W0.9 Web Production Candidate — gated on hosted deploy + pilot user.

Code-side, the web track has matched the substrate quality of the mobile track: same `@tdpos/shared` formatters, same brand palette, same defense-in-depth auth, same discriminated-union query pattern. What's left is either (a) more screens following the same pattern (W0.8) or (b) infrastructure work the code can't do alone (W0.9).

## Phase M: Marketing Site (final-mile track)

Purpose: the public-facing brand site that ships the same day as mobile + web. Mostly content + design, but it is a release blocker.

### M0.1 Marketing Foundation

- [ ] Domain decided and reserved.
- [x] Site stack picked: `apps/marketing` uses Next.js 16 inside the monorepo.
- [x] Approved BIR language only (lint the marketing copy with the same `check:patterns` script).
- [/] Privacy policy + Terms of Service drafts ready for legal review. Scaffold pages exist; legal copy is not final.

### M0.5 Pricing And Pitch

- [/] Pricing page reflects the current A-E tier model through the web `/pricing` scaffold and `apps/marketing/pricing`, both sourced from `TIER_DEFINITIONS`.
- [x] Pitch copy aligned with "Tama ang stock mo. Lagi."
- [ ] No "BIR-compliant/certified/approved" wording. Only "BIR-ready" / "Provisional receipts."
- [ ] Demo screenshots from a real build, not mockups.

### M0.9 Launch-Ready Site

- [ ] Final TLS configured.
- [ ] Analytics with consent (PostHog or equivalent, free tier first).
- [ ] App Store + Play Store badges (placeholders until the apps are listed).
- [ ] Support contact path live and reachable.
- [/] 404 + 500 pages designed. Marketing `not-found` and error-boundary scaffolds exist; final launch visual QA remains in M0.9.
- [ ] OG image + Twitter card set.

Acceptance:

- [ ] Site is hosted on a hidden URL and verified end-to-end before launch day.

## Documentation Quality Gate

These checks belong in CI alongside the foundation gate. Documentation is a deliverable — broken docs block merges, broken docs block v1.0.

### DocGate-1 Link Integrity

- [ ] Every internal link in `README.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `CODEX.md`, and `docs/**/*.md` resolves to a file that exists.
- [ ] Add a `scripts/check-doc-links.mjs` to enforce.

### DocGate-2 Single Source for the Deprecations Table

- [ ] The deprecations table lives in exactly one file (`docs/skills/deprecations.md`).
- [ ] CLAUDE.md / AGENTS.md / GEMINI.md / CODEX.md reference it instead of duplicating it.
- [ ] `scripts/check-forbidden-patterns.mjs` reads from the same source.

### DocGate-3 Skill Doc Sourcing

- [ ] Each skill doc in `docs/skills/` opens with a "Sources" line linking to the official package documentation URL it derives from.
- [ ] Each skill doc records the package version it was verified against.
- [ ] When a package version bumps, its skill doc gets re-verified before merge.

### DocGate-4 ADR Coverage

- [ ] Every architectural choice that's hard to reverse has an ADR in `docs/architecture.md`.
- [ ] ADRs include: decision, context, alternatives considered, consequences.

### DocGate-5 Spec Index Integrity

- [x] `docs/spec-v5.md` exists as a meta-index pointing to: this checklist, ADRs, schema reference, skill docs, and the Definition of Enterprise-Grade.
- [x] No file references a missing doc.

### DocGate-6 Code-To-Doc Drift

- [ ] `scripts/check-local-sqlite-schema.mjs` keeps the SQL file and the embedded SQL string in sync (already in place).
- [ ] When a public type/constant changes in `@tdpos/shared`, the relevant skill doc updates in the same PR.
- [ ] Pull requests touching `app.config.ts`, `eas.json`, or `supabase/migrations/` also update the matching skill doc or ADR.

## Post-1.0 Enterprise Roadmap

These are enterprise-grade expansion tracks **after** the v1.0 combined launch (mobile + web + marketing) is live and stable. None of these block v1.0; the web dashboard explicitly does not appear here because it is mainline (see Phase W).

### E1 [Removed — Web Dashboard Promoted To Mainline]

The web dashboard is no longer a Post-1.0 expansion. See **Phase W: Web Dashboard (parallel mainline track)** above. This entry is intentionally kept here as a tombstone so contributors don't reintroduce it as a deferred item.

### E2 Multi-Branch

- [ ] Branch management.
- [ ] Branch-level stock.
- [ ] Transfer workflow.
- [ ] Branch dashboard.
- [ ] Branch-specific receipt namespace.
- [ ] Branch-level sync monitoring.

### E3 Customer Modules

- [ ] Utang ledger.
- [ ] Customer SMS.
- [ ] Loyalty points.
- [ ] Customer profiles.
- [ ] Payment reminders.
- [ ] Module-level permissions.

### E4 Owner Analytics

- [ ] Stock Accuracy Score.
- [ ] Daily Active Retailer metric.
- [ ] Gross sales trend.
- [ ] Low-stock prediction.
- [ ] Fast/slow moving items.
- [ ] Margin reporting.
- [ ] EOD SMS automation.

### E5 Compliance Expansion

- [ ] EOPT invoice schema (RA 11976) ready in DB even before accreditation.
- [ ] Audit export (per tenant, immutable rows only, signed manifest).
- [ ] BIR-ready data export (sales, sale_items, inventory_logs, receipts, payments) in formats acceptable to RDO audits.
- [ ] Accreditation workflow: track per-business `eopt_accredited` and per-device accreditation state.
- [ ] Flip the receipt copy from "BIR-ready" to "BIR-accredited" / "Official Receipt" only once the business + device pair is accredited (centralized constant).
- [ ] eSales submission path: scheduled job that posts the BIR-required summary to the BIR portal API.
- [ ] Accreditation fee accounting: ₱5,600 per device pass-through where applicable; track which devices are covered under umbrella accreditation.

### E6 Tier B-E Product Expansion

- [/] Tier B tablet POS.
- [/] Tier B owner dashboard.
- [/] Tier C shift handoff.
- [/] Tier C convenience workflows.
- [x] Tier D supermarket workflows.
- [x] Tier D scale/weighted PLU.
- [x] Tier E chain/HQ rollup.
- [x] Tier E returns/warranty desk.
- [x] Tier E self-service kiosk.

## Next 10 Implementation Tasks

Updated 2026-05-11 after the five-tier scaffold landed and Tier B shift controls started. The project is now in scaffold-first mode: build the full tier surface through `0.8`, then concentrate testing/polish/visual QA at `0.9`, then pilot at `v0.1alpha`.

- [x] 1. Commit the five-tier scaffold checkpoint once the documentation checkpoint and foundation gate are green. Completed as six logical commits ending at `706f8ff`.
- [x] 2. Fill Tier B Pro mobile shells: tablet POS, owner lanes, shift login, shift handoff. Product-specific surface contracts and native preview panels exist; tablet POS writes through the existing cart/checkout path, owner lanes read local shift/sync health, and shift login/handoff manage local SQLite shifts.
- [x] 3. Fill Tier C Plus mobile shells: convenience counter and manager-phone override flow. Product-specific surface contracts and native preview panels exist; convenience counter can add fast-repeat products and queue a local manager approval, while manager phone can approve/decline pending local approval requests.
- [x] 4. Fill Tier D Premium mobile shells: supermarket counter, customer display, back-office audit, weighted PLU placeholders. Product-specific surface contracts and native preview panels exist; supermarket counter writes through the existing cart/checkout path, customer display mirrors local cart state, back-office audit reads local sales/inventory/sync health for manager roles, and weighted PLU provides PLU lookup and weight-entry workflow.
- [x] 5. Fill Tier E Enterprise mobile shells: HQ rollup, self-service kiosk, returns/warranty placeholders. Product-specific surface contracts and native preview panels exist; `mobile.hq_rollup` reads cross-branch sales and stock from existing local tables for owner/manager roles; `mobile.self_service_kiosk` queues customer orders to local `kiosk_orders` with staff confirmation guard; `mobile.returns_warranty` records return requests to local `return_requests` with receipt lookup and manager approval, never mutating original sales.
- [x] 6. Convert web management scaffold buttons into guarded Server Actions for products, categories, branches, users, devices, and modules; every mutation must use Zod, RLS, audit logging, and entitlement guard helpers. The six management actions now validate drafts with Zod, check tier surface access, enforce limits, write through Supabase, log audit entries, and revalidate the source page plus `/audit`.
- [x] 7. Add tier/pricing management content to the web pricing and future marketing track using `TIER_DEFINITIONS` as the only product source of truth. The web `/pricing` route and `apps/marketing/pricing` scaffold both render all five tiers from `TIER_DEFINITIONS` with public names, prices, limits, and module lists. Final launch copy and custom domain remain open.
- [x] 8. Add stale-entitlement fail-closed behavior for manager/owner surfaces while preserving offline cashier sales. Mobile surface route fails closed after the 7-day cache grace period; `canUseMobileSurfaceFromCache` returns `entitlements_stale` and the surface router renders a reconnect card. Tier A cashier is exempt. Full coverage across every future manager flow lands at `0.9`.
- [ ] 9. Keep hosted Supabase/EAS/device work moving in parallel: staging migrations, EAS dev build, physical-device airplane-mode sale, and sync drain evidence.
- [/] 10. At `0.9`, add the full tier test suite: visibility, legacy migration mapping, offline entitlement cache, web route guards, screenshot parity against the five `UI/` references, accessibility, and performance. Code-testable areas landed: 19 tier-definition tests (structural integrity, legacy mapping, surface visibility, module state), 10 entitlement-cache tests (fail-closed, 7-day grace, Tier A exemption), 7 kiosk-order lifecycle tests, 10 return-request lifecycle tests including ADR-011 immutability. Remaining: screenshot parity, accessibility audit, and performance profiling require device builds.

Original "First 10" (kept for history) — every item except 2 and the device runs is `[x]`.

- [x] 1. Restore/init Git and commit this roadmap.
- [ ] 2. Install Bun as a direct shell command.
- [x] 2a. Generate `bun.lock` with Bun 1.3.13.
- [x] 3. Add `apps/mobile/package.json`.
- [x] 4. Add Expo config and root mobile TypeScript config.
- [x] 5. Add root mobile `_layout.tsx` with providers.
- [x] 6. Add `storage.ts`, `query-client.ts`, and `db/init.ts`.
- [x] 7. Patch Supabase RLS gaps.
- [x] 8. Add shared inventory and receipt helper tests.
- [x] 9. Build offline checkout transaction.
- [x] 10. Build minimal Sale → Checkout → Receipt loop.

Original First 10 (kept for history):

- [x] 1. Restore/init Git and commit this roadmap.
- [ ] 2. Install Bun as a direct shell command.
- [x] 2a. Generate `bun.lock` with Bun 1.3.13.
- [x] 3. Add `apps/mobile/package.json`.
- [x] 4. Add Expo config and root mobile TypeScript config.
- [x] 5. Add root mobile `_layout.tsx` with providers.
- [x] 6. Add `storage.ts`, `query-client.ts`, and `db/init.ts`.
- [x] 7. Patch Supabase RLS gaps.
- [x] 8. Add shared inventory and receipt helper tests.
- [x] 9. Build offline checkout transaction.
- [x] 10. Build minimal Sale → Checkout → Receipt loop.

## Evidence Log

Use this section as releases progress.

### Five-Tier Scaffold Checkpoint — Latest-Docs Audit

- [x] Date: 2026-05-10.
- [x] Scope: five canonical tiers, entitlement scaffolding, mobile/web surface gates, Supabase tier migrations, docs reconciliation.
- [x] Code evidence: `packages/shared/src/constants/index.ts` owns `TIER_DEFINITIONS`; `scripts/check-tier-ui-sources.mjs` validates all five UI reference paths; Supabase migrations `20260510000000_tier_normalization.sql` and `20260510000001_entitlement_guards.sql` exist.
- [x] Foundation gate shape: format → committed-secret scan → SQLite drift → forbidden patterns → tier UI source check → doc links → skill docs → Expo Doctor → Android bundle export → typecheck → lint → existing tests.
- [x] Security hardening update 2026-05-12: `check:secrets` scans tracked text/code/config files for real-looking committed secrets, and CI now runs the tier UI source check so hosted checks match the local foundation gate.
- [x] Privacy scaffold update 2026-05-12: mobile `/privacy` exists, is reachable from Diagnostics, is EN/TL translated, and records a local acknowledgement timestamp in persisted settings for the 0.9 privacy/legal review.
- [x] Disabled-module privacy update 2026-05-12: mobile entitlement refresh now clears local customer-facing caches when `utang`, `customer_sms`, or `loyalty` are turned off, preserving server history while removing no-longer-entitled PII from device storage.
- [x] Data-retention scaffold update 2026-05-12: `@tdpos/shared` now owns `DATA_RETENTION_POLICIES`, and mobile `/privacy` renders the EN/TL retention table for account, customer, sales, sync, support, device, kiosk, and returns/warranty surfaces.
- [x] Customer-erasure scaffold update 2026-05-12: Supabase migration `20260512000000_customer_erasure.sql` adds customer erasure markers and the `erase_customer_pii(uuid, text)` RPC so owner/manager roles can blank customer PII while preserving historical transaction references and sanitized audit evidence.
- [x] Scanner scaffold update 2026-05-12: mobile `/scanner` now uses Expo `CameraView`, requests camera permission, scans EAN/UPC/code barcodes, looks up active local products by SKU or id, and adds one piece through the same cart path as Sale product tiles. Physical barcode evidence remains part of the 0.9 device pass.
- [x] Local customer-erasure schema update 2026-05-12: mobile SQLite migration v6 adds customer erasure markers locally so shared `DbCustomer` fields, disabled-module cleanup, and server erasure semantics remain aligned.
- [x] Tenant export scaffold update 2026-05-12: Edge Function `tenant-data-export` validates `client_operation_id`, calls `record_tenant_export(uuid)` for owner-only idempotent audit logging, and returns a single JSON document containing tenant-scoped business, user, product, customer, sale, payment, audit, invite, device, shift, approval, PLU, kiosk, and return tables.
- [x] Safe logging scaffold update 2026-05-12: mobile service catch paths and web management audit-log warning paths now route through `warnSafe()`, logging only a sanitized error kind/class instead of raw Error objects or messages that could contain customer/store data.
- [x] Production log gate update 2026-05-12: the forbidden-pattern scanner now fails app/package/Supabase source if `console.log(...)` is introduced, keeping CLI checker output separate from production bundles.
- [x] Verification: `source scripts/use-toolchain.sh && bun run check:toolchain` passes with Node 24.15.0, Bun 1.3.13, Supabase CLI 2.98.2, and EAS CLI runner available.
- [x] Verification: `source scripts/use-toolchain.sh && bun run check:foundation` passes end-to-end.
- [x] Current code-testable count after the first 0.9 tier suite: 103 passing tests total — 32 shared + 71 mobile.
- [x] Mobile scaffold evidence: every registered `mobile.*` TierSurface now renders a native preview panel under `apps/mobile/src/features/tier-surfaces/surface-preview.tsx`; this keeps B-E routes visible without starting 0.9 polish.
- [x] Backend scaffold evidence: `20260511000000_tier_surface_scaffold.sql` adds tenant-scoped RLS tables for devices, shifts, manager approvals, PLUs, kiosks, and returns; `/sync` reads device status from the new scaffold.
- [x] Device heartbeat evidence: mobile foreground sync calls `upsertDeviceHeartbeat()` after entitlement refresh; the database trigger allows same-install refreshes while blocking a second active install over `max_devices`; heartbeat includes sanitized local sync-count snapshots only.
- [x] Web device management evidence: `web.devices` is in the shared tier surface registry, `/devices` is linked from the dashboard shell, `getDeviceManagementRows()` renders registered devices from `business_devices`, and `updateDeviceStatusScaffoldAction()` validates status-action payloads behind the same tier guard.
- [x] Tier B mobile scaffold evidence: `mobile.tablet_pos` adds a wide product grid that writes only through the existing cart/checkout path; `mobile.owner_lanes` reads open local shifts and sanitized sync health; local mobile migration v2 creates `shift_sessions`; `mobile.shift_login` can open a local shift with opening cash and live lane totals, while `mobile.shift_handoff` can count cash, capture a handoff note, and close the shift locally. Remote shift sync is intentionally deferred until the sync contract grows beyond sales and inventory deltas.
- [x] Tier C mobile scaffold evidence: local mobile migration v3 creates `manager_approval_requests`; `mobile.convenience_counter` adds fast-repeat product controls and queues a local price-override approval request; `mobile.manager_phone` lists pending local approvals and resolves them as approved or declined for owner/manager roles. Remote approval sync is intentionally deferred with the same sync-envelope boundary as shifts.
- [x] Marketing scaffold evidence: `apps/marketing` exists as a Next.js 16 app with home, pricing, privacy, and terms scaffold pages; pricing imports `TIER_DEFINITIONS` from `@tdpos/shared`.
- [x] Tier D mobile scaffold evidence: `mobile.supermarket_counter` adds a scanner-driven belt-mode product list that writes only through the existing cart/checkout path; `mobile.customer_display` mirrors the local cart in a dark customer-facing preview card; `mobile.backoffice_audit` reads local sales, inventory logs, and sync health for owner/manager roles; `mobile.weighted_plu` provides PLU code/name search and weight-entry workflow that converts weights to canonical pieces. No new local migrations needed — all four surfaces read from existing local products, sales, inventory_logs, and sync_queue tables.
- [x] Tier E mobile scaffold evidence: local mobile migration v4 creates `kiosk_orders` and v5 creates `return_requests`; `mobile.hq_rollup` reads branch-level sales, products, and sync health from existing local tables for owner/manager roles; `mobile.self_service_kiosk` creates kiosk orders with `awaiting_staff` status and staff can confirm or cancel them locally — stock decrement happens only after confirmation through the shared checkout path; `mobile.returns_warranty` looks up receipts, creates return requests with reason codes, and resolves them as approved or declined for owner/manager roles — original sales are never mutated per ADR-011. Remote kiosk/return sync is intentionally deferred with the same sync-envelope boundary as shifts and approvals.
- [x] Latest-doc spot check: Expo SDK 55, Next.js 16 `proxy.ts`, Supabase SSR `getClaims()`, TanStack Query v5 `gcTime`, FlashList v2 migration, and Node 24 LTS lifecycle.
- [x] Sources checked: `docs.expo.dev/versions/v55.0.0`, `nextjs.org/blog/next-16`, `supabase.com/docs/guides/auth/server-side/nextjs`, `tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5`, `shopify.github.io/flash-list/docs/v2-migration`, `nodejs.org/en/about/previous-releases`.
- [x] Dependency posture: `bun outdated --recursive` was reviewed. Mobile React/RN/native package holds are intentional because Expo SDK 55 controls compatibility; do not chase npm latest when it breaks `expo-doctor`.
- [!] Local machine posture: the default shell reported Node 25.9.0 before sourcing `scripts/use-toolchain.sh`. Source the helper, or otherwise use Node 24, before CI-parity verification.

### Historical Foundation Checkpoint — Latest-Docs Audit

- [x] Date: 2026-05-09.
- [x] Gate: `npx bun@1.3.13 run check:foundation` passes end-to-end after the README skill-doc count drift was corrected.
- [x] Test count at this historical checkpoint: 57 passing tests total — 13 shared + 44 mobile. Current count is tracked in the Five-Tier Scaffold Checkpoint above.
- [x] Latest-doc spot check: Expo SDK 55 BackgroundTask, Clipboard, and SQLite docs; TanStack Query v5 migration docs; Supabase `@supabase/server` public beta announcement.
- [x] Dependency posture: current mobile package versions stay aligned with the verified stack — Expo SDK 55, React 19.2, React Native 0.83.6, React Query 5.100.x, React Native Paper 5.15.x, and `expo-clipboard` SDK 55.
- [x] Package refresh: root tooling is on ESLint 10.3.0, `@eslint/js` 10.0.1, Turbo 2.9.12; web React is on 19.2.6; mobile native packages were reconciled with `expo install --fix`; the shared TypeScript target is `esnext` so Expo's SDK-compatible TypeScript 5.9.3 and root/web/shared TypeScript 6.0.3 both pass.
- [x] Intentional holds after `bun outdated --recursive`: mobile React/native packages remain on Expo SDK 55-compatible versions even when npm has newer releases; web `@types/node` remains on latest Node 24 typings instead of Node 25 typings because the repo runtime is Node 24 LTS.
- [x] Follow-up native guards: `babel-preset-expo@55.0.21` is explicit in the mobile workspace; Expo native peers (`expo-font`, `expo-asset`, `expo-constants`, `expo-linking`, `react-native-worklets`, `expo-system-ui`) are direct dependencies; Bun is pinned to hoisted linking for Expo/EAS native-module dedupe; `check:foundation` now includes `check:expo-doctor` and `check:mobile-bundle` (`bunx expo export --platform android`) so Doctor and Metro bundle failures are caught before EAS.
- [!] Residual blockers: no physical device run, no airplane-mode acceptance pass, and no Postgres container tests yet. EAS project linking and Android dev-build evidence are complete.

### v0.2 Evidence

- [x] Date: 2026-05-09 (foundation snapshot) → 2026-05-10 (git push to GitHub).
- [x] Initial commit: `f4bb457` _"v0.1 foundation preview: mobile + web tracks, 15 ADRs, 20 skill docs, 8-stage foundation gate"_ on `main`. Subsequent commits on the same branch: `0e8917b feat(web): add sales PDF export`, `a623541 feat(web): add reporting ranges`, `c70a100 chore(mobile): link eas project`, `5e25fcc chore(deps): refresh package versions`.
- [x] Remote: `https://github.com/tomytate/TDPOS.git` (private). CI workflow `.github/workflows/foundation.yml` runs the same foundation gate on every PR.
- [x] Commands run: `bun run check:foundation` (format → SQLite drift → forbidden patterns → tier UI source check → doc-link integrity → skill-doc gate → Expo Doctor → Android bundle export → typecheck across 6 workspaces → lint across 6 workspaces → tests).
- [ ] Device/simulator: not run on physical device yet — runtime acceptance criteria for P1.4/P1.5 still open.
- [x] Notes: Mobile foundation + web foundation both real. Sale → checkout → receipt → sync_queue write proven by `bun:sqlite` integration tests. Web dashboard renders 9 RLS-scoped Server Component queries (Overview, audit, sync health) plus CSV + PDF exports. Hosted Supabase project provisioned and three migrations applied; live signup-and-render smoke test still owed once the leaked publishable key is rotated. Scanner, printer integration, real OTP on mobile, and device acceptance remain pending.

### v0.4 Evidence

- [/] Date: 2026-05-09 (offline checkout vertical wired in code) → 2026-05-10 (Android development build passes; airplane-mode device test still pending).
- [x] Commit: first foundation snapshot created under Git on `main`; EAS unblock commit `fcb333e` (`fix(mobile): compile android against sdk 36`) pushed to `origin/main`.
- [x] Android dev build: local EAS post-build produced `/artifacts/build-1778363013792.apk` (243 MB) after `compileSdkVersion` moved to 36; EAS cloud build `47fe39b5-e0d2-4211-8d80-bebbeadec48d` finished successfully on commit `fcb333e`.
- [ ] Airplane mode sale completed: pending physical device run.
- [ ] Receipt number: pending physical device run.
- [ ] Sync queue row id: pending physical device run.
- [x] Notes: `executeCheckout` writes sales + sale_items + product stock decrement + inventory_logs + sync_queue + receipt_sequence in one `withTransactionAsync` block. §14 #1 (tingi math), #5 (receipt collision), local idempotency replay, insufficient-stock rollback, and empty-cart/short-tender guards all pass under `bun:sqlite` integration tests. Demo-mode shortcut remains dev-only; real OTP is wired. v0.4 tag still waits on the physical-device airplane-mode gate.

### v0.6 Evidence

- [/] Date: 2026-05-09 (sync processor + Edge Function shells exist in code; remote-end-to-end run pending real Supabase project).
- [x] Commit: first foundation snapshot created under Git on `main`.
- [/] Duplicate sync test result: local idempotency confirmed against `bun:sqlite` (`sync-processor.test.ts` "marks reviewable" + executeCheckout local-idempotency); server-side TOCTOU test (§14 #6) requires Postgres test container.
- [/] Negative stock test result: server returning `{ ok: false, reason: 'insufficient_stock_or_not_found' }` is mapped to `pending_sync_review:` in the local sync queue (`sync-processor.test.ts` "marks reviewable"); end-to-end test against real RPC pending.
- [x] Notes: `sync-processor.ts` validates every payload with the shared `syncQueueEnvelopeSchema` Zod discriminated union before calling the network, defers `concurrent_in_progress`, clamps each cycle to `MAX_SYNC_BATCH_SIZE = 50`, and bumps non-retryable failures to `retry_count = 999` with a `pending_sync_review:` last_error. `getSyncHealth(db)` and `useSyncHealth()` summarize total/synced/unsynced/pending/failed/reviewable rows, max retry count, last successful sync, oldest pending row, and latest error; `getDiagnosticsMetadata(db, identity, storage)` adds app version, local schema version, persisted install ID, branch/cashier identity, role, MMKV byte size, MMKV key count, and free/total disk; `buildSupportBundle()` copies sanitized manager-triggered diagnostics through `expo-clipboard` without raw sync payloads. `app/(app)/diagnostics.tsx` exposes those metrics to owner/manager roles from the Reports tab. `docs/operations/support-runbook.md` defines the top 10 support scenarios and `.github/ISSUE_TEMPLATE/incident.md` defines the incident packet. `runSyncQueueOnce(db)` is the shared foreground/background executor; `SyncTriggerEffect` no-ops until Supabase is configured and `authStore.userId` exists; `sync-task.ts` defines `TDPOS_BACKGROUND_SYNC` at module scope and `register-sync.ts` registers it with `expo-background-task` at a 15-minute minimum interval. `apply-inventory-delta` and `create-sale` use `withSupabase({ auth: 'user' })`; `create-sale` delegates to `create_sale_atomic(p_payload)` so remote `sales` + `sale_items` are all-or-nothing. End-to-end against a real Supabase project blocks on P7 auth pairing.

### v1.0 Evidence

- [ ] Date:
- [ ] Commit/tag:
- [ ] Pilot store:
- [ ] Full-day offline run:
- [ ] Reconciliation result:
- [ ] Known risks:
