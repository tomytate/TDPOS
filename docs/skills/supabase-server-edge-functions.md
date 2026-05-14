---
name: supabase-server-edge-functions
description: Use this skill when writing Supabase Edge Functions, server-side auth verification, or RPC handlers. Agents hallucinate manual JWT verification, shared utility files, and old SUPABASE_ANON_KEY patterns. TD POS uses @supabase/server (announced 2026-05-06, public beta) for all Edge Functions.
version: 1.1.0
verified: 2026-05-15
sources:
  - https://supabase.com/blog/introducing-supabase-server
  - https://supabase.com/docs/guides/functions
  - https://supabase.com/docs/guides/api/api-keys
---

# @supabase/server — Edge Function Patterns

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate manual JWT verification with `jose`, shared `_shared/supabase.ts` utility files, and manual `createClient()` boilerplate in Edge Functions. **@supabase/server eliminates ALL of this.** It provides `withSupabase()` which handles auth, client setup, CORS, and JWT verification automatically.

## Important: @supabase/server vs @supabase/ssr

| Package | Use Case | Auth Mechanism |
|---|---|---|
| `@supabase/server` | Edge Functions, Vercel Functions, Cloudflare Workers, Hono, Bun, Deno, any Web API `Request`/`Response` runtime | Stateless header-based (JWT Bearer) |
| `@supabase/ssr` | Next.js, SvelteKit (web frameworks) | Cookie-based session management |

**They coexist. They are NOT replacements for each other.**
- Web Dashboard (Next.js 16) → `@supabase/ssr` + `getClaims()`
- Edge Functions → `@supabase/server` + `withSupabase()`

## Imports (Pick The One That Matches Your Runtime)

```typescript
// Deno (Supabase Edge Functions, Deno Deploy)
import { withSupabase } from 'npm:@supabase/server'

// Node, Bun, Cloudflare Workers, Vercel Functions
import { withSupabase } from '@supabase/server'

// Hono adapter (when you need Hono-style routing)
import { withSupabase } from '@supabase/server/adapters/hono'

// Core primitives — for advanced cases where you don't want the full handler
import {
  createAdminClient,
  createContextClient,
  resolveEnv,
  verifyAuth,
} from '@supabase/server/core'
```

TD POS Edge Functions run on Supabase Edge (Deno), so we use the `npm:@supabase/server` form.

## Core Pattern: withSupabase

```typescript
// supabase/functions/apply-inventory-delta/index.ts
import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // ctx.supabase — user-scoped client (respects RLS)
    // ctx.supabaseAdmin — admin client (bypasses RLS, uses secret key)
    // ctx.userClaims — verified user identity (or null)
    // ctx.jwtClaims — full JWT claims (or null)
    // ctx.authMode — which mode admitted the request

    const body = await req.json()
    const { client_operation_id, product_id, branch_id, delta, reason } = body

    const { data, error } = await ctx.supabase.rpc('apply_inventory_delta', {
      p_client_operation_id: client_operation_id,
      p_product_id: product_id,
      p_branch_id: branch_id,
      p_delta: delta,
      p_reason: reason,
    })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data)
  }),
}
```

> The blog example only shows `.from('todos').select()`. The RPC pattern above is standard `supabase-js` usage — `ctx.supabase` is a regular `SupabaseClient`, so every method that exists on it works inside the handler, including `.rpc()`, `.from()`, `.storage`, and `.auth`.

## withSupabase Signature

```typescript
withSupabase(
  { auth: AuthMode },
  async (req: Request, ctx: SupabaseContext) => Promise<Response>
)
```

`req` is a standard Web API `Request`. The handler MUST return a `Response`. CORS is handled for you.

## Auth Modes

```typescript
// Authenticated users only (default) — use for all cashier operations
withSupabase({ auth: 'user' }, handler)

// No auth required — use for health checks, public webhooks
withSupabase({ auth: 'none' }, handler)

// Server-to-server with the secret key — use for cron jobs, admin ops
withSupabase({ auth: 'secret' }, handler)

// Anonymous-but-rate-limited via the publishable key
withSupabase({ auth: 'publishable' }, handler)

// Accept either of the array members — use for flexible endpoints
withSupabase({ auth: ['user', 'secret'] }, handler)
```

## SupabaseContext Interface

```typescript
interface SupabaseContext {
  supabase: SupabaseClient       // User-scoped, respects RLS
  supabaseAdmin: SupabaseClient  // Admin, bypasses RLS (secret key)
  userClaims: UserIdentity | null
  jwtClaims: JWTClaims | null
  authMode: AuthMode
}
```

## Manual Context (For Per-Route Auth)

```typescript
import { createSupabaseContext } from 'npm:@supabase/server'

export default {
  fetch: async (req) => {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' })
    }

    const { data: ctx, error } = await createSupabaseContext(req, { auth: 'user' })
    if (error) return Response.json({ error: error.message }, { status: error.status })

    const { data } = await ctx.supabase.from('products').select()
    return Response.json(data)
  },
}
```

