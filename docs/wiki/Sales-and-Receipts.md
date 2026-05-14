# Sales & Receipts

## Checkout Flow

The checkout process is a single atomic SQLite transaction:

```
1. Validate cart (non-empty, sufficient tender)
2. Generate receipt number (BRANCH-CASHIER-DATE-SEQUENCE)
3. Create sale row
4. Create sale_items rows
5. Decrement stock_pieces for each item
6. Log inventory changes to inventory_logs
7. Enqueue sync_queue entry with client_operation_id
8. Increment receipt_sequence counter
```

All 8 steps happen in one `withTransactionAsync` call — if any step fails, the entire checkout rolls back.

### Receipt Numbering

Receipts use a physically uncollidable format:

```
QC01-C02-20260514-000123
 │     │      │       │
 │     │      │       └── Sequence (per-device, per-day)
 │     │      └────────── Date (YYYYMMDD)
 │     └───────────────── Cashier code
 └─────────────────────── Branch code
```

Each device owns its own namespace partition, so two offline devices can **never** generate the same receipt number.

### Sold-As Units

Products can be sold as individual pieces or packs:

```typescript
type SoldAs = 'piece' | 'pack'

// Sale of 1 pack (12 pieces per pack):
// stock_pieces -= 12, sale records sold_as='pack', qty=1

// Sale of 3 pieces:
// stock_pieces -= 3, sale records sold_as='piece', qty=3
```

## Sale Immutability (ADR-011)

**Sales are never updated or deleted.** This is enforced at every level:

- **Local SQLite:** no UPDATE (except `synced_at`), no DELETE queries
- **Supabase RLS:** policies block UPDATE/DELETE on sales tables
- **Tests:** ADR-011 compliance tests verify immutability

### Why?

- BIR audit trail requirements
- Offline reconciliation integrity
- Prevents data loss from concurrent operations
- Clear accountability chain

## Void Workflow

When a sale needs to be corrected, the void workflow creates compensating entries:

```
Original sale: +₱150 (3 items)
    │
    ▼
Void action (by manager):
    │
    ├── Compensating sale: -₱150 (negative total)
    ├── Inventory delta: +3 pieces (restock)
    └── sale_voids link: original → compensating
```

### Void Rules

1. **Same-day only** — can only void sales from the current day
2. **Manager/owner only** — cashiers cannot void their own sales
3. **Reason required** — must select: `wrong_item`, `customer_cancelled`, `duplicate_sale`, `cashier_error`, or `other`
4. **Append-only** — the void record itself is immutable
5. **One void per sale** — `UNIQUE(original_sale_id)` prevents double-voids

### Void in Reports

End-of-day reports show:

- **Gross sales** — total before voids
- **Void count** — number of voided transactions
- **Void amount** — total value of voided sales
- **Net sales** — gross minus voids

## Last Receipt Recovery

The most recent sale result is persisted in MMKV (not the full sale — just the receipt summary). This allows:

- Reopening the last receipt from the cashier home screen
- Quick access to print, share, or void
- Survives app restarts (but is replaced by the next sale)

## Same-Day Receipt Browser

The Reports tab lists all same-day local receipts. Managers can:

1. Browse receipts by time
2. Tap to view full receipt with line items
3. Share or print-placeholder the receipt
4. Void the receipt (with reason)

## Clock Skew Guard

To prevent receipt date manipulation:

1. `server_clock_handshake()` caches authenticated server time
2. Checkout blocks if device clock is >24 hours from last handshake
3. The error message directs the user to connect to internet and sync
4. After handshake refreshes, checkout resumes normally

This protects against:

- Accidental device clock drift
- Intentional date manipulation for tax avoidance
- Receipt sequence integrity across devices

## Sync to Server

After local commit, the sale is queued in `sync_queue`:

```json
{
  "operation_type": "sale",
  "client_operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "sale": { "id": "...", "total": 150, ... },
    "items": [{ "product_id": "...", "qty": 3, "sold_as": "piece", ... }]
  }
}
```

The server `create-sale` Edge Function calls `create_sale_atomic(p_payload)`, which inserts the sale, items, and logs in one PostgreSQL transaction.
