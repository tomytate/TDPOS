# Architecture Decision Records — TD POS

## ADR-001: Monorepo with Turborepo + Bun

**Decision:** Use a single monorepo with Turborepo 2.9 + Bun for both mobile (Expo) and web (Next.js) apps.

**Why:**
- Shared types, validators, and constants across platforms via `packages/shared`
- Consistent tooling (ESLint 9, Prettier, TypeScript 6) across all workspaces
- Bun provides fastest dependency installation and native TypeScript support
- Turborepo `tasks` (not deprecated `pipeline`) for build orchestration and caching

---

## ADR-002: expo-sqlite over Drizzle ORM

**Decision:** Use raw expo-sqlite with manual migrations instead of Drizzle ORM.

**Why:**
- The sync_queue requires fine-grained control over SQLite operations
- The `client_operation_id` pattern needs precise transaction management
- Manual migrations via `SQLiteProvider.onInit` give full control over idempotent schema setup
- The canonical pieces model requires specific integer constraints that are simpler in raw SQL

---

## ADR-003: Delta-Based Inventory Sync

**Decision:** Inventory changes are always sent as deltas, never absolute values.

**Why (from spec §6.3):**
- Two cashiers at two branches both selling the last unit while offline — with absolute writes, one sale's decrement is lost
- Deltas are naturally idempotent when combined with `client_operation_id` dedup
- The `apply_inventory_delta` RPC atomically applies the delta with a negative stock guard

---

## ADR-004: Canonical Pieces Model

**Decision:** All inventory is stored as `stock_pieces` INTEGER (smallest sellable unit).

**Why (from spec §4.1.3):**
- The v1.0 schema used a single `stock_quantity` integer with no pack/piece separation
- This broke when selling loose sachets from an opened pack ("0 packs + 5 sachets" was unrepresentable)
- `divmod(stock_pieces, pieces_per_pack)` gives accurate display at all times
- This is the primary technical differentiator vs international competitors

---

## ADR-005: Race-Safe Idempotency via INSERT...ON CONFLICT

**Decision:** Use `INSERT...ON CONFLICT DO NOTHING RETURNING` for operation reservation.

**Why (from spec Appendix D, v4.0):**
- The v3.0 lookup-then-apply pattern had a TOCTOU race: two concurrent requests could both pass the existence check
- The `INSERT...ON CONFLICT` is atomic at the Postgres level — no window for both to succeed
- Only the winner applies the mutation; losers get cached result or retry-after

---

## ADR-006: Receipt Number Namespacing

**Decision:** Receipt numbers use `BRANCH-CASHIER-DATE-SEQUENCE` format.

**Why (from spec §4.1.7):**
- Per-device namespace partitioning means two offline devices physically cannot collide
- No coordination or server involvement needed for number assignment
- BIR serial mapping added later when accredited (separate column)

---

## ADR-007: Phone OTP Only Authentication

**Decision:** TD POS authenticates users via Supabase Phone OTP exclusively. No email/password, no social, no Firebase.

**Why:**
- Sari-sari store owners and cashiers reliably have a Philippine mobile number (E.164 `+639XX...`); many do not have personal email addresses or remember email passwords.
- One channel = one identity. Recovery is "I have my phone." Recovery for email/password is a support nightmare on low-end devices.
- Supabase native phone auth is well-integrated with RLS via `auth.uid()`.
- MMKV storage adapter avoids the `AsyncStorage` hydration flash.

**Consequences:**
- We pay an SMS provider once auth volume is real. The marketing site must be honest that OTP requires SMS delivery to a live PH number.
- Test accounts in CI/dev use Supabase's test OTP feature, not real SMS.
- The `app/(auth)/sign-in.tsx` demo-mode shortcut is gated on `__DEV__` and removed before any production user touches the app (P11.1).

---

## ADR-008: Modules Default OFF

**Decision:** All optional modules — utang, customer SMS, loyalty, supplier management, multi-branch, franchise management, payroll, accounting integration, public API — are OFF by default for every business. UI for disabled modules must be completely hidden, not merely disabled.

**Why:**
- The 80% sari-sari case never enables most of these. Every always-visible module dilutes the cashier flow with controls that 80% of users will never tap.
- Off-by-default is reversible; on-by-default-then-hide-later is not, because customers grow accustomed to visible features.
- Hidden vs. disabled matters for accessibility: a visible-but-disabled control still draws focus and confuses screen readers.

**Consequences:**
- The settings store is the single source of module state (`useSettingsStore().modules`).
- Every UI that depends on a module must read the flag and either render or not render the module's surface — never just gray it out.
- Tests must include a "module visibility" assertion (P9.2).

---

## ADR-009: BIR-Ready Posture Until Accredited

**Decision:** Until a business + device pair is BIR-accredited, TD POS uses only the language "BIR-ready receipt format" / "Provisional receipt" / "Designed to BIR specification" / "BIR accreditation pending." Words such as "BIR-compliant," "BIR-certified," "BIR-approved," "Official Receipt," and unqualified "Sales Invoice" are forbidden in product copy, UI strings, and marketing material.

