---
name: receipt-numbering
description: Use this skill when working on receipt generation, receipt number assignment, sequential numbering, offline receipt safety, or BIR receipt compliance.
version: 1.0.0
---

# Receipt Number Reservation Strategy

## Format

`BRANCH-CASHIER-DATE-SEQUENCE`

Example: `QC01-C02-20260506-000123`

| Segment | Source | Example |
|---|---|---|
| `BRANCH` | Short branch code (3-5 chars), set at branch creation | `QC01` |
| `CASHIER` | Device/cashier code, assigned per device on first login | `C02` |
| `DATE` | Local sale date `YYYYMMDD` | `20260506` |
| `SEQUENCE` | 6-digit zero-padded counter, per `(branch, cashier, date)` | `000123` |

## Why It Works Offline

The sequence space is partitioned by device. Two offline devices produce:
- `QC01-C01-20260506-000045`
- `QC01-C02-20260506-000067`

Physically uncollidable. No coordination needed.

## Implementation

```typescript
const generateReceiptNumber = (
  branchCode: string,
  cashierCode: string,
  date: string, // YYYYMMDD
  sequence: number
): string => {
  return `${branchCode}-${cashierCode}-${date}-${String(sequence).padStart(6, '0')}`
}
```

Sequence counter is stored in SQLite per `(branch, cashier, date)` tuple. Monotonically increasing.

## Server Validation

UNIQUE constraint on `(business_id, receipt_number)` in the `sales` table. On sync, server rejects duplicates (should never happen, but defense in depth).

## BIR Serial Mapping

When accredited: additional `bir_serial` column maps internal receipt number to BIR-issued serial range. Internal number preserved for traceability. Both print on receipt.

## End-of-Day Gap Audit

Dashboard runs daily check per `(branch, cashier, date)` for sequence gaps. Voids are separate compensating entries — they do NOT skip a number.

## Required Test (§14 #5)

Two devices, same branch, both offline, 5 transactions each. All 10 receipt numbers unique, following format, no collisions.

## Sources

Domain skill — no external package. Authority lives in the project's own design.

- Spec index: [../spec-v5.md](../spec-v5.md)
- Architecture decisions: [../architecture.md](../architecture.md) (ADR-006 Receipt Number Namespacing)
- Implementation: `packages/shared/src/utils/index.ts` (`generateReceiptNumber`, `isValidReceiptNumber`), local SQLite `receipt_sequence` table.
- Tests: `packages/shared/src/utils/index.test.ts`, `apps/mobile/src/features/sales/lib/execute-checkout.test.ts` (§14 #5).
- Last verified: 2026-05-09
