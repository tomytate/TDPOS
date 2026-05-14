# Inventory Model

TD POS uses the **tingi/canonical-pieces** inventory model — the one capability no international POS competitor handles correctly for Philippine business.

## What is Tingi?

**Tingi** (Tagalog: "to sell individually") is the practice of selling products by the piece from a bulk pack. A sari-sari store buys a case of 24 sachets and sells them one at a time.

This is the default behavior for most Philippine retail — not an edge case.

## Canonical Pieces

All stock is stored as a single INTEGER field: `stock_pieces`.

```sql
-- Product table
stock_pieces    INTEGER NOT NULL DEFAULT 0   -- smallest sellable unit
pieces_per_pack INTEGER NOT NULL DEFAULT 1   -- how many pieces in one pack
```

### Display Logic

Packs are a **display concept**, never stored separately:

```typescript
import { splitStock, displayStock } from '@tdpos/shared'

// stock_pieces = 47, pieces_per_pack = 12
const { packs, loosePieces } = splitStock(47, 12)
// → { packs: 3, loosePieces: 11 }

displayStock(47, 12)
// → "3 packs + 11 pieces"
```

### Sale Logic

When a product is sold, the stock delta depends on how it was sold:

```typescript
import { piecesForSaleUnit } from '@tdpos/shared'

// Sold 1 pack (12 pieces per pack)
piecesForSaleUnit(1, 'pack', 12) // → 12

// Sold 3 individual pieces
piecesForSaleUnit(3, 'piece', 12) // → 3
```

The checkout writes: `stock_pieces -= delta`

## Stock Take

Managers can perform physical stock counts to reconcile system vs actual stock:

```
System stock: 47 pieces
Physical count: 44 pieces
Delta: -3 (system adjusted down)
Reason: "shrinkage" or "damage" or "recount"
```

Stock takes are:

- **Append-only** — stored in `stock_take_counts` table, never updated
- **Delta-synced** — sends the adjustment delta to the server
- **Reason-coded** — requires a reason code and optional note
- **Manager-only** — requires owner or manager role

## Stock Accuracy Score (SAS)

The SAS is the marketing weapon — it measures the match rate between system stock and physical counts:

```
SAS = (correctly counted products / total counted products) × 100
```

A product is "correctly counted" when the physical count matches the system stock at the time of counting. The SAS is computed from the most recent stock take for each product.

## Delta-Based Sync

Inventory changes are **always sent as deltas**, never absolute values:

```
❌ WRONG: "Set stock to 46"
✅ RIGHT: "Adjust stock by -1"
```

This prevents concurrent offline sales from overwriting each other:

```
Initial stock: 50
Device A (offline): sells 2 → delta = -2
Device B (offline): sells 3 → delta = -3
Server applies both: 50 + (-2) + (-3) = 45 ✓

If absolute: Device A says "48", Device B says "47"
→ Last writer wins → lost sales ✗
```

## Negative Stock Guard

The server RPC refuses any delta that would push `stock_pieces < 0`:

```sql
-- In apply_inventory_delta RPC
IF (current_stock + p_delta) < 0 THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_stock_or_not_found');
END IF;
```

When the sync processor receives this response, the sync queue entry is marked as `pending_sync_review` for manager attention.

## Key Rules

1. **Never store fractional stock** — `stock_pieces` is always INTEGER
2. **Never store pack counts** — derive them via `divmod`
3. **Always use deltas** — never send absolute stock values
4. **Stock takes are append-only** — no UPDATE/DELETE on `stock_take_counts`
5. **SAS is the north star metric** — shows stock reliability at a glance