**Why:**
- BIR penalizes misrepresentation. Using accreditation language before accreditation creates legal exposure for the operator and the platform.
- "Provisional receipt" is the legally correct term for non-VAT micro under ₱3M, which describes the bulk of the v1.0 user base.
- A single language flip is much cheaper than fixing copy across mobile, web, marketing, and customer-printed receipts the day accreditation lands.

**Consequences:**
- All BIR-facing copy lives in `packages/shared/src/constants/index.ts` (`BIR_RECEIPT_HEADER`, `BIR_RECEIPT_FOOTER`, `BIR_RECEIPT_NOTE`).
- The forbidden-patterns scanner (`scripts/check-forbidden-patterns.mjs`) blocks the prohibited terms at the foundation gate.
- The day a tenant becomes accredited, only the constants change; no scattered copy edits.

---

## ADR-010: No Partial Release — Mobile + Web + Marketing Ship Simultaneously

**Decision:** TD POS v1.0 is a combined launch. The mobile app, the web dashboard, and the marketing site must all clear the v1.0 quality bar on the same day. There is no "ship mobile, then web later." There is no calendar. v1.0 is a quality bar; readiness determines time.

**Why:**
- A POS without an owner-facing dashboard is a half-product. A dashboard without a marketing site no one can find is a half-product. Each surface is the wedge for one of the three personas (cashier, owner, prospect); shipping any one alone leaves the other two unsupported.
- Setting a date pressures the team to compromise correctness for shipping, which contradicts the spec wedge ("inventory correctness first").
- Combined launch lets the marketing site honestly describe what the apps do, not what we hope they will do.

**Consequences:**
- The web dashboard is mainline (Phase W in the checklist), not Post-1.0.
- The marketing site is tracked (Phase M in the checklist), not improvised.
- Phase 11 is now eight sub-gates (mobile core, web dashboard, marketing site, engineering, documentation, operations, business, definition of enterprise-grade); v1.0 ships only when every sub-gate is `[x]` on the same day.
- We commit to no public dates and no soft launches.

---

## ADR-011: Sales Are Immutable; Corrections Use Compensating Entries

**Decision:** A sale row is immutable from the moment it is committed. The only allowed mutation is `synced_at`. `sale_items` and `inventory_logs` are similarly immutable. Corrections happen via compensating entries — a void writes a new sale row with `status = 'voided'` and a corresponding positive `apply_inventory_delta`, both with their own `client_operation_id`.

**Why:**
- Compensating entries match the BIR audit posture: every transaction has a paper trail; nothing disappears.
- Immutability is enforceable at the database level via triggers, not just application discipline. Server-side enforcement protects against buggy clients, malicious admins, and stale code paths.
- Receipt sequence does NOT skip; voids produce their own receipts that reference the original.

**Consequences:**
- `supabase/migrations/20260509000000_immutability_triggers.sql` enforces this with `prevent_sales_mutation`, `prevent_sale_items_mutation`, and `prevent_inventory_logs_mutation`.
- The void/refund workflow (P11.5.4) writes new rows; it never updates existing ones.
- Audit log table also has `prevent_audit_mutation` from the initial migration.

---

## ADR-012: AsyncSqliteLike Test Interface

**Decision:** Code that writes to or reads from SQLite during a sale (notably `executeCheckout`) accepts a structurally-typed `AsyncSqliteLike` rather than the concrete `SQLiteDatabase` type from `expo-sqlite`. This lets the §14 tests run under `bun:sqlite` via a thin adapter, with no React Native runtime in the loop.

**Why:**
- Bun's `bun:sqlite` is fast, in-process, and lets us assert against the real `LOCAL_SCHEMA_SQL`. The §14 tests would otherwise require a device or simulator, which is impractical for CI.
- `expo-sqlite`'s `SQLiteDatabase` satisfies `AsyncSqliteLike` structurally with no runtime overhead.
- The interface is explicitly minimal — only the methods `executeCheckout` actually uses — so it cannot drift into a parallel ORM.

**Consequences:**
- New checkout-side code reads/writes via the interface, not by importing `SQLiteDatabase` directly.
- The test adapter (`makeAdapter` in `apps/mobile/src/features/sales/lib/execute-checkout.test.ts`) implements the interface using `bun:sqlite`.
- If `expo-sqlite` ever changes a method signature, the structural compatibility check will fail at typecheck time.

---

## ADR-013: Atomic Remote Sale Creation

**Decision:** Remote sale sync uses the `create_sale_atomic(p_payload JSONB)` Postgres function behind the `create-sale` Edge Function. The function creates the `sales` row and every `sale_items` row in one transaction. Inventory deltas remain separate `apply_inventory_delta` operations because each delta has its own `client_operation_id` and race-safe `applied_operations` lifecycle.

**Why:**
- A multi-step Edge Function can leave a partial remote sale if the sale insert succeeds and the line-item insert fails before retry.
- Keeping sale creation in one Postgres transaction gives all-or-nothing behavior at the database boundary.
- Separating sale replay from stock replay preserves the existing delta-sync design and prevents accidental double-decrement.

**Consequences:**
- Local checkout queues the `sales` sync row before product `DELTA` rows, so processing order matches the remote dependency order.
- The Edge Function only validates and delegates; tenant checks live in the security-definer function and return `{ ok: false, reason: ... }` for reviewable failures.
- Postgres §14 tests must cover replay, tenant rejection, and partial-state prevention before the v0.6 tag.
