# TD POS Security And Privacy Posture (P10.4)

> Status: pre-pilot audit. This document is the single source for what data the system stores, how it is protected, and how a reviewer verifies the posture without spelunking through migrations and source. It is referenced by the v0.9 P10.4 checklist row.

**Last audited:** 2026-05-15.

## 1. Stored Local Data (Mobile SQLite)

The mobile app uses a single SQLite database created by `expo-sqlite`. Every write is gated by `runLocalMigrations()` and replays the canonical `LOCAL_MIGRATIONS` registry from `apps/mobile/src/db/migrations.ts`.

| Table                       | Holds                                                | Contains PII?                       |
| --------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `products`                  | catalog, prices, `stock_pieces`, tingi metadata      | No                                  |
| `categories`                | category names + display colors                      | No                                  |
| `customers`                 | optional customer profiles (utang/loyalty modules)   | Yes — name, phone suffix, balances  |
| `sales`                     | immutable receipt rows                               | Receipt clock + cashier identity    |
| `sale_items`                | one row per sold line                                | No                                  |
| `inventory_logs`            | every `stock_pieces` delta with reason + source      | No                                  |
| `sync_queue`                | pending push payloads keyed by `client_operation_id` | Indirect — payloads can include PII |
| `applied_operations`        | server response cache for idempotency                | No                                  |
| `schema_version`            | migration registry                                   | No                                  |
| `shift_sessions`            | open/close + variance                                | No                                  |
| `manager_approval_requests` | voids/overrides awaiting approval                    | No                                  |
| `kiosk_orders`              | self-service drafts                                  | No                                  |
| `return_requests`           | refund/void scaffolds                                | No                                  |
| `stock_take_counts`         | cycle counts (immutable)                             | No                                  |
| `sale_voids`                | original→compensating sale link                      | No                                  |

`device_install_id`, `branch_id`, `cashier_code` live in MMKV — they identify the device, not a person. MMKV also caches entitlements and the last server-clock handshake.

**No third-party crash log, analytics SDK, or session replay tool ships in the mobile binary at v0.9.** When one is approved (P10.3), the privacy review applies before it goes live.

## 2. Customer Data Handling

Customer profiles are the only PII surface on the mobile side. They exist only when an opt-in module (`utang`, `customer_sms`, or `loyalty`) is enabled.

- **Source of truth:** `DATA_RETENTION_POLICIES` in `@tdpos/shared` (`packages/shared/src/types/index.ts`). Both apps render the same table.
- **Disabled-module cleanup:** `ModulePrivacyCleanupEffect` (mobile) plus `sync-time entitlement refresh` clear or narrow local `customers` rows when a module turns off.
- **Right-to-erasure:** `erase_customer_pii(uuid, text)` Postgres function blanks customer PII, zeroes loyalty/utang balances, retains transaction references for the legally required window, and writes a sanitized audit row. The web dashboard `/modules` page exposes the action to owner + manager roles.
- **Right-to-export:** `tenant-data-export` Edge Function returns one owner-only JSON file and records an idempotent `tenant.exported` audit marker through `record_tenant_export(uuid)`. The web dashboard surfaces the export button on the privacy page.
- **Notice + acknowledgement:** mobile `/privacy` and web `/privacy` both let an owner record an acknowledgement timestamp. Mobile writes to MMKV; web writes to `audit_logs` via `acknowledgePrivacyNoticeAction`.

## 3. Phone Auth Flow

TD POS uses Supabase phone-OTP authentication exclusively (ADR-007). The detailed transport/SDK reference lives in `docs/skills/supabase-auth-phone-otp.md`. The flow itself is:

1. User enters PH-formatted phone in `app/(auth)/sign-in.tsx`. `normalizePhPhone` + `isValidPhPhone` normalize and validate before the network call.
2. `supabase.auth.signInWithOtp({ phone })` sends a one-time 6-digit code. There is no email, no magic link, no password.
3. User enters the code in `app/(auth)/verify-otp.tsx`. `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` exchanges it for a session.
4. `useAuthStateListener` watches `onAuthStateChange`. On `SIGNED_IN` (and `INITIAL_SESSION` on subscribe) it calls `bootstrapAuthFromSession()` against the `users` + `branches` + `businesses` tables to derive the cashier identity.
5. `bootstrapAuthFromSession()` returns a discriminated union; failure modes (`account_not_provisioned`, `business_not_assigned`, `account_inactive`, `no_branches_configured`, `query_failed`) each map to a cashier-safe error banner. Tokens are NEVER stored anywhere except the Supabase MMKV session adapter.
6. Web SSR uses `@supabase/ssr` and `getClaims()` exclusively. `getSession()` is forbidden by `check:patterns`.

**Rate limiting and lockout:** OTP rate limits are configured at the Supabase project level. The mobile app does not store the phone in plain text — it is recomputed from the active session on each launch.

**Demo-mode bypass:** removed before pilot. `check:patterns` enforces "no demo-mode shortcut in `(auth)/sign-in.tsx`".

## 4. Server-Side Tenant Isolation

The chain that keeps tenant A from reading tenant B's data:

