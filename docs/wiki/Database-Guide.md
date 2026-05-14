# Database Guide

## Two Databases

TD POS uses two database systems that stay in sync:

| Database   | Engine                   | Purpose                            | Location          |
| ---------- | ------------------------ | ---------------------------------- | ----------------- |
| **Local**  | SQLite (expo-sqlite)     | Offline source of truth for mobile | Device filesystem |
| **Remote** | PostgreSQL 17 (Supabase) | Canonical server data, RLS, audit  | Cloud             |

## Local SQLite Schema

### Core Tables (v1 — Baseline)

```sql
-- Products available for sale
products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price REAL NOT NULL,
  cost REAL,
  stock_pieces INTEGER NOT NULL DEFAULT 0,    -- canonical pieces
  pieces_per_pack INTEGER NOT NULL DEFAULT 1, -- pack size
  sold_as TEXT DEFAULT 'piece',               -- 'piece' | 'pack'
  unit_label TEXT DEFAULT 'piece',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER, updated_at INTEGER, synced_at INTEGER
)

-- Product categories
categories (id, business_id, name, sort_order, is_active, ...)

-- Completed sales (IMMUTABLE — no UPDATE/DELETE)
sales (
  id TEXT PRIMARY KEY,
  business_id TEXT, branch_id TEXT,
  receipt_number TEXT UNIQUE NOT NULL,
  total_amount REAL NOT NULL,
  tender_amount REAL, change_amount REAL,
  payment_method TEXT DEFAULT 'cash',
  cashier_id TEXT, cashier_name TEXT,
  device_timezone TEXT,                       -- v7
  synced_server_time_at_last_handshake TEXT,  -- v7
  client_operation_id TEXT UNIQUE,
  created_at INTEGER, synced_at INTEGER
)

-- Line items for each sale (IMMUTABLE)
sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES sales(id),
  product_id TEXT, product_name TEXT,
  quantity INTEGER, unit_price REAL,
  line_total REAL, sold_as TEXT,
  pieces_per_pack INTEGER, pieces_delta INTEGER
)

-- Outbound sync queue
sync_queue (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,     -- 'sale' | 'inventory_delta'
  payload TEXT NOT NULL,            -- JSON
  client_operation_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER, synced_at INTEGER
)

-- Idempotency dedup (local)
applied_operations (id TEXT PRIMARY KEY, operation_type TEXT, ...)

-- Stock movement log
inventory_logs (id, product_id, delta, type, reference_id, ...)

-- Per-device receipt counter
receipt_sequence (branch_code TEXT, cashier_code TEXT, date TEXT, sequence INTEGER)
```

### Extension Tables (v2–v9)

| Version | Table                                  | Tier |
| ------- | -------------------------------------- | ---- |
| v2      | `shift_sessions`                       | B+   |
| v3      | `manager_approval_requests`            | C+   |
| v4      | `kiosk_orders`                         | E    |
| v5      | `return_requests`                      | E    |
| v6      | `customers` ALTER (pii_erased columns) | All  |
| v7      | `sales` ALTER (clock metadata)         | All  |
| v8      | `stock_take_counts`                    | B+   |
| v9      | `sale_voids`                           | B+   |

## Supabase Migrations

17 PostgreSQL migrations in `supabase/migrations/`:

| Migration                                    | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `20260508000000_initial_schema`              | Core tables with RLS                          |
| `20260508000001_sales_immutability`          | Immutability triggers                         |
| `20260508000002_sync_infrastructure`         | Sync queue, applied_operations                |
| `20260508000003_inventory_deltas`            | Delta-based inventory RPC                     |
| `20260508000004_receipt_sequence`            | Receipt namespace partitioning                |
| `20260509000000_audit_log`                   | Append-only audit trail                       |
| `20260509000001_eod_reports`                 | End-of-day report tables                      |
| `20260509000002_create_sale_atomic`          | Atomic sale creation RPC                      |
| `20260509000003_sync_health_views`           | Sync monitoring views                         |
| `20260510000000_tier_normalization`          | A-E tier model                                |
| `20260510000001_entitlement_guards`          | Entitlement validation                        |
| `20260511000000_tier_surface_scaffold`       | Device, shift, approval, kiosk, return tables |
| `20260512000000_customer_erasure`            | PII erasure markers + RPC                     |
| `20260512000001_tenant_export_audit`         | Export audit logging                          |
| `20260512000002_sale_clock_metadata`         | Clock skew detection                          |
| `20260512000003_server_clock_handshake`      | Server time handshake RPC                     |
| `20260512000004_inventory_adjustment_reason` | Stock take reasons                            |
| `20260512000005_stock_take_counts`           | Physical count records                        |
| `20260512000006_sale_voids`                  | Void link table                               |
| `20260513000000_device_recovery_metadata`    | Lost device recovery                          |

## Edge Functions

4 Edge Functions in `supabase/functions/`:

| Function                | Auth | Purpose                          |
| ----------------------- | ---- | -------------------------------- |
| `apply-inventory-delta` | User | Applies stock delta with dedup   |
| `create-sale`           | User | Creates sale atomically via RPC  |
| `eod-report`            | User | Generates end-of-day report      |
| `tenant-data-export`    | User | Exports full tenant data as JSON |

## RLS Patterns

Every table uses Row Level Security scoped to the authenticated user's business:

```sql
-- Standard pattern
CREATE POLICY "tenant_isolation" ON products
  USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
```

### Key RLS Rules

- **Sales:** SELECT only (no INSERT/UPDATE/DELETE via RLS — use RPC)
- **Audit logs:** INSERT only (no SELECT/UPDATE/DELETE for non-admin)
- **Products:** SELECT + INSERT + UPDATE for owner/manager roles
- **Applied operations:** INSERT only (dedup via ON CONFLICT)

## Migration Conventions

### Local SQLite

```typescript
// Each migration is exported and registered
export const LOCAL_MY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS my_table (
  id TEXT PRIMARY KEY NOT NULL,
  ...
);
`

// Register in LOCAL_MIGRATIONS array
export const LOCAL_MIGRATIONS: LocalMigration[] = [
  // ... existing
  { version: 10, sql: LOCAL_MY_TABLE_SQL },
]
```

### Supabase

```sql
-- Filename: YYYYMMDDHHMMSS_description.sql
-- Always idempotent
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  ...
);

-- Always add RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON my_table
  USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
```
