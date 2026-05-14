# Supabase Backend

## Overview

TD POS uses Supabase as the server backend:

- **PostgreSQL 17** with Row Level Security
- **Auth** with phone OTP (no email/password)
- **Edge Functions** for business logic RPCs
- **Realtime** for live dashboard updates (future)
- **Storage** for receipts and reports (future)

## Authentication

### Phone OTP Flow

```
1. User enters PH phone number (+639XX...)
2. App calls supabase.auth.signInWithOtp({ phone })
3. Supabase sends SMS with 6-digit code
4. User enters code
5. App calls supabase.auth.verifyOtp({ phone, token })
6. Session stored in MMKV (NOT AsyncStorage)
```

### Session Management

```typescript
// Mobile: MMKV adapter
const supabase = createClient(url, key, {
  auth: {
    storage: new MMKVStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Web: SSR cookie auth
import { getClaims } from '@supabase/ssr'
// NOT getSession() — getClaims() is the SSR pattern
```

## Edge Functions

### `apply-inventory-delta`

Applies a stock change with idempotent dedup:

```typescript
// Request
{
  client_operation_id: 'uuid',
  product_id: 'uuid',
  delta: -1,
  reason: 'sale'
}

// Response
{ ok: true, new_stock: 49 }
// or
{ ok: false, reason: 'insufficient_stock_or_not_found' }
```

### `create-sale`

Creates a complete sale atomically via `create_sale_atomic()` RPC:

```typescript
// Request
{
  client_operation_id: 'uuid',
  sale: { id, receipt_number, total_amount, ... },
  items: [{ product_id, quantity, unit_price, pieces_delta, ... }]
}
```

### `eod-report`

Generates end-of-day report data:

```typescript
// Request
{ branch_id: 'uuid', date: '2026-05-14' }

// Response
{ sales_count, gross_total, void_count, void_total, net_total, ... }
```

### `tenant-data-export`

Exports full tenant data for data portability:

```typescript
// Request
{ client_operation_id: 'uuid' }

// Response: complete JSON with all tenant tables
{
  business: { ... },
  users: [...],
  products: [...],
  sales: [...],
  // ... all tenant-scoped data
}
```

## RLS (Row Level Security)

**Every table has RLS enabled.** The standard pattern:

```sql
-- Tenant isolation
CREATE POLICY "tenant_read" ON products FOR SELECT
  USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));
```

### Role-Based Access

```sql
-- Owner/manager only
CREATE POLICY "manager_write" ON products FOR INSERT
  USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
  );
```

### Immutability Enforcement

```sql
-- Sales: no UPDATE (except synced_at), no DELETE
CREATE POLICY "sales_immutable" ON sales FOR UPDATE
  USING (false);  -- blocks all updates via RLS

-- Actual synced_at updates go through RPC
```

## Key RPCs

| RPC                                       | Purpose                          | Auth          |
| ----------------------------------------- | -------------------------------- | ------------- |
| `create_sale_atomic(jsonb)`               | Atomic sale + items insert       | User          |
| `apply_inventory_delta(uuid, uuid, int)`  | Stock adjustment with dedup      | User          |
| `erase_customer_pii(uuid, text)`          | GDPR customer erasure            | Owner/Manager |
| `record_tenant_export(uuid)`              | Audit log for data export        | Owner         |
| `server_clock_handshake()`                | Return authenticated server time | User          |
| `consume_device_pairing_code(text, text)` | Device provisioning              | User          |

## Local Development

```bash
# Start local Supabase (requires Docker)
bunx supabase start

# Apply all migrations
bunx supabase db push

# Seed with demo data
bunx supabase db seed

# Open Studio UI
bunx supabase studio

# Stop
bunx supabase stop
```

Local Supabase provides:

- PostgreSQL 17 on `localhost:54322`
- Auth on `localhost:54321`
- Studio UI on `localhost:54323`
- Edge Functions via `bunx supabase functions serve`
