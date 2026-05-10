# Database Schema Reference — TD POS

> Source of truth: `supabase/migrations/*.sql`
> TypeScript types: `packages/db/src/schema.ts`
> Tier definitions: `packages/shared/src/constants/index.ts`

## Entity Relationship Diagram

```mermaid
erDiagram
    businesses ||--o{ users : "employs"
    businesses ||--o{ branches : "has"
    businesses ||--o{ products : "sells"
    businesses ||--o{ categories : "organizes"
    businesses ||--o{ customers : "serves"
    businesses ||--o{ audit_logs : "logs"
    businesses ||--o{ business_devices : "registers"
    businesses ||--o{ shift_sessions : "opens"
    businesses ||--o{ manager_approval_requests : "reviews"
    businesses ||--o{ kiosk_orders : "queues"
    businesses ||--o{ return_requests : "handles"

    branches ||--o{ sales : "records"
    branches ||--o{ inventory_logs : "tracks"
    branches ||--o{ shift_sessions : "runs"
    branches ||--o{ kiosk_orders : "receives"

    products ||--o{ sale_items : "sold as"
    products ||--o{ inventory_logs : "adjusted"
    products ||--o{ weighted_plu_profiles : "weights"

    sales ||--o{ sale_items : "contains"
    sales ||--o{ payments : "paid by"
    sales ||--o{ receipts : "generates"

    customers ||--o{ sales : "buys"
    customers ||--o{ utang_payments : "pays"

    businesses ||--o{ applied_operations : "deduplicates"
```

## Core Tables

### businesses (Tenant + Entitlement Root)

| Column | Type | Description |
|---|---|---|
| `subscription_tier` | TEXT NOT NULL DEFAULT `tier_a_free` | Canonical A-E tier. Check-constrained to `tier_a_free`, `tier_b_pro`, `tier_c_plus`, `tier_d_premium`, `tier_e_enterprise`. |
| `module_state` | JSONB NOT NULL DEFAULT `{}` | Per-tenant module overrides. Shared tier defaults remain the baseline. |
| `entitlements_valid_until` | TIMESTAMPTZ | Last-known entitlement expiry for offline gating and fail-closed manager surfaces. |
| `max_products` | INTEGER | Tenant product limit override. `NULL` means use tier default / unlimited where applicable. |
| `max_branches` | INTEGER | Tenant branch limit override. |
| `max_devices` | INTEGER | Tenant device limit override. |
| `max_users` | INTEGER | Tenant user limit override. |

**Canonical tiers:** new rows use the five A-E values only. Legacy values from early scaffolds are normalized by `20260510000000_tier_normalization.sql`.

**Offline gating:** mobile stores the last successful entitlement snapshot in `auth-store`; cashier sales remain available offline, while manager/owner surfaces check the cached tier/module state.

### products (Canonical Pieces Model)

| Column | Type | Description |
|---|---|---|
| `stock_pieces` | INTEGER NOT NULL | Current stock in smallest sellable unit |
| `pieces_per_pack` | INTEGER NOT NULL DEFAULT 1 | How many pieces make one pack |
| `price_per_piece` | NUMERIC | Selling price per piece |
| `price_per_pack` | NUMERIC | Selling price per pack |
| `cost_per_piece` | NUMERIC | Cost basis per piece |
| `is_tingi` | BOOLEAN | Whether per-piece selling is enabled |

**Display:** `divmod(stock_pieces, pieces_per_pack)` → "X packs + Y pieces"

### sale_items

| Column | Type | Description |
|---|---|---|
| `pieces_sold` | INTEGER NOT NULL | Always stored in pieces |
| `was_sold_as` | TEXT ('piece'/'pack') | What the customer saw on receipt |

### applied_operations (Race-Safe Dedup)

| Column | Type | Description |
|---|---|---|
| `business_id` | UUID | Tenant partition |
| `client_operation_id` | UUID | Client-generated idempotency key |
| `status` | TEXT | 'in_progress', 'completed', 'failed' |
| `result` | JSONB | Cached RPC result for replay |

### sync_queue (SQLite only — never on Supabase)

| Column | Type | Description |
|---|---|---|
| `client_operation_id` | TEXT UNIQUE | UUID for idempotent server application |
| `operation` | TEXT | INSERT, UPDATE, DELETE, or DELTA |
| `payload` | TEXT | JSON-serialized mutation data |
| `retry_count` | INTEGER | Exponential backoff tracking |

### paid-tier surface scaffold tables

