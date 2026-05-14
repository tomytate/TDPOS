# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Five-tier mobile scaffold** — all surfaces for Tier A (Free) through Tier E (Enterprise) implemented with local-first persistence
- **Void workflow** — manager-driven same-day void with compensating entries (ADR-011 compliant)
- **Stock take** — physical count adjustments with append-only audit trail and delta sync
- **Stock Accuracy Score (SAS)** — automated count-vs-system comparison metric
- **Clock skew guard** — checkout blocks receipts >24h from last server handshake
- **Customer erasure** — GDPR-ready PII blanking via `erase_customer_pii()` RPC
- **Data retention policy registry** — centralized retention periods in `@tdpos/shared`
- **Tenant data export** — Edge Function + web download for full tenant data portability
- **Local disaster-recovery export** — manager-triggered JSON export from Diagnostics
- **Barcode scanner** — camera-based EAN/UPC scanning with product lookup and cart integration
- **Catalog refresh** — pulls remote products/categories into local SQLite after sync
- **Device heartbeat freshness** — 15-min cadence, 45-min stale, 24h offline classification
- **Lost-device recovery** — receipt-sequence acknowledgement + replacement slot release
- **Device pairing** — code-based device provisioning via Supabase RPC (WIP)
- **Privacy notice** — EN/TL translated, reachable from Diagnostics, with acknowledgement tracking
- **Safe logging** — `warnSafe()` sanitizes error paths to prevent PII in production logs
- **Committed secret scanner** — `check:secrets` gate blocks real-looking secrets in source
- **Forbidden pattern scanner** — blocks `console.log()` in production code
- **Local migration ordering gate** — `check:sqlite-migrations` verifies contiguous versioning
- **Visual QA polish** — all mobile, web, and marketing surfaces polished for v0.9 review
- **128 automated tests** across 23 files (94 mobile + 34 shared)
- **13-stage foundation gate** — format → secrets → SQLite schema → migration ordering → forbidden patterns → tier UI sources → doc links → skill docs → Expo Doctor → Android bundle → typecheck → lint → tests

### Infrastructure

- 16 Supabase PostgreSQL migrations
- 4 Edge Functions (apply-inventory-delta, create-sale, eod-report, tenant-data-export)
- 9 local SQLite migrations (v1–v9)
- 9 check scripts in `scripts/`
- CI workflow (`.github/workflows/foundation.yml`)

## [0.8.0] — 2026-05-11

### Added

- Five-tier scaffold checkpoint — all tier surfaces implemented
- Tier B Pro: tablet POS, owner cashier lanes, shift login/handoff
- Tier C Plus: convenience counter, manager phone approval flow
- Tier D Premium: supermarket counter, customer display, back-office audit, weighted PLU
- Tier E Enterprise: HQ rollup, self-service kiosk, returns/warranty desk
- Shift session local persistence (migration v2)
- Manager approval requests (migration v3)
- Kiosk orders with staff confirmation guard (migration v4)
- Return requests with ADR-011 compliance (migration v5)
- Entitlement cache fail-closed behavior for paid surfaces
- 0.9 tier test suite foundation (46 tests)

## [0.4.0] — 2026-05-09

### Added

- Offline checkout transaction (`executeCheckout`)
- Sale → Checkout → Receipt → sync_queue write loop
- Sync processor with Zod validation and batch sizing
- Background sync via `expo-background-task`
- Edge Functions: `apply-inventory-delta`, `create-sale`
- Diagnostics screen with sync health metrics
- Support bundle via clipboard
- Device identity and heartbeat
- Foundation gate (format → SQLite drift → patterns → typecheck → lint → tests)

## [0.1.0] — 2026-05-09

### Added

- Initial monorepo scaffold (Turborepo 2.9 + Bun)
- Expo SDK 55 mobile app with offline-first SQLite
- Next.js 16 web dashboard with Supabase SSR auth
- Shared types, validators, constants (`@tdpos/shared`)
- Database schema types (`@tdpos/db`)
- Supabase PostgreSQL 17 migrations and RLS policies
- 22 anti-hallucination skill docs
- AI agent context files (AGENTS.md, CLAUDE.md, CODEX.md, GEMINI.md)