1. **JWT claim.** Every authenticated request carries `auth.uid()`. Edge Functions verify it through `withSupabase({ auth: 'user' })` (see `docs/skills/supabase-server-edge-functions.md`).
2. **`current_business_id()`.** This Postgres function reads `auth.uid()`, joins `users`, and returns the tenant id. It is the single derivation point.
3. **RLS policy.** Every table has Row Level Security enabled with a policy that filters by `business_id = current_business_id()` (or the table's foreign-key equivalent). Enforced statically by `scripts/check-supabase-rls.mjs`: every `CREATE TABLE` in `supabase/migrations/` must be accompanied by `ENABLE ROW LEVEL SECURITY` and at least one policy.
4. **Web SSR.** `apps/web/src/lib/queries/*` files always import `'server-only'`. Every query starts with `getCurrentClaims()`; queries that need a tenant id use the same `current_business_id()` RPC. No client-side fetch hits the database directly.

**Coverage at audit time:** 25 base tables in production migrations, 25 with RLS enabled (100%). The drift is impossible because `check:supabase-rls.mjs` is wired into the foundation gate.

## 5. Logging Posture (No PII To Logs)

Both apps use a `warnSafe()` helper that logs only a scope label and an error _class_, never the raw error message or any contextual payload:

- Mobile: `apps/mobile/src/services/safe-logger.ts` — `warnSafe(scope, error)` writes `{ error: 'NameOfErrorClass' }`.
- Web: `apps/web/src/lib/safe-logger.ts` — same shape, optional non-PII metadata bag.

Direct `console.log(...)` is blocked by `check:patterns` (`/console\.log\s*\(/`). `console.warn` and `console.error` are allowed only when paired with `warnSafe` or sanitized metadata.

The support bundle assembled by `support-bundle.ts` (manager-triggered) excludes raw `sync_queue` payloads, shortens `client_operation_id` values, and sanitizes obvious phone/email substrings.

### Error Logging Plan

Where errors go, today and through pilot:

| Phase                                 | Transport                                       | What lands                                                                                                                 | Privacy guard                                                                                     |
| ------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **v0.9 — today**                      | Local `console.warn`/`console.error` only       | Scope label + error class via `warnSafe()`                                                                                 | No raw `Error.message`, no payload, no PII; `console.log()` forbidden by `check:patterns`         |
| **v0.1alpha — pilot**                 | Same as v0.9 + manager-triggered support bundle | Same as v0.9; support bundle adds queue **counts** + recent sync error **reasons** (operation labels), never raw payloads  | `support-bundle.ts` sanitization tests pin the redaction shape                                    |
| **Post-pilot — opt-in observability** | Sentry free/developer (only when approved)      | Same `warnSafe()` shape forwarded as a Sentry `captureException` with `extra` limited to the existing non-PII metadata bag | DSN env-only, scrubbing rules verified in a separate privacy review before the transport flips on |

Rules carried across phases:

- The `warnSafe()` callsite is the only authorized way to log an error in production code. New code must reuse the helper rather than logging the error object directly.
- Adding any new third-party logging/analytics SDK requires a privacy review pass that explicitly lists every event the SDK ships, the fields it carries, and the redaction rule.
- Session replay (FullStory / Sentry Replay / PostHog Recording) is forbidden until consent + privacy policy are reviewed legally.
- The eight PostHog product events listed in the Observability Upgrade Policy of the v1.0 checklist are the upper bound for analytics volume; nothing else is sent.

### Privacy Review For Logs (P10.3)

Performed 2026-05-15 as part of this audit:

- ✅ `warnSafe()` on mobile + web produces `{ scope, error: 'ErrorClassName', ...nonPiiMetadata }` and is unit-friendly. No call site forwards an `Error` instance, an `error.message`, a phone number, a customer name, or a `sync_queue` payload.
- ✅ `check:patterns` blocks new `console.log()` callsites. `console.warn` / `console.error` are reviewed manually.
- ✅ Support bundle assembly is tested (`support-bundle.test.ts`) against the redaction shape: queue payloads stay on-device, `client_operation_id` is tail-shortened, obvious phone/email substrings are masked.
- ✅ No third-party logging transport is wired in at v0.9. The plan above gates a future Sentry add-in behind a separate privacy review.

## 6. Secret Containment

| Credential                | Lives In                                          | Forbidden In       | Enforced By                                     |
| ------------------------- | ------------------------------------------------- | ------------------ | ----------------------------------------------- |
| Supabase publishable key  | Mobile + web env (`EXPO_PUBLIC_`, `NEXT_PUBLIC_`) | Anywhere else      | Naming convention                               |
| Supabase service-role key | Edge Functions + web SSR (server-only)            | Mobile binary      | `check:mobile-no-service-key` (foundation gate) |
| Any other secret          | `.env.local` (gitignored)                         | Git-tracked source | `check:secrets`                                 |

The `.env.local` files containing the publishable key are gitignored. The publishable key that leaked through the chat transcript on 2026-05-14 is tracked at the bottom of P0.1 with a `[ ] Rotate` action — _the rotation must happen before the pilot Supabase project is paired_.

## 7. How To Re-Run This Audit

1. `bun run check:foundation` — runs all 15 static stages including `check:secrets`, `check:supabase-rls`, `check:patterns`, `check:mobile-no-service-key`.
2. `grep -E "CREATE POLICY|ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql | wc -l` — should be ≥ table count.
3. `grep "withSupabase" supabase/functions/*/index.ts` — every function must use `auth: 'user'` or `['user', 'secret']`. No `auth: 'anon'`.
4. `grep -rE "console\.log\(" apps/mobile/src apps/web/src` — should return nothing (or only test fixtures).
5. Update the **Last audited** date at the top of this file.

## 8. Pending For Pilot

- Rotate the leaked publishable key in `apps/web/.env.local` and `apps/mobile/.env.local` (tracked in checklist P0.1).
- One full PII-flow walkthrough on a real device with VoiceOver/TalkBack (P10.5).
- One hosted-Supabase exercise of the privacy notice + export + erasure paths against a real project (P11.5.6).
