---
name: zod-4-validation
description: Use this skill when writing validators, schemas, form validation, or API request/response validation. Agents trained on Zod 3 will hallucinate deprecated patterns. TD POS uses Zod 4.4.3 exclusively in @tdpos/shared and @tdpos/db.
version: 1.0.0
---

# Zod 4 Validation Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate Zod 3 patterns like `.min(1, { message: 'Required' })`. In Zod 4, `message:` is **REMOVED**. Use `error:` instead. Agents also miss Zod 4's promoted top-level validators.

## Zod 4 vs Zod 3 — Critical Differences

| Zod 3 (❌ DO NOT USE) | Zod 4 (✅ USE THIS) |
| --- | --- |
| `z.string().email()` | `z.email()` (top-level) |
| `z.string().uuid()` | `z.uuid()` (top-level) |
| `z.string().url()` | `z.url()` (top-level) |
| `z.number().int()` | `z.int()` (top-level) |
| `.min(1, { message: 'Required' })` | `.min(1, { error: 'Required' })` |
| `.refine(fn, { message: 'Bad' })` | `.refine(fn, { error: 'Bad' })` |
| `z.ZodError` inspection | `z.ZodError` (still works, but prefer `z.prettify`) |

## Project Patterns

### Phone Number Validation (PH E.164)

```typescript
import { z } from 'zod'

export const phPhoneSchema = z
  .string()
  .regex(/^(\+63|0)9\d{9}$/, { error: 'Enter a valid PH mobile number' })

export const e164PhoneSchema = z
  .string()
  .regex(/^\+639\d{9}$/, { error: 'Must be E.164 format (+639XX...)' })
```

### Product Schema

```typescript
export const productSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, { error: 'Product name is required' }),
  price_per_piece: z.number().nonnegative({ error: 'Price cannot be negative' }),
  stock_pieces: z.int().nonnegative(),
  pieces_per_pack: z.int().min(1, { error: 'Must be at least 1' }),
})
```

### Delta Sync Payload

```typescript
export const deltaPayloadSchema = z.object({
  client_operation_id: z.uuid(),
  product_id: z.uuid(),
  delta: z.int(),
  reason: z.enum(['sale', 'adjustment', 'stock_take', 'return']),
})
```

## Where Zod Lives

- **`packages/shared/src/validators/index.ts`** — shared schemas for phone, tier, receipt
- **`packages/db/src/schema.ts`** — database record type validators
- **NOT in `apps/mobile/`** — mobile imports from `@tdpos/shared`

## @zod/mini

Zod 4 ships a tree-shakable `@zod/mini` package (~6x smaller). TD POS does NOT use it yet. The standard `zod` package is used everywhere. If bundle size becomes critical for mobile, consider migrating.

## Performance Notes

Zod 4 is dramatically faster than Zod 3:
- String parsing: ~14x faster
- Object parsing: ~6.5x faster
- TypeScript instantiations: up to 100x fewer

This means Zod validation in hot paths (cart calculations, barcode lookups) is fast enough for production.

## Sources

- Package: `zod@^4.4.3` in `packages/shared/package.json` and `packages/db/package.json`
- Official docs: <https://zod.dev/v4>
- Migration guide: <https://zod.dev/v4/changelog>
- GitHub releases: <https://github.com/colinhacks/zod/releases>
- Implementation: `packages/shared/src/validators/index.ts`, `packages/db/src/schema.ts`
- Last verified: 2026-05-15
