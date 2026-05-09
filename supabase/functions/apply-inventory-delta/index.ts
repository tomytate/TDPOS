// TD POS — apply-inventory-delta Edge Function
//
// Thin HTTP wrapper around the existing `apply_inventory_delta` Postgres RPC.
// The RPC enforces tenant isolation, race-safe idempotency, and the negative-
// stock guard (see ADR-005 + supabase/migrations/20260508000000_initial_schema.sql).
// This function exists so the mobile sync processor calls a stable HTTP
// endpoint instead of an RPC name, and so the payload is validated with the
// shared Zod schema before it reaches Postgres.
//
// Runtime: Deno (Supabase Edge Functions).
// Auth:    'user' — authenticated cashier. ctx.supabase respects RLS.
// Env:     SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_JWKS
//          (injected by the Supabase platform; no manual wiring needed).
// Source:  https://supabase.com/blog/introducing-supabase-server (public beta, 2026-05-06)

// Deno + npm: imports — these are resolved by Supabase, not by local tsc/eslint.
// @ts-ignore: npm specifier is Deno/Supabase-only
import { withSupabase } from 'npm:@supabase/server'
// @ts-ignore: workspace import resolved by deno.json import_map at deploy time
import { syncInventoryDeltaPayloadSchema } from '../../../packages/shared/src/validators/index.ts'

// Local mirror of @supabase/server's `SupabaseContext` shape. The package's
// own types are not visible to local tsc/eslint since this file ships only
// to Deno; this interface keeps the handler readable for human reviewers.
// Verified against https://supabase.com/blog/introducing-supabase-server on 2026-05-09.
interface SupabaseClientLike {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
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

    const parsed = syncInventoryDeltaPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { client_operation_id, product_id, branch_id, delta, reason, sale_id } = parsed.data

    const { data, error } = await ctx.supabase.rpc('apply_inventory_delta', {
      p_client_operation_id: client_operation_id,
      p_product_id: product_id,
      p_branch_id: branch_id,
      p_delta: delta,
      p_reason: reason,
      p_sale_id: sale_id ?? null,
    })

    if (error) {
      // Surface tenant_violation, missing-product, etc. to the client.
      return Response.json({ error: error.message }, { status: 400 })
    }

    // The RPC returns a JSONB document like
    //   { ok: true, new_stock_pieces: N }                          -- success
    //   { ok: true, replayed: true, ...cached }                    -- cached replay
    //   { ok: false, reason: 'concurrent_in_progress', retry_after_ms: 500 }
    //   { ok: false, reason: 'insufficient_stock_or_not_found' }
    return Response.json(data)
  }),
}
