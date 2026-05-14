# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Mobile App                        │
│              (Expo SDK 55 / React Native)            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Zustand   │  │ React    │  │ Expo Router      │  │
│  │ Stores    │  │ Query v5 │  │ (file-based)     │  │
│  │ + MMKV    │  │          │  │                  │  │
│  └─────┬────┘  └─────┬────┘  └──────────────────┘  │
│        │              │                              │
│  ┌─────┴──────────────┴──────────────────────────┐  │
│  │              Local SQLite                      │  │
│  │    (9 migrations, offline source of truth)     │  │
│  └─────────────────────┬─────────────────────────┘  │
│                        │                             │
│  ┌─────────────────────┴─────────────────────────┐  │
│  │         Sync Engine (background)               │  │
│  │  expo-background-task · delta-based · idempotent│  │
│  └─────────────────────┬─────────────────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │ HTTPS (when online)
┌────────────────────────┼────────────────────────────┐
│                   Supabase                           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Auth     │  │ Edge     │  │ PostgreSQL 17     │  │
│  │ (OTP)   │  │ Functions │  │ + RLS             │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────┐
│              Web Dashboard                           │
│           (Next.js 16 / App Router)                  │
│                                                      │
│  Server Components → Supabase SSR (getClaims)        │
│  Server Actions → Zod + RLS + audit logging          │
└──────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Offline-First (Non-Negotiable)

Every cashier-facing screen works with **zero internet**. The mobile app treats the local SQLite database as the source of truth and syncs to Supabase as a background concern.

**Data flow:**

1. User action → write to SQLite immediately
2. Sync engine picks up the write from `sync_queue`
3. Background task pushes to Supabase Edge Function
4. Server applies with idempotent dedup via `applied_operations`

### 2. Canonical Pieces Inventory

All stock is stored as `stock_pieces` (INTEGER). Packs are a display concept, never stored:

```
stock_pieces = 47, pieces_per_pack = 12
Display: "3 packs + 11 pieces"
Calculation: divmod(47, 12) → (3, 11)
```

### 3. Delta-Based Sync

Inventory changes are sent as deltas (`-1`), never absolute values. This prevents two offline devices from overwriting each other's sales:

```
Device A offline: sells 1 → sends delta -1
Device B offline: sells 1 → sends delta -1
Server: stock 50 → 50 + (-1) + (-1) = 48 ✓
```

### 4. Idempotent RPCs

Every state-mutating RPC includes a `client_operation_id` (UUIDv4). The server deduplicates using:

```sql
INSERT INTO applied_operations (id, ...)
VALUES ($1, ...)
ON CONFLICT (id) DO NOTHING
RETURNING id;
```

If the insert returns nothing, the operation was already applied — the server returns the cached result.

### 5. Immutable Sales

Sales rows are **never updated or deleted**. Corrections use compensating entries:

- **Void:** creates a negative compensating sale + positive inventory delta
- **Return:** creates a return request with separate compensating entry
- **`synced_at`** is the only updatable field (marks sync completion)

## Key Architecture Decisions (ADRs)

| ADR     | Decision                                                  |
| ------- | --------------------------------------------------------- |
| ADR-001 | Offline-first with SQLite as local source of truth        |
| ADR-002 | Delta-based inventory sync (never absolute values)        |
| ADR-003 | Canonical pieces model (stock_pieces INTEGER only)        |
| ADR-004 | Receipt namespace partitioning (BRANCH-CASHIER-DATE-SEQ)  |
| ADR-005 | Idempotent RPCs via client_operation_id                   |
| ADR-006 | Phone OTP only (no email/password auth)                   |
| ADR-007 | Five-tier product model (A–E)                             |
| ADR-011 | Sales immutability — corrections via compensating entries |
| ADR-014 | Diagnostics support bundles via clipboard                 |

## State Management

| Layer             | Tool              | Persistence | Purpose                     |
| ----------------- | ----------------- | ----------- | --------------------------- |
| Client ephemeral  | Zustand 5         | None        | Cart, UI state              |
| Client persistent | Zustand 5 + MMKV  | MMKV        | Auth tokens, settings       |
| Local structured  | expo-sqlite       | SQLite      | Products, sales, sync queue |
| Server cache      | TanStack Query v5 | Memory      | Server data caching         |
| Server persistent | Supabase (PG17)   | PostgreSQL  | Canonical business data     |

## Security Model

- **RLS on every table** — queries scoped to `auth.uid()` and `business_id`
- **Phone OTP only** — no email/password, E.164 format (+639XX)
- **Fail-closed entitlements** — paid surfaces blocked when cache >7 days stale
- **Safe logging** — `warnSafe()` strips PII from production error paths
- **Customer erasure** — GDPR-ready PII blanking while preserving transaction history
- **Immutable audit trail** — sales, voids, stock takes are append-only
