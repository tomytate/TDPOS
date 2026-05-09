---
name: inventory-tingi-model
description: Use this skill when working on inventory logic, stock calculations, product schema, or the tingi (per-piece selling) model. Covers canonical pieces, pack derivation, stock display, and delta sync.
version: 1.0.0
---

# Tingi Inventory Model — Canonical Pieces

## Core Principle

Every product stores stock as `stock_pieces` — an INTEGER representing the smallest sellable unit. Pack count is **derived**, never stored.

## Schema (products table)

```sql
stock_pieces INTEGER NOT NULL DEFAULT 0    -- canonical unit
pieces_per_pack INTEGER NOT NULL DEFAULT 1 -- e.g. 12 for shampoo sachets
price_per_piece NUMERIC                    -- per-piece selling price
price_per_pack NUMERIC                     -- per-pack selling price
cost_per_piece NUMERIC                     -- cost basis
```

## Display Logic

```typescript
const displayStock = (stockPieces: number, piecesPerPack: number) => {
  const packs = Math.floor(stockPieces / piecesPerPack)
  const loosePieces = stockPieces % piecesPerPack
  return `${packs} pack${packs !== 1 ? 's' : ''} + ${loosePieces} piece${loosePieces !== 1 ? 's' : ''}`
}
```

## Sale Operations

- **Sell 1 piece:** `stock_pieces -= 1`
- **Sell 1 pack:** `stock_pieces -= pieces_per_pack`
- **Sell N pieces:** `stock_pieces -= N`

## sale_items Schema

```sql
pieces_sold INTEGER NOT NULL    -- always in pieces
was_sold_as TEXT                 -- 'piece' | 'pack' (for receipt display only)
```

## Delta Sync

- Never send absolute stock: `{ stock_pieces: 99 }` ❌
- Always send delta: `{ delta: -1 }` ✅
- Server RPC: `apply_inventory_delta(client_operation_id, product_id, branch_id, delta)`

## Negative Stock Guard

Server refuses `delta < 0` if `stock_pieces + delta < 0`. Sale goes to `pending_sync_review` queue.

## Required Test (§14 #1)

Sell 7 sachets from a 12-sachet pack → display reads "0 packs + 5 pieces", `stock_pieces = 5`.

## Default Templates

Pre-loaded tingi configurations:
- Cigarettes: `pieces_per_pack = 20` (per stick / per pack)
- Shampoo sachets: `pieces_per_pack = 12`
- Coffee sachets: `pieces_per_pack = 10`
- Candies: `pieces_per_pack = 1` (already per-piece)

## Sources

Domain skill — no external package. Authority lives in the project's own design.

- Spec index: [../spec-v5.md](../spec-v5.md)
- Architecture decisions: [../architecture.md](../architecture.md) (ADR-004 Canonical Pieces)
- Implementation: `packages/shared/src/utils/index.ts` (`splitStock`, `displayStock`, `piecesForSaleUnit`), `packages/shared/src/constants/index.ts` (`TINGI_TEMPLATES`, `DEFAULT_PIECES_PER_PACK`)
- Tests: `packages/shared/src/utils/index.test.ts`, `apps/mobile/src/features/sales/lib/execute-checkout.test.ts` (§14 #1)
- Last verified: 2026-05-09