## Core Primitives (When `withSupabase` Is Too Opinionated)

The four named exports under `@supabase/server/core` let you compose only the parts you need:

- `verifyAuth(req, options)` — verifies the request's auth headers and returns `{ userClaims, jwtClaims, authMode }`.
- `createContextClient(claims)` — returns a user-scoped `SupabaseClient` from already-verified claims.
- `createAdminClient()` — returns the admin client.
- `resolveEnv()` — returns the resolved env (publishable keys, secret keys, JWKS URL) so you can read them yourself.

Use these when you have non-standard middleware (e.g. you need to log every auth attempt, or you want to merge with an existing Hono context). For TD POS, prefer `withSupabase` and reach for the core primitives only with a documented reason.

## New Environment Variables

The new auth key system uses **plural-form** env vars:

| Old (deprecated) | New |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_PUBLISHABLE_KEYS` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEYS` |
| (manual JWKS setup) | `SUPABASE_JWKS` (auto-configured) |

> On the Supabase platform and the Supabase CLI, these are injected automatically. No manual setup.

## TD POS Edge Functions

| Function | Auth Mode | Purpose | Status |
|---|---|---|---|
| `apply-inventory-delta` | `user` | Validates payload with `syncInventoryDeltaPayloadSchema`, calls the existing race-safe `apply_inventory_delta` Postgres RPC | shell exists, deploy pending P7 staging Supabase |
| `create-sale` | `user` | Validates payload with `syncSalePayloadSchema`, idempotent on `sales.id`, inserts sale + sale_items; per-item deltas handled via the apply-inventory-delta queue path | shell exists, deploy pending P7 staging Supabase |
| `eod-report` | `['user', 'secret']` | End-of-day report (cashier-triggered or scheduled via cron) | report scaffold exists; SMS delivery pending P11.5.8 |
| `tenant-data-export` | `user` | Owner-only JSON export of tenant-scoped tables; requires `client_operation_id` because `record_tenant_export` writes an idempotent audit marker | scaffold exists; hosted exercise pending P11.5.6 |

### Security Posture Audit (P10.4)

**Last audited:** 2026-05-15.

- **Anonymous mode is forbidden.** No Edge Function accepts `auth: 'anon'`. Adding one without an explicit security review is a regression.
- **User-only is the default.** Three of four functions (`apply-inventory-delta`, `create-sale`, `tenant-data-export`) require a valid authenticated user JWT. RLS does the tenant-isolation work; `current_business_id()` derives the tenant from the caller's claims.
- **`eod-report` is the only multi-mode function.** It accepts `'user'` (owner-triggered same-day preview from the dashboard) and `'secret'` (server-to-server invocation reserved for the future scheduled SMS cron in P11.5.8). The `secret` mode never returns customer-identifying fields; it returns totals.
- **No service-role keys on the wire.** Functions rely on the per-request user JWT plus `ctx.supabaseAdmin` for the narrow RPCs that still need elevated privilege (privacy erasure, lost-device replacement). `ctx.supabaseAdmin` only exists server-side; mobile cannot reach it. `scripts/check-mobile-no-service-key.mjs` enforces that the mobile binary holds no service-role credential, including JWTs whose claim is `role=service_role`.
- **Regression rule.** A new Edge Function (or a mode change on an existing one) must update this table in the same PR. Reviewers reject PRs that add an Edge Function without listing it here.

## ❌ DO NOT USE

```typescript
// ❌ Manual JWT verification with jose
import { jwtVerify } from 'jose'
const { payload } = await jwtVerify(token, publicKey)

// ❌ Manual client creation boilerplate
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})

// ❌ Shared utility files (_shared/supabase.ts)
import { supabaseClient } from '../_shared/supabase.ts'

// ❌ Old env var names in Edge Functions
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

// ✅ @supabase/server handles ALL of the above
import { withSupabase } from 'npm:@supabase/server'
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // ctx.supabase and ctx.supabaseAdmin are ready to use
  }),
}
```

## Sources

- Package: `@supabase/server` (public beta — announced 2026-05-06).
- Announcement post: <https://supabase.com/blog/introducing-supabase-server>
- Edge Functions docs: <https://supabase.com/docs/guides/functions>
- API key naming: <https://supabase.com/docs/guides/api/api-keys>
- Edge Function quickstart: <https://supabase.com/docs/guides/functions/quickstart>
- Implementation in this repo: `supabase/functions/apply-inventory-delta/index.ts`, `supabase/functions/create-sale/index.ts`, `supabase/functions/eod-report/index.ts`. End-to-end deployment is gated on a real Supabase project (P7 / Phase W staging).
- Last verified: 2026-05-15 against the official announcement; the P10.4 auth-mode audit re-confirmed every function uses `user` (or `['user','secret']` for `eod-report`) and that no Edge Function accepts anonymous traffic.
