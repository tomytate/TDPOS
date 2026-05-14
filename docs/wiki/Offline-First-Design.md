# Offline-First Design

Offline-first is the foundational architectural decision of TD POS. Every cashier-facing screen works with zero internet. Network connectivity is treated as an optimization, not a requirement.

## Why Offline-First?

Philippine retail reality:

- Intermittent mobile data in provinces
- Store locations with poor WiFi
- Power outages during typhoon season
- Cannot stop selling because the internet is down

**If the POS requires internet to ring a sale, it fails the market.**

## Data Flow

```
User action
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Zustand  │────▶│  SQLite  │────▶│  Sync    │
│  (UI)     │     │  (local  │     │  Queue   │
│           │     │   truth) │     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                              ┌────────┴────────┐
                              │ Background Task  │
                              │ (expo-background- │
                              │  task, 15min)    │
                              └────────┬────────┘
                                       │ when online
                                       ▼
                              ┌─────────────────┐
                              │   Supabase       │
                              │   Edge Function  │
                              │   (idempotent)   │
                              └─────────────────┘
```

## Local SQLite

The local database is the source of truth for all cashier operations. It uses the async API:

```typescript
// Provider wraps the app
<SQLiteProvider databaseName="tdpos.db" onInit={runLocalMigrations}>
  <App />
</SQLiteProvider>

// Access in any component
const db = useSQLiteContext()
```

### Migration System

9 versioned migrations (v1–v9), each run exactly once:

| Version | Table/Change                                                                                              | Purpose                               |
| ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| v1      | products, categories, sales, sale_items, sync_queue, applied_operations, inventory_logs, receipt_sequence | Baseline schema                       |
| v2      | shift_sessions                                                                                            | Shift open/close (Tier B+)            |
| v3      | manager_approval_requests                                                                                 | Discount/void approvals (Tier C+)     |
| v4      | kiosk_orders                                                                                              | Self-service customer orders (Tier E) |
| v5      | return_requests                                                                                           | Returns/warranty tracking (Tier E)    |
| v6      | customers.pii_erased columns                                                                              | Customer erasure markers              |
| v7      | sales.device_timezone, synced_server_time                                                                 | Clock metadata                        |
| v8      | stock_take_counts                                                                                         | Physical inventory counts             |
| v9      | sale_voids                                                                                                | Void tracking                         |

## Sync Queue

Every write that needs server synchronization goes into `sync_queue`:

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,  -- 'sale' | 'inventory_delta'
  payload TEXT NOT NULL,         -- JSON envelope
  client_operation_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending | synced | failed | pending_sync_review
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER,
  synced_at INTEGER
);
```

### Sync Lifecycle

```
pending → (sync attempt) → synced       ✓ Success
pending → (sync attempt) → failed       ↺ Retry (up to limit)
pending → (server reject) → pending_sync_review  ⚠ Manager attention
```

### Idempotent Dedup

Every sync payload includes a `client_operation_id`. The server uses:

```sql
INSERT INTO applied_operations (id, operation_type, ...)
VALUES ($1, $2, ...)
ON CONFLICT (id) DO NOTHING
RETURNING id;
```

- Insert succeeds → operation applied, return result
- Insert conflicts → operation already applied, return cached result
- Either way, the client gets the same response

### Background Sync

The sync engine runs:

- **Foreground:** on app launch and after checkout
- **Background:** via `expo-background-task` every ~15 minutes

```typescript
// Register background sync
import { defineTask } from 'expo-background-task'

defineTask('TDPOS_BACKGROUND_SYNC', async () => {
  const db = await openDatabase()
  await runSyncQueueOnce(db)
})
```

## Clock Skew Protection

To prevent receipt date fraud:

1. **Server handshake:** during entitlement refresh, `server_clock_handshake()` caches server time
2. **Checkout guard:** blocks new receipts if device clock is >24h from last handshake
3. **Diagnostics:** support bundle shows last handshake timestamp

## Catalog Refresh

After sync, the app can pull updated product/category data from the server:

```typescript
await refreshCatalogFromSupabase(db, supabase)
```

This preserves local stock when unsynced inventory deltas exist, preventing offline sales from being erased by a catalog refresh.

## Entitlement Cache

Paid surface access is cached locally with a 7-day grace period:

- **Fresh cache (<7 days):** all entitled surfaces available
- **Stale cache (>7 days):** paid surfaces blocked, Tier A cashier always works
- **This ensures:** a cashier can always sell, even if the subscription lapses temporarily

## Device Heartbeat

Active devices send heartbeat signals during foreground sync:

| Classification | Criteria                        |
| -------------- | ------------------------------- |
| Fresh          | Last seen < 45 minutes ago      |
| Stale          | Last seen 45 min – 24 hours ago |
| Offline        | Last seen > 24 hours ago        |
| Lost           | Manually marked by owner        |
