// TD POS — create-sale Edge Function
//
// Wraps the offline sale insert path so the mobile sync processor has a single
// HTTP endpoint to push a fully-formed sale + items.
//
// Order of operations (idempotent end-to-end):
//   1. Validate the payload with the shared Zod schema.
//   2. Call `create_sale_atomic(p_payload)` so the sale and sale_items commit
//      or roll back together.
//   3. Leave per-item inventory deltas to the separate queued
//      `apply_inventory_delta` calls.
//
// The sale id is the sale's client_operation_id. Inventory delta rows still
// carry separate operation ids, so sale replay and stock replay are independent.
//
// Runtime: Deno (Supabase Edge Functions).
// Auth:    'user' — authenticated cashier. ctx.supabase respects RLS.
// Env:     SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_JWKS
//          (injected by the Supabase platform; no manual wiring needed).
// Source:  https://supabase.com/blog/introducing-supabase-server (public beta, 2026-05-06)

// @ts-ignore: npm specifier is Deno/Supabase-only
import { withSupabase } from 'npm:@supabase/server'
// @ts-ignore: workspace-relative import is resolved by the Supabase Deno bundler
import { syncSalePayloadSchema } from '../../../packages/shared/src/validators/index.ts'

// Local mirror of @supabase/server's `SupabaseContext` shape.
// Verified against https://supabase.com/blog/introducing-supabase-server on 2026-05-09.
interface SupabaseClientLike {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
}

interface SupabaseContext {
  supabase: SupabaseClientLike
  supabaseAdmin: SupabaseClientLike
  userClaims: { sub: string } | null
  jwtClaims: Record<string, unknown> | null
  authMode: 'user' | 'none' | 'secret' | 'publishable'
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx: SupabaseContext) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (_err) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }

    const parsed = syncSalePayloadSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const payload = parsed.data

    const { data, error } = await ctx.supabase.rpc('create_sale_atomic', {
      p_payload: payload,
    })

    if (error) {
      return Response.json({ ok: false, reason: error.message })
    }

    return Response.json(data)
  }),
}
