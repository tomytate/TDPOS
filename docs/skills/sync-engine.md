---
name: sync-engine
description: Use this skill when working on the sync queue, offline-to-online data synchronization, idempotency keys, applied_operations table, retry logic, or the race-safe RPC pattern.
version: 1.0.0
---

# Sync Engine Architecture

## Overview

```
UI → SQLite (instant) → sync_queue → expo-background-task → Supabase RPC → applied_operations
```

All writes go to local SQLite first. UI updates instantly. Background sync pushes to server.

## Local sync_queue Schema (SQLite only)

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_operation_id TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT CHECK(operation IN ('INSERT','UPDATE','DELETE','DELTA')),
  payload TEXT NOT NULL,
  base_version INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  synced_at INTEGER,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);
```

## Server applied_operations Schema (Supabase Postgres)

```sql
CREATE TABLE applied_operations (
  business_id UUID NOT NULL,
  client_operation_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress','completed','failed')),
  result JSONB,
  applied_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (business_id, client_operation_id)
);
```

## Race-Safe Idempotency Pattern

The core pattern uses `INSERT...ON CONFLICT DO NOTHING RETURNING`:

1. **Attempt reservation:** `INSERT INTO applied_operations (..., status='in_progress') ON CONFLICT DO NOTHING RETURNING true`
2. **If won race (returned true):** Apply the mutation. Update status to `completed` with cached result.
3. **If lost race (returned nothing):** Read existing row. If `completed`/`failed`, return cached result with `replayed: true`. If `in_progress`, return `concurrent_in_progress` with `retry_after_ms: 500`.

## Retry Strategy

- Exponential backoff: 5s → 30s → 2min → 10min
- Max 10 retries → flag for manual review
- Same `client_operation_id` sent each retry (idempotent)

## Stale Reservation Cleanup

`pg_cron` job every minute:
```sql
DELETE FROM applied_operations
  WHERE status = 'in_progress'
    AND applied_at < now() - interval '60 seconds';
```

## Conflict Policy

- **Sales:** Immutable. Server wins.
- **Inventory:** Deltas only, idempotent. No conflict possible.
- **Product metadata:** Timestamp LWW with audit log.

## Required Tests

- §14 #2: Two offline branches each sell 1 of 2 → final stock = 0
- §14 #4: Same `client_operation_id` twice → one decrement only
- §14 #6: 100 concurrent calls, same op_id → exactly one decrement

## Sources

Domain skill — no external package. Authority lives in the project's own design.

- Spec index: [../spec-v5.md](../spec-v5.md)
- Architecture decisions: [../architecture.md](../architecture.md) (ADR-003 Delta-Based Sync, ADR-005 Race-Safe Idempotency)
- Implementation: `apps/mobile/src/features/sales/lib/execute-checkout.ts` (writes to `sync_queue`), `supabase/migrations/20260508000000_initial_schema.sql` (`apply_inventory_delta` RPC + `applied_operations` table)
- Tests: `apps/mobile/src/features/sales/lib/execute-checkout.test.ts` (local idempotency); §14 #2/#4/#6 require a Postgres test environment (P9.4)
- Last verified: 2026-05-09