`20260511000000_tier_surface_scaffold.sql` creates tenant-scoped backend tables for the Tier B-E route shells. They are intentionally broad scaffolds: every table has `business_id`, RLS, and append/update semantics suitable for later production flows, but the full route behavior and test matrix remain 0.9 work.

| Table | Purpose |
|---|---|
| `business_devices` | Device/lane registry with install id, last seen, surface, cached entitlement snapshot, and sanitized sync queue counts. |
| `shift_sessions` | Shift start, close, cash count, variance, and handoff notes. |
| `manager_approval_requests` | Pending/approved/declined manager decisions for voids, price overrides, and sensitive workflows. |
| `weighted_plu_profiles` | PLU code, unit, tare, and rounding profile for weighted products. |
| `kiosk_orders` | Self-service kiosk order queue awaiting staff confirmation before stock changes. |
| `return_requests` | Returns and warranty desk scaffold with original sale and compensating sale references. |

`business_devices` has a `business_devices_limit_guard` trigger that enforces `businesses.max_devices` for new install ids. Existing install ids can still heartbeat through `ON CONFLICT` updates. The `sync_snapshot` column carries counts only (`unsynced_rows`, `pending_rows`, `failed_rows`, `reviewable_rows`, timestamps), never raw queue payloads.

Mobile also has local-first counterparts for paid workflow scaffolds: `runLocalMigrations()` v2 creates SQLite `shift_sessions` so `mobile.shift_login` and `mobile.shift_handoff` can open, summarize, count, and close a cashier shift while offline; v3 creates SQLite `manager_approval_requests` so Tier C convenience counters and manager phones can queue and resolve local approval decisions. Those rows do not enter `sync_queue` yet; remote shift/approval sync is deferred until the shared sync envelope is extended beyond sales inserts and inventory deltas. Tier D Premium surfaces (`mobile.supermarket_counter`, `mobile.customer_display`, `mobile.backoffice_audit`, `mobile.weighted_plu`) do not add new local tables; they read from existing `products`, `sales`, `inventory_logs`, and `sync_queue` tables. The supermarket counter and weighted PLU surfaces write through the shared cart/checkout path; the back-office audit surface is gated to owner/manager roles. Tier E Enterprise surfaces add two new local tables: v4 creates `kiosk_orders` so `mobile.self_service_kiosk` can queue customer-built orders that require staff confirmation before stock is decremented; v5 creates `return_requests` so `mobile.returns_warranty` can record return reason codes and manager approval decisions against original sale references without mutating them (ADR-011). `mobile.hq_rollup` reads from existing `branches`, `products`, `sales`, and `sync_queue` tables for cross-branch snapshots and is gated to owner/manager roles.

## Entitlement Guard Functions

The Supabase entitlement scaffold lives in `20260510000001_entitlement_guards.sql`.

| Function | Purpose |
|---|---|
| `normalize_subscription_tier(text)` | Converts legacy tier strings to the five canonical values. Unknown values fall back to `tier_a_free`. |
| `tier_includes_surface(text, text)` | Static A-E surface map mirroring `TIER_DEFINITIONS`. |
| `tier_includes_module(text, text)` | Static A-E module map mirroring `TIER_DEFINITIONS`. |
| `current_business_can_use_surface(text)` | Authenticated tenant surface check for web route/action guards. |
| `current_business_can_use_module(text)` | Authenticated tenant module check with tier unlock + per-business override semantics. |
| `current_business_entitlement_snapshot()` | Returns the signed-in tenant's canonical tier, module state, expiry, and limits. |
| `get_business_entitlements(uuid)` | Returns one tenant's canonical tier, module state, expiry, and limits for server-side checks. |
| `business_limit_value(uuid, text)` | Reads product, branch, device, or user limits for the signed-in tenant. |
| `assert_business_limit(uuid, text, integer)` | Raises a limit error when a mutating action would exceed a tenant limit. |

## Migration Inventory

| Migration | Purpose |
|---|---|
| `20260508000000_initial_schema.sql` | Initial tenant, inventory, sales, sync, receipt, audit, and entitlement columns. |
| `20260509000000_immutability_triggers.sql` | Server-side immutability for sales, sale items, and inventory logs. |
| `20260509000001_create_sale_atomic.sql` | Atomic remote sale creation RPC. |
| `20260510000000_tier_normalization.sql` | Canonical A-E tier normalization and check constraint. |
| `20260510000001_entitlement_guards.sql` | Server helper functions for entitlement and limit checks. |
| `20260511000000_tier_surface_scaffold.sql` | Tenant-scoped tables for paid-tier devices, shifts, approvals, PLUs, kiosks, and returns. |
